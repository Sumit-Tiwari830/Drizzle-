import { db } from "../../db/index.js";
import { users, profiles, masterDirectory, matches } from "../../db/schema/index.js";
import { eq, and, or } from "drizzle-orm";
import { hashPassword, comparePassword } from "../../utils/hash.js";
import { generateToken } from "../../utils/jwt.js";
import { ApiError } from "../../utils/apiError.js";

interface RegisterInput {
  email: string;
  password: string;
  username: string; // Pseudonym (changeable after unmatch)
  actualName?: string; // Optional if verified via master directory; required if unverified
  gender?: string; // Optional if verified via master directory; required if unverified
  dob: string; // YYYY-MM-DD
  bio?: string;
  interests?: string[];
  city?: string;
  lookingFor?: string;
  interestedIn?: string;
  avatarUrl?: string;
  realPhotos?: string[];
  isPublicReveal?: boolean;
}

export class AuthService {
  static async register(input: RegisterInput) {
    const email = input.email.trim().toLowerCase();

    // 1. Check if user with this email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)))
      .limit(1);

    if (existingUser) {
      throw new ApiError(409, "An account with this email already exists");
    }

    // 2. Check if username is taken
    const [existingUsername] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.username, input.username.trim()))
      .limit(1);

    if (existingUsername) {
      throw new ApiError(409, "Username is already taken. Please choose another username.");
    }

    // 3. Query Master Directory ("Actual Database") to verify
    const [masterRecord] = await db
      .select()
      .from(masterDirectory)
      .where(eq(masterDirectory.email, email))
      .limit(1);

    let isVerified = false;
    let actualName = input.actualName || input.username;
    let gender = input.gender || "other";

    if (masterRecord) {
      // User is verified against the official master database!
      isVerified = true;
      actualName = masterRecord.actualName;
      gender = masterRecord.officialGender;
    } else {
      // Unverified user: gender & actual name are self-declared (can be false)
      isVerified = false;
      if (!input.gender) {
        throw new ApiError(400, "Gender is required for registration");
      }
      gender = input.gender.toLowerCase();
    }

    const passwordHash = await hashPassword(input.password);

    // 4. Create User Record
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        role: "USER",
        isVerified,
        isLocked: false,
        isDeleted: false,
      })
      .returning();

    // 5. Create Profile Record
    const [newProfile] = await db
      .insert(profiles)
      .values({
        userId: newUser.id,
        username: input.username.trim(),
        actualName,
        gender,
        dob: input.dob,
        bio: input.bio || null,
        interests: input.interests || [],
        lookingFor: input.lookingFor || "Long-term relationship",
        interestedIn: input.interestedIn || "everyone",
        city: input.city || null,
        avatarUrl: input.avatarUrl || "https://api.dicebear.com/7.x/bottts/svg?seed=" + input.username,
        realPhotos: input.realPhotos || [],
        isPublicReveal: input.isPublicReveal || false,
      })
      .returning();

    const token = generateToken({ id: newUser.id, email: newUser.email, role: newUser.role });

    return {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified,
        isLocked: newUser.isLocked,
        profile: newProfile,
      },
    };
  }

  static async login(emailInput: string, passwordInput: string) {
    const email = emailInput.trim().toLowerCase();

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      throw new ApiError(401, "Invalid email or password");
    }

    const isMatch = await comparePassword(passwordInput, user.passwordHash);
    if (!isMatch) {
      throw new ApiError(401, "Invalid email or password");
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isLocked: user.isLocked,
        profile,
      },
    };
  }

  /**
   * Account Deletion
   * - Soft deletes user in App Users table (isDeleted = true, deletedAt = NOW())
   * - Releases any active match so partner is unlocked
   * - DOES NOT touch or delete the record from master_directory!
   */
  static async deleteAccount(userId: string) {
    // 1. Check if user is in an active match and release the partner
    const [activeMatch] = await db
      .select()
      .from(matches)
      .where(
        and(
          or(eq(matches.user1Id, userId), eq(matches.user2Id, userId)),
          eq(matches.status, "ACTIVE")
        )
      )
      .limit(1);

    if (activeMatch) {
      const partnerId = activeMatch.user1Id === userId ? activeMatch.user2Id : activeMatch.user1Id;
      // Unlock partner
      await db.update(users).set({ isLocked: false }).where(eq(users.id, partnerId));
      // End match
      await db
        .update(matches)
        .set({ status: "UNMATCHED", unmatchedAt: new Date(), unmatchedBy: userId })
        .where(eq(matches.id, activeMatch.id));
    }

    // 2. Soft-delete user
    await db
      .update(users)
      .set({ isDeleted: true, deletedAt: new Date(), isLocked: false })
      .where(eq(users.id, userId));

    return { message: "Account deleted successfully. Note: Official master records remain preserved." };
  }
}
