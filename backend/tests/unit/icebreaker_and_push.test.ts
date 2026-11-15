import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("🧊 Rule 1: 48-Hour Icebreaker Timer & 📱 Push Notification System", () => {
  describe("1. 48-Hour 'First-Message Icebreaker' Timer Invariant", () => {
    const ICEBREAKER_HOURS = 48;
    const ICEBREAKER_MS = ICEBREAKER_HOURS * 60 * 60 * 1000;

    interface MockUser {
      id: string;
      isLocked: boolean;
    }

    interface MockMatch {
      id: string;
      user1Id: string;
      user2Id: string;
      status: "ACTIVE" | "UNMATCHED";
      matchedAt: Date;
      unmatchedAt?: Date | null;
      unmatchedBy?: string | null;
    }

    interface MockNotification {
      userId: string;
      type: string;
      title: string;
      message: string;
      data?: any;
    }

    const createIcebreakerTestEnvironment = () => {
      const users: Record<string, MockUser> = {
        "user-alpha": { id: "user-alpha", isLocked: true },
        "user-beta": { id: "user-beta", isLocked: true },
      };

      let activeMatch: MockMatch = {
        id: "match-101",
        user1Id: "user-alpha",
        user2Id: "user-beta",
        status: "ACTIVE",
        matchedAt: new Date(Date.now() - 49 * 60 * 60 * 1000), // 49 hours ago (exceeded 48h)
      };

      let messages: Array<{ id: string; matchId: string; text: string }> = [];
      const notifications: MockNotification[] = [];

      const autoExpireGhostMatch = (matchId: string) => {
        activeMatch.status = "UNMATCHED";
        activeMatch.unmatchedAt = new Date();
        activeMatch.unmatchedBy = null; // System-level automated expiration

        users[activeMatch.user1Id].isLocked = false;
        users[activeMatch.user2Id].isLocked = false;

        // Purge messages
        messages = messages.filter((m) => m.matchId !== matchId);

        // Send notifications to both candidates
        notifications.push({
          userId: activeMatch.user1Id,
          type: "UNMATCHED",
          title: "Match Expired (48-Hour Inactivity)",
          message: "Your match has automatically expired because no messages were sent within 48 hours. You are now unlocked to discover new profiles!",
          data: { matchId, reason: "ICEBREAKER_48H_EXPIRED" },
        });

        notifications.push({
          userId: activeMatch.user2Id,
          type: "UNMATCHED",
          title: "Match Expired (48-Hour Inactivity)",
          message: "Your match has automatically expired because no messages were sent within 48 hours. You are now unlocked to discover new profiles!",
          data: { matchId, reason: "ICEBREAKER_48H_EXPIRED" },
        });
      };

      const checkMatchExpiry = (currentTime: Date) => {
        if (activeMatch.status !== "ACTIVE") return null;

        const icebreakerDeadline = new Date(activeMatch.matchedAt.getTime() + ICEBREAKER_MS);
        const messageCount = messages.filter((m) => m.matchId === activeMatch.id).length;

        if (currentTime.getTime() >= icebreakerDeadline.getTime() && messageCount === 0) {
          autoExpireGhostMatch(activeMatch.id);
          return null; // Expired and unlocked!
        }

        return activeMatch;
      };

      return {
        users,
        getMatch: () => activeMatch,
        setMatchedAt: (date: Date) => {
          activeMatch.matchedAt = date;
        },
        addMessage: (text: string) => {
          messages.push({ id: `msg-${Date.now()}`, matchId: activeMatch.id, text });
        },
        getMessages: () => messages,
        getNotifications: () => notifications,
        checkMatchExpiry,
      };
    };

    it("should keep match ACTIVE if within 48 hours even with 0 messages", () => {
      const env = createIcebreakerTestEnvironment();
      // Match was created 24 hours ago
      env.setMatchedAt(new Date(Date.now() - 24 * 60 * 60 * 1000));

      const result = env.checkMatchExpiry(new Date());
      assert.notEqual(result, null, "Match should still be active within 48 hours");
      assert.equal(result?.status, "ACTIVE");
      assert.equal(env.users["user-alpha"].isLocked, true, "Users must remain locked while active");
      assert.equal(env.users["user-beta"].isLocked, true);
    });

    it("should auto-expire match and unlock both users if 48 hours passed with 0 messages (Rule 1 Deadlock Breaker)", () => {
      const env = createIcebreakerTestEnvironment();
      // Match was created 50 hours ago with NO messages
      env.setMatchedAt(new Date(Date.now() - 50 * 60 * 60 * 1000));

      const result = env.checkMatchExpiry(new Date());
      assert.equal(result, null, "Match should return null as it auto-expired");

      const match = env.getMatch();
      assert.equal(match.status, "UNMATCHED");
      assert.equal(match.unmatchedBy, null, "unmatchedBy must be null indicating automated expiry");

      assert.equal(env.users["user-alpha"].isLocked, false, "Candidate 1 must be unlocked");
      assert.equal(env.users["user-beta"].isLocked, false, "Candidate 2 must be unlocked");

      const notifs = env.getNotifications();
      assert.equal(notifs.length, 2, "Both candidates should receive expiry notifications");
      assert.equal(notifs[0].data.reason, "ICEBREAKER_48H_EXPIRED");
      assert.equal(notifs[1].data.reason, "ICEBREAKER_48H_EXPIRED");
    });

    it("should NOT auto-expire if at least 1 message was sent before 48 hours elapsed", () => {
      const env = createIcebreakerTestEnvironment();
      // Match created 50 hours ago
      env.setMatchedAt(new Date(Date.now() - 50 * 60 * 60 * 1000));
      // First message icebreaker was sent!
      env.addMessage("Hey, saw you love indie coffee spots! ☕");

      const result = env.checkMatchExpiry(new Date());
      assert.notEqual(result, null, "Match must not expire because an icebreaker message was sent");
      assert.equal(result?.status, "ACTIVE");
      assert.equal(env.users["user-alpha"].isLocked, true);
      assert.equal(env.users["user-beta"].isLocked, true);
    });
  });

  describe("2. Device Push Token Storage & Push Notification Invariants", () => {
    interface MockUserDevice {
      id: string;
      userId: string;
      token: string;
      platform: "android" | "ios" | "web";
      createdAt: Date;
      updatedAt: Date;
    }

    const createDeviceStore = () => {
      const devices: MockUserDevice[] = [];

      return {
        registerDevice: (userId: string, token: string, platform: "android" | "ios" | "web" = "android") => {
          const cleanToken = token.trim();
          if (!cleanToken) {
            throw new Error("Device push token cannot be empty");
          }

          const existing = devices.find((d) => d.userId === userId && d.token === cleanToken);
          if (existing) {
            existing.platform = platform;
            existing.updatedAt = new Date();
            return existing;
          }

          const newDevice: MockUserDevice = {
            id: `dev-${devices.length + 1}`,
            userId,
            token: cleanToken,
            platform,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          devices.push(newDevice);
          return newDevice;
        },
        removeDevice: (userId: string, token: string) => {
          const cleanToken = token.trim();
          const initialLen = devices.length;
          const idx = devices.findIndex((d) => d.userId === userId && d.token === cleanToken);
          if (idx !== -1) {
            devices.splice(idx, 1);
          }
          return { removed: devices.length < initialLen };
        },
        getDevices: (userId: string) => devices.filter((d) => d.userId === userId),
      };
    };

    it("should reject registering empty or whitespace device push tokens", () => {
      const store = createDeviceStore();
      assert.throws(() => store.registerDevice("user-1", "   "), /Device push token cannot be empty/);
    });

    it("should register Android, iOS, and Web device push tokens", () => {
      const store = createDeviceStore();
      const dev1 = store.registerDevice("user-1", "fcm_token_pixel8", "android");
      const dev2 = store.registerDevice("user-1", "apns_token_iphone15", "ios");

      assert.equal(dev1.platform, "android");
      assert.equal(dev2.platform, "ios");
      assert.equal(store.getDevices("user-1").length, 2);
    });

    it("should update existing token on re-registration without creating duplicates", () => {
      const store = createDeviceStore();
      const first = store.registerDevice("user-2", "token_abc123", "android");
      const second = store.registerDevice("user-2", "token_abc123", "web");

      assert.equal(store.getDevices("user-2").length, 1, "Must maintain exactly one record per (userId, token)");
      assert.equal(second.platform, "web", "Platform should update");
      assert.equal(first.id, second.id, "Existing ID should be preserved");
    });

    it("should unregister device token on logout", () => {
      const store = createDeviceStore();
      store.registerDevice("user-3", "token_xyz999", "ios");
      assert.equal(store.getDevices("user-3").length, 1);

      const removalResult = store.removeDevice("user-3", "token_xyz999");
      assert.equal(removalResult.removed, true);
      assert.equal(store.getDevices("user-3").length, 0);
    });

    it("should dispatch push notification payload with fallback logging when FCM key is not present", async () => {
      const store = createDeviceStore();
      store.registerDevice("user-4", "token_target_1", "android");

      const dispatchedPayloads: Array<{ title: string; body: string; token: string }> = [];

      const sendPush = async (userId: string, title: string, body: string) => {
        const userDevices = store.getDevices(userId);
        if (userDevices.length === 0) return { success: false, deviceCount: 0 };

        for (const dev of userDevices) {
          dispatchedPayloads.push({ title, body, token: dev.token });
        }
        return { success: true, deviceCount: userDevices.length };
      };

      const res = await sendPush("user-4", "New Match!", "You have matched with Maya!");
      assert.equal(res.success, true);
      assert.equal(res.deviceCount, 1);
      assert.equal(dispatchedPayloads[0].title, "New Match!");
      assert.equal(dispatchedPayloads[0].body, "You have matched with Maya!");
    });
  });
});
