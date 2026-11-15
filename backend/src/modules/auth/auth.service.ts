import { db } from "../../db/index.js";
import { users, profiles, masterDirectory, matches } from "../../db/schema/index.js";
import { eq, and, or } from "drizzle-orm";
import { hashPassword, comparePassword } from "../../utils/hash.js";
import { generateToken } from "../../utils/jwt.js";
import { ApiError } from "../../utils/apiError.js";
import { Message } from "../../db/msg_schema.js";
import { NotificationService } from "../notifications/notification.service.js";
import { OtpService } from "../../services/otp.service.js";
import { OtpEmailType } from "../../services/email.service.js";
import { calculateAge } from "../../utils/date.js";

interface RegisterInput {
  email: string;
  password: string;
  username: string; // Pseudonym (changeable after unmatch)
  actualName?: string; // Optional if verified via master directory; required if unverified
  gender?: string; // Optional if verified via master directory; required if unverified
  dob: string; // YYYY-MM-DD
  height?: string; // Always visible (e.g., "175 cm", "5'10\"")
  region?: string; // Cultural / geographical region
  isRegionVisible?: boolean; // User preference to show/hide region
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

    // 4. Create User Record (initially unverified email)
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        role: "USER",
        isVerified,
        isEmailVerified: false,
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
        height: input.height || null,
        region: input.region || null,
        isRegionVisible: input.isRegionVisible || false,
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

    // 6. Automatically generate & dispatch Email Verification OTP via Resend
    let otpDispatchInfo = null;
    try {
      otpDispatchInfo = await OtpService.generateAndSendOtp(newUser.email, "EMAIL_VERIFICATION");
    } catch (err: any) {
      console.warn("[AuthService] Registration OTP dispatch warning:", err.message);
    }

    const token = generateToken({ id: newUser.id, email: newUser.email, role: newUser.role });

    return {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified,
        isEmailVerified: newUser.isEmailVerified,
        isLocked: newUser.isLocked,
        profile: {
          ...newProfile,
          age: calculateAge(newProfile.dob),
        },
      },
      message: "Registration successful! A 6-digit verification code has been dispatched to your email.",
      otpInfo: otpDispatchInfo,
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
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isEmailVerified: user.isEmailVerified,
        isLocked: user.isLocked,
        profile: profile
          ? {
              ...profile,
              age: calculateAge(profile.dob),
            }
          : null,
      },
    };
  }

  /**
   * Verify User Email via OTP
   */
  static async verifyEmail(emailInput: string, otpInput: string) {
    const email = emailInput.trim().toLowerCase();

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      throw new ApiError(404, "User account not found");
    }

    if (user.isEmailVerified) {
      return { message: "Email is already verified." };
    }

    // Verify OTP against hashed database record
    await OtpService.verifyOtp(email, otpInput, "EMAIL_VERIFICATION");

    // Update user record
    const [updatedUser] = await db
      .update(users)
      .set({ isEmailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();

    const token = generateToken({ id: updatedUser.id, email: updatedUser.email, role: updatedUser.role });

    return {
      message: "Email successfully verified! You now have full access to dating features.",
      token,
      accessToken: token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
        isEmailVerified: updatedUser.isEmailVerified,
        isLocked: updatedUser.isLocked,
      },
    };
  }

  /**
   * Resend Verification or Password Reset OTP
   */
  static async resendOtp(emailInput: string, type: OtpEmailType = "EMAIL_VERIFICATION") {
    const email = emailInput.trim().toLowerCase();

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      throw new ApiError(404, "No account found with this email address");
    }

    if (type === "EMAIL_VERIFICATION" && user.isEmailVerified) {
      throw new ApiError(400, "Your email is already verified.");
    }

    const result = await OtpService.generateAndSendOtp(email, type);
    return result;
  }

  /**
   * Forgot Password - Dispatches Password Reset OTP
   */
  static async forgotPassword(emailInput: string) {
    const email = emailInput.trim().toLowerCase();

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      // Security standard: do not leak existence of user, but inform code was dispatched if valid
      return { message: "If an account exists with this email, a verification code has been dispatched." };
    }

    await OtpService.generateAndSendOtp(email, "PASSWORD_RESET");
    return { message: "If an account exists with this email, a verification code has been dispatched." };
  }

  /**
   * Reset Password with OTP Verification
   */
  static async resetPassword(emailInput: string, otpInput: string, newPasswordInput: string) {
    const email = emailInput.trim().toLowerCase();

    if (!newPasswordInput || newPasswordInput.length < 6) {
      throw new ApiError(400, "New password must be at least 6 characters long");
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      throw new ApiError(404, "User account not found");
    }

    // Verify OTP
    await OtpService.verifyOtp(email, otpInput, "PASSWORD_RESET");

    // Hash new password and update
    const newPasswordHash = await hashPassword(newPasswordInput);
    await db
      .update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return { message: "Password reset successfully. You may now log in with your new password." };
  }

  /**
   * Current Authenticated User Profile & RBAC Info
   */
  static async getMe(userId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      throw new ApiError(404, "User account not found");
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      isEmailVerified: user.isEmailVerified,
      isLocked: user.isLocked,
      profile: profile
        ? {
            ...profile,
            age: calculateAge(profile.dob),
          }
        : null,
      createdAt: user.createdAt,
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
      // Delete chat history from MongoDB
      await Message.deleteMany({ matchId: activeMatch.id });

      // Notify partner in their MongoDB notification box
      await NotificationService.createNotification(
        partnerId,
        "UNMATCHED",
        "Match Ended (Account Closed)",
        "Your match partner has deactivated their account. You are now unlocked and can discover new profiles.",
        {
          matchId: activeMatch.id,
          reason: "PARTNER_ACCOUNT_DELETED",
          unmatchedAt: new Date(),
        }
      );
    }

    // 2. Soft-delete user
    await db
      .update(users)
      .set({ isDeleted: true, deletedAt: new Date(), isLocked: false })
      .where(eq(users.id, userId));

    return { message: "Account deleted successfully. Note: Official master records remain preserved." };
  }
}
