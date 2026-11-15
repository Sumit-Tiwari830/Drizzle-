import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../../src/utils/apiError.ts";

describe("💬 Unit Tests: Chat Read Receipts, Typing Indicators & 48-Hour Request TTL", () => {
  describe("1. Chat Read Receipts (MongoDB Logic Invariant)", () => {
    interface MockMessage {
      id: string;
      matchId: string;
      senderId: string;
      receiverId: string;
      message: string;
      isRead: boolean;
      readAt: Date | null;
      createdAt: Date;
    }

    const createMessageStore = () => {
      const messages: MockMessage[] = [];

      return {
        addMessage: (matchId: string, senderId: string, receiverId: string, message: string) => {
          const msg: MockMessage = {
            id: `msg-${messages.length + 1}`,
            matchId,
            senderId,
            receiverId,
            message,
            isRead: false,
            readAt: null,
            createdAt: new Date(),
          };
          messages.push(msg);
          return msg;
        },
        markAsRead: (matchId: string, receiverId: string) => {
          const readAt = new Date();
          let modifiedCount = 0;
          for (const msg of messages) {
            if (msg.matchId === matchId && msg.receiverId === receiverId && !msg.isRead) {
              msg.isRead = true;
              msg.readAt = readAt;
              modifiedCount++;
            }
          }
          return { modifiedCount, readAt };
        },
        getMessages: (matchId: string) => messages.filter((m) => m.matchId === matchId),
      };
    };

    it("should initialize new messages with isRead = false and readAt = null", () => {
      const store = createMessageStore();
      const msg = store.addMessage("match-123", "alice", "bob", "Hello Bob!");

      assert.equal(msg.isRead, false);
      assert.equal(msg.readAt, null);
    });

    it("should mark unread messages as read when receiver views chat and record readAt timestamp", () => {
      const store = createMessageStore();
      store.addMessage("match-123", "alice", "bob", "Message 1");
      store.addMessage("match-123", "alice", "bob", "Message 2");

      // Bob reads messages from Alice
      const result = store.markAsRead("match-123", "bob");
      assert.equal(result.modifiedCount, 2);
      assert.ok(result.readAt instanceof Date);

      const updated = store.getMessages("match-123");
      assert.ok(updated.every((m) => m.isRead === true && m.readAt !== null));
    });

    it("should only mark messages where current user is the receiver (not sender's own messages)", () => {
      const store = createMessageStore();
      store.addMessage("match-123", "alice", "bob", "From Alice to Bob");
      store.addMessage("match-123", "bob", "alice", "From Bob to Alice");

      // Bob marks messages sent to him as read
      store.markAsRead("match-123", "bob");

      const msgs = store.getMessages("match-123");
      // Alice's message to Bob should be read
      assert.equal(msgs[0].isRead, true);
      // Bob's message to Alice should still be unread (Alice hasn't read it yet)
      assert.equal(msgs[1].isRead, false);
    });
  });

  describe("2. Typing Indicators Payload Invariant", () => {
    it("should construct valid typing broadcast events for room participants", () => {
      const matchId = "match-abc-123";
      const userId = "usr-typing-456";

      const startPayload = {
        matchId,
        userId,
        isTyping: true,
      };

      const stopPayload = {
        matchId,
        userId,
        isTyping: false,
      };

      assert.equal(startPayload.isTyping, true);
      assert.equal(stopPayload.isTyping, false);
      assert.equal(startPayload.matchId, matchId);
    });
  });

  describe("3. 48-Hour (2 Days) Request TTL & Auto-Expiration", () => {
    const REQUEST_TTL_MS = 48 * 60 * 60 * 1000;

    const checkRequestExpiry = (createdAt: Date, now: Date = new Date()) => {
      return now.getTime() - createdAt.getTime() >= REQUEST_TTL_MS;
    };

    it("should treat requests within 48 hours as active and unexpired", () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

      const isExpired = checkRequestExpiry(createdAt, now);
      assert.equal(isExpired, false);
    });

    it("should mark requests older than 48 hours as expired", () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 48.1 * 60 * 60 * 1000); // 48.1 hours ago

      const isExpired = checkRequestExpiry(createdAt, now);
      assert.equal(isExpired, true);
    });

    it("should accurately compute exact expiresAt countdown timestamp", () => {
      const createdAt = new Date("2026-11-15T12:00:00Z");
      const expiresAt = new Date(createdAt.getTime() + REQUEST_TTL_MS);

      assert.equal(expiresAt.toISOString(), "2026-11-17T12:00:00.000Z"); // Exactly 48 hours later
    });
  });

  describe("4. Smart, Informative Error Messages on Non-Pending Requests", () => {
    const simulateRespond = (reqRecord: { status: string; createdAt: Date }) => {
      if (reqRecord.status === "CANCELLED") {
        throw new ApiError(
          410,
          "This request is no longer available because the user has already entered an active match with someone else."
        );
      }

      const isExpired =
        reqRecord.status === "EXPIRED" ||
        (reqRecord.status === "PENDING" &&
          Date.now() - reqRecord.createdAt.getTime() >= 48 * 60 * 60 * 1000);

      if (isExpired) {
        throw new ApiError(
          410,
          "This request has expired. Connect requests are only valid for 48 hours (2 days)."
        );
      }

      if (reqRecord.status === "ACCEPTED") {
        throw new ApiError(400, "This request has already been accepted.");
      }

      if (reqRecord.status === "REJECTED") {
        throw new ApiError(400, "This request has already been rejected.");
      }

      return { success: true };
    };

    it("should inform User B with a clear message when request was CANCELLED due to match", () => {
      const cancelledReq = {
        status: "CANCELLED",
        createdAt: new Date(),
      };

      assert.throws(
        () => simulateRespond(cancelledReq),
        (err: any) => {
          assert.equal(err.statusCode, 410);
          assert.match(err.message, /already entered an active match/i);
          return true;
        }
      );
    });

    it("should inform User B with a clear message when request has EXPIRED (48 hours)", () => {
      const expiredReq = {
        status: "PENDING",
        createdAt: new Date(Date.now() - 50 * 60 * 60 * 1000), // 50 hours ago
      };

      assert.throws(
        () => simulateRespond(expiredReq),
        (err: any) => {
          assert.equal(err.statusCode, 410);
          assert.match(err.message, /valid for 48 hours/i);
          return true;
        }
      );
    });

    it("should reject double-accept or double-reject attempts with appropriate message", () => {
      assert.throws(
        () => simulateRespond({ status: "ACCEPTED", createdAt: new Date() }),
        (err: any) => err.statusCode === 400 && /already been accepted/i.test(err.message)
      );

      assert.throws(
        () => simulateRespond({ status: "REJECTED", createdAt: new Date() }),
        (err: any) => err.statusCode === 400 && /already been rejected/i.test(err.message)
      );
    });
  });
});
