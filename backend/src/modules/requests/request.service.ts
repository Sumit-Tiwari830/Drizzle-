import { db } from "../../db/index.js";
import { requests, users, profiles, matches } from "../../db/schema/index.js";
import { eq, and, or, sql, gte, desc } from "drizzle-orm";
import { ApiError } from "../../utils/apiError.js";
import { calculateAge } from "../../utils/date.js";

export class RequestService {
  public static readonly REQUEST_TTL_HOURS = 48; // 2 days
  public static readonly REQUEST_TTL_MS = 48 * 60 * 60 * 1000; // 2 days in milliseconds

  /**
   * Helper: Check if two users have previously matched and unmatched
   */
  private static async getPreviousUnmatch(userAId: string, userBId: string) {
    const [previousUnmatch] = await db
      .select()
      .from(matches)
      .where(
        and(
          or(
            and(eq(matches.user1Id, userAId), eq(matches.user2Id, userBId)),
            and(eq(matches.user1Id, userBId), eq(matches.user2Id, userAId))
          ),
          eq(matches.status, "UNMATCHED")
        )
      )
      .orderBy(desc(matches.unmatchedAt))
      .limit(1);

    return previousUnmatch || null;
  }

  /**
   * Send a Connect Request
   * Enforces:
   * 1. Sender and Receiver must NOT be locked (in an active match).
   * 2. Max 10 requests per user in a rolling 24-hour window.
   * 3. Checks if sender & receiver previously unmatched and returns a warning.
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

    if (sender.email.toLowerCase() === "kiransumit2231@gmail.com" || sender.role === "MASTER_ADMIN") {
      throw new ApiError(400, "Master Admin accounts cannot send or participate in dating connections.");
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

    if (receiver.email.toLowerCase() === "kiransumit2231@gmail.com" || receiver.role === "MASTER_ADMIN") {
      throw new ApiError(400, "This user is a system administrator and is not available for dating connections.");
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
      const isExpired = Date.now() - new Date(existingRequest.createdAt).getTime() >= RequestService.REQUEST_TTL_MS;
      if (isExpired) {
        // Auto-expire old request (2-day TTL passed), allowing a fresh request to be dispatched
        await db
          .update(requests)
          .set({ status: "EXPIRED", respondedAt: new Date() })
          .where(eq(requests.id, existingRequest.id));
      } else {
        throw new ApiError(409, "A pending request already exists between you and this user");
      }
    }

    // 5. Check if they previously matched and unmatched
    const previousUnmatch = await this.getPreviousUnmatch(senderId, receiverId);
    const previouslyUnmatched = Boolean(previousUnmatch);

    // 6. Create request
    const [newRequest] = await db
      .insert(requests)
      .values({
        senderId,
        receiverId,
        status: "PENDING",
      })
      .returning();

    return {
      message: previouslyUnmatched
        ? "Connect request sent. Warning: You have previously matched and unmatched with this user."
        : "Connect request sent successfully",
      request: newRequest,
      remainingToday: 10 - (requestCount + 1),
      previouslyUnmatched,
      lastUnmatchedAt: previousUnmatch?.unmatchedAt ?? null,
      warning: previouslyUnmatched
        ? "Warning: You have previously matched and unmatched with this user (they may have updated their username)."
        : null,
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
    // 1. Fetch request without hardcoding status: PENDING so we can return informative status messages
    const [reqRecord] = await db
      .select()
      .from(requests)
      .where(and(eq(requests.id, requestId), eq(requests.receiverId, receiverId)))
      .limit(1);

    if (!reqRecord) {
      throw new ApiError(404, "Connect request not found");
    }

    // 2. Clear, informative state handling for User B
    if (reqRecord.status === "CANCELLED") {
      throw new ApiError(
        410,
        "This request is no longer available because the user has already entered an active match with someone else."
      );
    }

    const isExpired =
      reqRecord.status === "EXPIRED" ||
      (reqRecord.status === "PENDING" &&
        Date.now() - new Date(reqRecord.createdAt).getTime() >= RequestService.REQUEST_TTL_MS);

    if (isExpired) {
      if (reqRecord.status === "PENDING") {
        await db
          .update(requests)
          .set({ status: "EXPIRED", respondedAt: new Date() })
          .where(eq(requests.id, requestId));
      }
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
    // Check if they previously unmatched so we can include a notice in the match response
    const previousUnmatch = await this.getPreviousUnmatch(senderId, receiverId);
    const previouslyUnmatched = Boolean(previousUnmatch);

    // Normalize pair order to prevent (A, B) vs (B, A) race condition duplicate pairs
    const [u1, u2] = senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];

    // ATOMIC TRANSACTION: Guarantees zero race conditions under concurrent requests
    const newMatch = await db.transaction(async (tx) => {
      // 1. Atomically lock both candidates IF AND ONLY IF neither is currently locked
      const lockedRows = await tx
        .update(users)
        .set({ isLocked: true })
        .where(
          and(
            or(eq(users.id, senderId), eq(users.id, receiverId)),
            eq(users.isLocked, false),
            eq(users.isDeleted, false)
          )
        )
        .returning({ id: users.id });

      if (lockedRows.length !== 2) {
        throw new ApiError(400, "One or both candidates are already in an active match");
      }

      // 2. Mark request ACCEPTED
      await tx
        .update(requests)
        .set({ status: "ACCEPTED", respondedAt: new Date() })
        .where(eq(requests.id, requestId));

      // 3. Create Active Match with normalized pair order (u1 < u2)
      const [match] = await tx
        .insert(matches)
        .values({
          user1Id: u1,
          user2Id: u2,
          status: "ACTIVE",
          user1RevealAccepted: false,
          user2RevealAccepted: false,
        })
        .returning();

      // 4. Cancel all other pending requests involving either candidate
      await tx
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

      return match;
    });

    return {
      message: previouslyUnmatched
        ? "It's a Re-Match! Note: You had previously unmatched with this user. Both candidates are now locked in an exclusive pair."
        : "It's a Match! Both candidates are now locked in an exclusive pair.",
      match: newMatch,
      previouslyUnmatched,
      warning: previouslyUnmatched
        ? "Warning: You have previously matched and unmatched with this user."
        : null,
    };
  }

  /**
   * Get user's incoming and outgoing requests (with ex-match warnings)
   */
  static async getMyRequests(userId: string) {
    const fortyEightHoursAgo = new Date(Date.now() - RequestService.REQUEST_TTL_MS);

    // 0. Automatically expire stale pending requests older than 48 hours (2-day TTL)
    await db
      .update(requests)
      .set({ status: "EXPIRED", respondedAt: new Date() })
      .where(and(eq(requests.status, "PENDING"), sql`${requests.createdAt} < ${fortyEightHoursAgo}`));

    // 1. Fetch all past UNMATCHED records involving userId
    const pastUnmatches = await db
      .select({
        user1Id: matches.user1Id,
        user2Id: matches.user2Id,
        unmatchedAt: matches.unmatchedAt,
      })
      .from(matches)
      .where(
        and(
          eq(matches.status, "UNMATCHED"),
          sql`(${matches.user1Id} = ${userId} OR ${matches.user2Id} = ${userId})`
        )
      );

    const unmatchHistoryMap = new Map<string, Date | null>();
    for (const record of pastUnmatches) {
      const exPartnerId = record.user1Id === userId ? record.user2Id : record.user1Id;
      const existingDate = unmatchHistoryMap.get(exPartnerId);
      if (!existingDate || (record.unmatchedAt && record.unmatchedAt > existingDate)) {
        unmatchHistoryMap.set(exPartnerId, record.unmatchedAt);
      }
    }

    // 2. Fetch incoming requests (Active within 48h TTL)
    const incomingRaw = await db
      .select({
        id: requests.id,
        senderId: requests.senderId,
        username: profiles.username,
        avatarUrl: profiles.avatarUrl,
        dob: profiles.dob,
        height: profiles.height,
        region: profiles.region,
        isRegionVisible: profiles.isRegionVisible,
        gender: profiles.gender,
        city: profiles.city,
        createdAt: requests.createdAt,
      })
      .from(requests)
      .innerJoin(profiles, eq(requests.senderId, profiles.userId))
      .where(
        and(
          eq(requests.receiverId, userId),
          eq(requests.status, "PENDING"),
          gte(requests.createdAt, fortyEightHoursAgo)
        )
      );

    const incoming = incomingRaw.map((req) => {
      const previouslyUnmatched = unmatchHistoryMap.has(req.senderId);
      const expiresAt = new Date(new Date(req.createdAt).getTime() + RequestService.REQUEST_TTL_MS);

      return {
        ...req,
        age: calculateAge(req.dob), // Always visible
        region: req.isRegionVisible ? req.region : "[HIDDEN - Private]", // Visible when user wants
        expiresAt,
        previouslyUnmatched,
        lastUnmatchedAt: unmatchHistoryMap.get(req.senderId) ?? null,
        warning: previouslyUnmatched
          ? "Warning: You previously matched and unmatched with this user (they may have changed their username)."
          : null,
      };
    });

    // 3. Fetch outgoing requests (Active within 48h TTL)
    const outgoingRaw = await db
      .select({
        id: requests.id,
        receiverId: requests.receiverId,
        username: profiles.username,
        avatarUrl: profiles.avatarUrl,
        dob: profiles.dob,
        height: profiles.height,
        region: profiles.region,
        isRegionVisible: profiles.isRegionVisible,
        gender: profiles.gender,
        city: profiles.city,
        createdAt: requests.createdAt,
      })
      .from(requests)
      .innerJoin(profiles, eq(requests.receiverId, profiles.userId))
      .where(
        and(
          eq(requests.senderId, userId),
          eq(requests.status, "PENDING"),
          gte(requests.createdAt, fortyEightHoursAgo)
        )
      );

    const outgoing = outgoingRaw.map((req) => {
      const previouslyUnmatched = unmatchHistoryMap.has(req.receiverId);
      const expiresAt = new Date(new Date(req.createdAt).getTime() + RequestService.REQUEST_TTL_MS);

      return {
        ...req,
        age: calculateAge(req.dob), // Always visible
        region: req.isRegionVisible ? req.region : "[HIDDEN - Private]", // Visible when user wants
        expiresAt,
        previouslyUnmatched,
        lastUnmatchedAt: unmatchHistoryMap.get(req.receiverId) ?? null,
        warning: previouslyUnmatched
          ? "Warning: You previously matched and unmatched with this user (they may have changed their username)."
          : null,
      };
    });

    return { incoming, outgoing };
  }
}