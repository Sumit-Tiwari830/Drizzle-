import { db } from "../../db/index.js";
import { requests, users, profiles, matches } from "../../db/schema/index.js";
import { eq, and, or, sql, gte } from "drizzle-orm";
import { ApiError } from "../../utils/apiError.js";

export class RequestService {
  /**
   * Send a Connect Request
   * Enforces:
   * 1. Sender and Receiver must NOT be locked (in an active match).
   * 2. Max 10 requests per user in a rolling 24-hour window.
   */
  static async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new ApiError(400, "You cannot send a request to yourself");
    }

    // 1. Check sender status
    const [sender] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, senderId), eq(users.isDeleted, false)))
      .limit(1);

    if (!sender) {
      throw new ApiError(404, "Sender not found");
    }

    if (sender.isLocked) {
      throw new ApiError(400, "You are currently in an active match and cannot send new requests");
    }

    // 2. Check receiver status
    const [receiver] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, receiverId), eq(users.isDeleted, false)))
      .limit(1);

    if (!receiver) {
      throw new ApiError(404, "User not found or account deactivated");
    }

    if (receiver.isLocked) {
      throw new ApiError(400, "This user is currently in an active match and cannot receive requests");
    }

    // 3. Check 24-hour request quota (Max 10 requests per 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(requests)
      .where(and(eq(requests.senderId, senderId), gte(requests.createdAt, twentyFourHoursAgo)));

    const requestCount = Number(countResult?.count || 0);
    if (requestCount >= 10) {
      throw new ApiError(429, "Daily request limit reached. You can only send up to 10 requests every 24 hours.");
    }

    // 4. Check if pending request already exists between these two
    const [existingRequest] = await db
      .select()
      .from(requests)
      .where(
        and(
          or(
            and(eq(requests.senderId, senderId), eq(requests.receiverId, receiverId)),
            and(eq(requests.senderId, receiverId), eq(requests.receiverId, senderId))
          ),
          eq(requests.status, "PENDING")
        )
      )
      .limit(1);

    if (existingRequest) {
      throw new ApiError(409, "A pending request already exists between you and this user");
    }

    // 5. Create request
    const [newRequest] = await db
      .insert(requests)
      .values({
        senderId,
        receiverId,
        status: "PENDING",
      })
      .returning();

    return {
      request: newRequest,
      remainingToday: 10 - (requestCount + 1),
    };
  }

  /**
   * Respond to Connect Request (ACCEPT / REJECT)
   * If ACCEPT:
   * 1. Creates active match.
   * 2. LOCKS both candidates (isLocked = true).
   * 3. CANCELS other pending requests for both users.
   */
  static async respondToRequest(requestId: string, receiverId: string, action: "ACCEPT" | "REJECT") {
    const [reqRecord] = await db
      .select()
      .from(requests)
      .where(and(eq(requests.id, requestId), eq(requests.receiverId, receiverId), eq(requests.status, "PENDING")))
      .limit(1);

    if (!reqRecord) {
      throw new ApiError(404, "Pending request not found");
    }

    const senderId = reqRecord.senderId;

    if (action === "REJECT") {
      const [updated] = await db
        .update(requests)
        .set({ status: "REJECTED", respondedAt: new Date() })
        .where(eq(requests.id, requestId))
        .returning();

      return { message: "Request rejected", request: updated };
    }

    // Action === "ACCEPT"
    // Check if either user became locked in the meantime
    const [sender] = await db.select().from(users).where(eq(users.id, senderId)).limit(1);
    const [receiver] = await db.select().from(users).where(eq(users.id, receiverId)).limit(1);

    if (sender?.isLocked || receiver?.isLocked) {
      throw new ApiError(400, "One of the candidates is already in another active match");
    }

    // 1. Mark request ACCEPTED
    await db
      .update(requests)
      .set({ status: "ACCEPTED", respondedAt: new Date() })
      .where(eq(requests.id, requestId));

    // 2. Create Active Match
    const [newMatch] = await db
      .insert(matches)
      .values({
        user1Id: senderId,
        user2Id: receiverId,
        status: "ACTIVE",
        user1RevealAccepted: false,
        user2RevealAccepted: false,
      })
      .returning();

    // 3. LOCK both users (neither can send nor receive any requests)
    await db.update(users).set({ isLocked: true }).where(or(eq(users.id, senderId), eq(users.id, receiverId)));

    // 4. Cancel all other pending requests involving either candidate
    await db
      .update(requests)
      .set({ status: "CANCELLED", respondedAt: new Date() })
      .where(
        and(
          eq(requests.status, "PENDING"),
          or(
            eq(requests.senderId, senderId),
            eq(requests.receiverId, senderId),
            eq(requests.senderId, receiverId),
            eq(requests.receiverId, receiverId)
          )
        )
      );

    return {
      message: "It's a Match! Both candidates are now locked in an exclusive pair.",
      match: newMatch,
    };
  }

  /**
   * Get user's incoming and outgoing requests
   */
  static async getMyRequests(userId: string) {
    const incoming = await db
      .select({
        id: requests.id,
        senderId: requests.senderId,
        username: profiles.username,
        avatarUrl: profiles.avatarUrl,
        dob: profiles.dob,
        gender: profiles.gender,
        city: profiles.city,
        createdAt: requests.createdAt,
      })
      .from(requests)
      .innerJoin(profiles, eq(requests.senderId, profiles.userId))
      .where(and(eq(requests.receiverId, userId), eq(requests.status, "PENDING")));

    const outgoing = await db
      .select({
        id: requests.id,
        receiverId: requests.receiverId,
        username: profiles.username,
        avatarUrl: profiles.avatarUrl,
        dob: profiles.dob,
        gender: profiles.gender,
        city: profiles.city,
        createdAt: requests.createdAt,
      })
      .from(requests)
      .innerJoin(profiles, eq(requests.receiverId, profiles.userId))
      .where(and(eq(requests.senderId, userId), eq(requests.status, "PENDING")));

    return { incoming, outgoing };
  }
}
