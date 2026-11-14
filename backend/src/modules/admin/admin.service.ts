import * as XLSX from "xlsx";
import { db } from "../../db/index.js";
import { masterDirectory, users, profiles } from "../../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import { ApiError } from "../../utils/apiError.js";

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

    return { message: "User successfully verified and added to master directory" };
  }
}
