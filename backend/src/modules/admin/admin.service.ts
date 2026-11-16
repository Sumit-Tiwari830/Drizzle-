import * as XLSX from "xlsx";
import { db } from "../../db/index.js";
import { masterDirectory, users, profiles, requests, matches, otps, userDevices } from "../../db/schema/index.js";
import { eq, and, or, desc, ilike, SQL } from "drizzle-orm";
import { ApiError } from "../../utils/apiError.js";
import { Message } from "../../db/msg_schema.js";
import { NotificationService } from "../notifications/notification.service.js";

export class AdminService {
  /**
   * Upload and parse Excel (.xlsx/.xls/.csv) to populate or update Master Directory
   * Also retroactively marks any existing matching unverified registered users as verified!
   */
  static async uploadMasterSheet(buffer: Buffer): Promise<{ total: number; inserted: number; updated: number }> {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (!rows || rows.length === 0) {
      throw new ApiError(400, "The uploaded Excel sheet contains no data");
    }

    let inserted = 0;
    let updated = 0;

    for (const row of rows) {
      // Normalize columns: accept "Email", "email", "Actual Name", "Name", "Gender", etc.
      const email = (row["Email"] || row["email"] || "").trim().toLowerCase();
      const actualName = (row["Actual Name"] || row["ActualName"] || row["Name"] || row["name"] || "").trim();
      const officialGender = (row["Official Gender"] || row["Gender"] || row["gender"] || "").trim().toLowerCase();
      const departmentOrBatch = (row["Department"] || row["Batch"] || row["departmentOrBatch"] || "").trim() || null;

      if (!email || !actualName || !officialGender) {
        continue; // Skip invalid rows
      }

      // Check if record exists in master directory
      const [existing] = await db
        .select()
        .from(masterDirectory)
        .where(eq(masterDirectory.email, email))
        .limit(1);

      if (existing) {
        await db
          .update(masterDirectory)
          .set({
            actualName,
            officialGender,
            departmentOrBatch,
            updatedAt: new Date(),
          })
          .where(eq(masterDirectory.id, existing.id));
        updated++;
      } else {
        await db.insert(masterDirectory).values({
          email,
          actualName,
          officialGender,
          departmentOrBatch,
          verifiedByAdmin: true,
        });
        inserted++;
      }

      // Sync with any already registered user with this email
      const [registeredUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (registeredUser && !registeredUser.isVerified) {
        await db.update(users).set({ isVerified: true }).where(eq(users.id, registeredUser.id));
        await db
          .update(profiles)
          .set({ actualName, gender: officialGender })
          .where(eq(profiles.userId, registeredUser.id));

        await NotificationService.createNotification(
          registeredUser.id,
          "VERIFIED",
          "Account Officially Verified! 🌟",
          "Congratulations! Your profile has been verified via the official master directory.",
          { verifiedAt: new Date().toISOString(), source: "EXCEL_MASTER_UPLOAD" }
        );
      }
    }

    return { total: rows.length, inserted, updated };
  }

  /**
   * Get all registered users whose data is not verified against master directory
   */
  static async getUnverifiedUsers() {
    return db
      .select({
        id: users.id,
        email: users.email,
        username: profiles.username,
        actualName: profiles.actualName,
        gender: profiles.gender,
        dob: profiles.dob,
        isVerified: users.isVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(profiles, eq(users.id, profiles.userId))
      .where(and(eq(users.isVerified, false), eq(users.isDeleted, false)));
  }

  /**
   * Admin manual approval of an unverified user:
   * Adds their verified record to Master Directory and marks user as verified!
   */
  static async verifyUser(userId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) {
      throw new ApiError(404, "Profile not found");
    }

    // Insert or update in master_directory
    const [existingMaster] = await db
      .select()
      .from(masterDirectory)
      .where(eq(masterDirectory.email, user.email))
      .limit(1);

    if (existingMaster) {
      await db
        .update(masterDirectory)
        .set({
          actualName: profile.actualName,
          officialGender: profile.gender,
          verifiedByAdmin: true,
          updatedAt: new Date(),
        })
        .where(eq(masterDirectory.id, existingMaster.id));
    } else {
      await db.insert(masterDirectory).values({
        email: user.email,
        actualName: profile.actualName,
        officialGender: profile.gender,
        verifiedByAdmin: true,
      });
    }

    // Mark user as verified
    await db.update(users).set({ isVerified: true }).where(eq(users.id, userId));

    // Send real-time verification notification
    await NotificationService.createNotification(
      userId,
      "VERIFIED",
      "Account Officially Verified! 🌟",
      "Congratulations! Your profile has been officially verified by Drizzle Administration. Your verified badge is now active.",
      { verifiedAt: new Date().toISOString() }
    );

    return { message: "User successfully verified and added to master directory" };
  }

  /**
   * Revoke verification status
   */
  static async unverifyUser(userId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    await db.update(users).set({ isVerified: false }).where(eq(users.id, userId));

    await NotificationService.createNotification(
      userId,
      "SYSTEM",
      "Verification Status Updated",
      "Your profile verification status was revised by Drizzle Administration.",
      { isVerified: false }
    );

    return { message: `Verification revoked for ${user.email}` };
  }

  /**
   * Get all users in the system with optional search and filter
   */
  static async getAllUsers(search?: string, filter?: string) {
    const conditions: SQL[] = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(users.email, term),
          ilike(profiles.username, term),
          ilike(profiles.actualName, term)
        )!
      );
    }

    if (filter) {
      const upperFilter = filter.toUpperCase();
      if (upperFilter === "UNVERIFIED") {
        conditions.push(and(eq(users.isVerified, false), eq(users.isDeleted, false))!);
      } else if (upperFilter === "VERIFIED") {
        conditions.push(and(eq(users.isVerified, true), eq(users.isDeleted, false))!);
      } else if (upperFilter === "BLOCKED") {
        conditions.push(eq(users.isDeleted, true));
      } else if (upperFilter === "ACTIVE") {
        conditions.push(eq(users.isDeleted, false));
      } else if (upperFilter === "LOCKED") {
        conditions.push(and(eq(users.isLocked, true), eq(users.isDeleted, false))!);
      }
    }

    const query = db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isVerified: users.isVerified,
        isEmailVerified: users.isEmailVerified,
        isLocked: users.isLocked,
        isDeleted: users.isDeleted,
        deletedAt: users.deletedAt,
        createdAt: users.createdAt,
        username: profiles.username,
        actualName: profiles.actualName,
        gender: profiles.gender,
        dob: profiles.dob,
        height: profiles.height,
        region: profiles.region,
        city: profiles.city,
        avatarUrl: profiles.avatarUrl,
      })
      .from(users)
      .leftJoin(profiles, eq(users.id, profiles.userId));

    if (conditions.length > 0) {
      return query.where(and(...conditions)).orderBy(desc(users.createdAt));
    }

    return query.orderBy(desc(users.createdAt));
  }

  /**
   * Promote a user to Administrator (Master Admin exclusive)
   */
  static async promoteToAdmin(targetUserId: string, requesterUserId?: string) {
    if (requesterUserId) {
      const [requester] = await db.select().from(users).where(eq(users.id, requesterUserId)).limit(1);
      if (!requester || requester.email.toLowerCase() !== "kiransumit2231@gmail.com") {
        throw new ApiError(403, "Only Master Admin (kiransumit2231@gmail.com) can appoint administrators");
      }
    }

    const [user] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.email.toLowerCase() === "kiransumit2231@gmail.com") {
      throw new ApiError(400, "Master Admin is already root administrator");
    }

    if (user.role === "ADMIN" || user.role === "MASTER_ADMIN") {
      throw new ApiError(400, "User is already an administrator");
    }

    await db.update(users).set({ role: "ADMIN", isVerified: true }).where(eq(users.id, targetUserId));

    await NotificationService.createNotification(
      targetUserId,
      "SYSTEM",
      "Admin Privileges Granted 🛡️",
      "You have been appointed as an Administrator by Master Admin. The Admin Console is now available in your profile.",
      { role: "ADMIN", promotedBy: "kiransumit2231@gmail.com" }
    );

    return { message: `User ${user.email} has been promoted to Administrator` };
  }

  /**
   * Demote an Administrator to regular user (Master Admin exclusive)
   */
  static async demoteFromAdmin(targetUserId: string, requesterUserId?: string) {
    if (requesterUserId) {
      const [requester] = await db.select().from(users).where(eq(users.id, requesterUserId)).limit(1);
      if (!requester || requester.email.toLowerCase() !== "kiransumit2231@gmail.com") {
        throw new ApiError(403, "Only Master Admin (kiransumit2231@gmail.com) can remove administrators");
      }
    }

    const [user] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.email.toLowerCase() === "kiransumit2231@gmail.com") {
      throw new ApiError(400, "Master Admin cannot be demoted");
    }

    if (user.role !== "ADMIN") {
      throw new ApiError(400, "User is not an administrator");
    }

    await db.update(users).set({ role: "USER" }).where(eq(users.id, targetUserId));

    await NotificationService.createNotification(
      targetUserId,
      "SYSTEM",
      "Admin Privileges Revoked",
      "Your Administrator privileges have been revoked by Master Admin.",
      { role: "USER", demotedBy: "kiransumit2231@gmail.com" }
    );

    return { message: `Administrator privileges revoked for ${user.email}` };
  }

  /**
   * Block / Deactivate any user
   * - Sets isDeleted = true, deletedAt = NOW()
   * - If matched, dissolves match, unlocks partner, cleans chat
   * - Cancels any pending connect requests
   */
  static async blockUser(targetUserId: string, adminUserId?: string) {
    if (adminUserId && targetUserId === adminUserId) {
      throw new ApiError(400, "Admin cannot block their own account");
    }

    const [user] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.email.toLowerCase() === "kiransumit2231@gmail.com") {
      throw new ApiError(400, "Master Admin account cannot be blocked or deactivated");
    }

    // 1. Check if user is in an active match and release partner
    const [activeMatch] = await db
      .select()
      .from(matches)
      .where(
        and(
          or(eq(matches.user1Id, targetUserId), eq(matches.user2Id, targetUserId)),
          eq(matches.status, "ACTIVE")
        )
      )
      .limit(1);

    if (activeMatch) {
      const partnerId = activeMatch.user1Id === targetUserId ? activeMatch.user2Id : activeMatch.user1Id;
      await db.update(users).set({ isLocked: false }).where(eq(users.id, partnerId));
      await db
        .update(matches)
        .set({
          status: "UNMATCHED",
          unmatchedAt: new Date(),
          unmatchedBy: adminUserId || targetUserId,
        })
        .where(eq(matches.id, activeMatch.id));

      await Message.deleteMany({ matchId: activeMatch.id });

      await NotificationService.createNotification(
        partnerId,
        "UNMATCHED",
        "Connection Closed",
        "Your match was closed because the partner's account was deactivated.",
        { matchId: activeMatch.id, reason: "ADMIN_ACTION" }
      );
    }

    // 2. Cancel pending requests
    await db
      .update(requests)
      .set({ status: "CANCELLED", respondedAt: new Date() })
      .where(
        and(
          or(eq(requests.senderId, targetUserId), eq(requests.receiverId, targetUserId)),
          eq(requests.status, "PENDING")
        )
      );

    // 3. Mark user deactivated/blocked
    await db
      .update(users)
      .set({ isDeleted: true, deletedAt: new Date(), isLocked: false })
      .where(eq(users.id, targetUserId));

    // 4. Send account status notification to target user
    await NotificationService.createNotification(
      targetUserId,
      "ACCOUNT_STATUS",
      "Account Suspended 🚫",
      "Your account has been deactivated by Drizzle Administration. Please contact support if you believe this was an error.",
      { isDeleted: true }
    );

    return { message: `User ${user.email} has been successfully blocked/deactivated.` };
  }

  /**
   * Unblock / Reactivate user
   */
  static async unblockUser(targetUserId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    await db
      .update(users)
      .set({ isDeleted: false, deletedAt: null })
      .where(eq(users.id, targetUserId));

    await NotificationService.createNotification(
      targetUserId,
      "ACCOUNT_STATUS",
      "Account Reactivated ✅",
      "Your account has been reactivated by Drizzle Administration. Welcome back!",
      { isDeleted: false }
    );

    return { message: `User ${user.email} has been reactivated.` };
  }

  /**
   * Permanently Remove / Purge any user
   */
  static async removeUser(targetUserId: string, adminUserId?: string) {
    if (adminUserId && targetUserId === adminUserId) {
      throw new ApiError(400, "Admin cannot remove their own account");
    }

    const [user] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.email.toLowerCase() === "kiransumit2231@gmail.com") {
      throw new ApiError(400, "Master Admin account cannot be removed or deleted");
    }

    // Release partner if in active match
    const [activeMatch] = await db
      .select()
      .from(matches)
      .where(
        and(
          or(eq(matches.user1Id, targetUserId), eq(matches.user2Id, targetUserId)),
          eq(matches.status, "ACTIVE")
        )
      )
      .limit(1);

    if (activeMatch) {
      const partnerId = activeMatch.user1Id === targetUserId ? activeMatch.user2Id : activeMatch.user1Id;
      await db.update(users).set({ isLocked: false }).where(eq(users.id, partnerId));
      await Message.deleteMany({ matchId: activeMatch.id });
    }

    // Clear unmatchedBy reference on any matches where this user was the one who unmatched
    await db
      .update(matches)
      .set({ unmatchedBy: null })
      .where(eq(matches.unmatchedBy, targetUserId));

    // Delete matches involving this user
    await db
      .delete(matches)
      .where(or(eq(matches.user1Id, targetUserId), eq(matches.user2Id, targetUserId)));

    // Delete requests involving this user
    await db
      .delete(requests)
      .where(or(eq(requests.senderId, targetUserId), eq(requests.receiverId, targetUserId)));

    // Delete profile
    await db.delete(profiles).where(eq(profiles.userId, targetUserId));

    // Delete otps
    await db.delete(otps).where(eq(otps.email, user.email));

    // Delete devices
    await db.delete(userDevices).where(eq(userDevices.userId, targetUserId));

    // Delete user
    await db.delete(users).where(eq(users.id, targetUserId));

    return { message: `User ${user.email} has been permanently removed.` };
  }
}
