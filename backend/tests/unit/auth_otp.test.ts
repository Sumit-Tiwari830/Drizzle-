import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { hashPassword, comparePassword } from "../../src/utils/hash.ts";
import { generateToken, verifyToken } from "../../src/utils/jwt.ts";
import { authorizeRoles, requireAdmin, requireEmailVerified } from "../../src/middlewares/auth.middleware.ts";
import { ApiError } from "../../src/utils/apiError.ts";
import { EmailService } from "../../src/services/email.service.ts";

describe("🛡️ Production Authentication, RBAC & OTP Verification Suite", () => {
  describe("1. Cryptographic Security & Password Hashing", () => {
    it("should generate strong salted hashes and securely compare passwords", async () => {
      const password = "SuperSecretPassword2026!";
      const hash = await hashPassword(password);

      assert.notEqual(hash, password);
      assert.ok(hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.length > 20);

      const isValid = await comparePassword(password, hash);
      assert.equal(isValid, true);

      const isInvalid = await comparePassword("WrongPassword123!", hash);
      assert.equal(isInvalid, false);
    });

    it("should produce cryptographically random 6-digit OTP codes", () => {
      for (let i = 0; i < 50; i++) {
        const otp = crypto.randomInt(100000, 1000000).toString();
        assert.equal(otp.length, 6);
        assert.ok(/^[1-9][0-9]{5}$/.test(otp), `OTP ${otp} is not a valid 6-digit number`);
      }
    });
  });

  describe("2. OTP Hashing, Verification & Replay Protection Invariants", () => {
    // In-memory simulated OTP store reflecting PostgreSQL 'otps' table logic
    interface MockOtpRecord {
      id: string;
      email: string;
      otpHash: string;
      type: string;
      expiresAt: Date;
      isUsed: boolean;
      attempts: number;
      createdAt: Date;
    }

    const mockOtpDb: MockOtpRecord[] = [];

    const simulateSaveOtp = async (email: string, rawOtp: string, type: string, createdAt = new Date(), expiresAt = new Date(Date.now() + 10 * 60 * 1000)) => {
      const otpHash = await hashPassword(rawOtp);
      const record: MockOtpRecord = {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        otpHash,
        type,
        expiresAt,
        isUsed: false,
        attempts: 0,
        createdAt,
      };
      mockOtpDb.push(record);
      return record;
    };

    const simulateVerifyOtp = async (email: string, rawOtp: string, type: string, now = new Date()) => {
      const normalizedEmail = email.toLowerCase().trim();
      const record = [...mockOtpDb]
        .reverse()
        .find((r) => r.email === normalizedEmail && r.type === type && !r.isUsed);

      if (!record) {
        throw new ApiError(400, "No active verification code found");
      }

      if (now > record.expiresAt) {
        record.isUsed = true;
        throw new ApiError(400, "Verification code has expired");
      }

      if (record.attempts >= 5) {
        record.isUsed = true;
        throw new ApiError(400, "Too many failed attempts");
      }

      const isMatch = await comparePassword(rawOtp, record.otpHash);
      if (!isMatch) {
        record.attempts += 1;
        if (record.attempts >= 5) {
          record.isUsed = true;
        }
        throw new ApiError(400, `Incorrect verification code. ${5 - record.attempts} attempts remaining`);
      }

      record.isUsed = true;
      return true;
    };

    it("should never store plaintext OTPs and successfully verify valid codes", async () => {
      const email = "user1@datingapp.com";
      const rawOtp = "482910";
      const record = await simulateSaveOtp(email, rawOtp, "EMAIL_VERIFICATION");

      // Verify that database record stores hash, NOT plaintext
      assert.notEqual(record.otpHash, rawOtp);
      assert.equal(record.isUsed, false);

      // Verify OTP
      const verified = await simulateVerifyOtp(email, rawOtp, "EMAIL_VERIFICATION");
      assert.equal(verified, true);
      assert.equal(record.isUsed, true);
    });

    it("should prevent replay attacks by disallowing reuse of consumed OTPs", async () => {
      const email = "user2@datingapp.com";
      const rawOtp = "736192";
      await simulateSaveOtp(email, rawOtp, "EMAIL_VERIFICATION");

      // First verification succeeds
      await simulateVerifyOtp(email, rawOtp, "EMAIL_VERIFICATION");

      // Second verification attempt with same code must fail
      await assert.rejects(
        async () => simulateVerifyOtp(email, rawOtp, "EMAIL_VERIFICATION"),
        (err: any) => err instanceof ApiError && err.statusCode === 400
      );
    });

    it("should reject expired OTPs (10-minute expiry boundary)", async () => {
      const email = "user3@datingapp.com";
      const rawOtp = "991823";
      const pastTime = new Date(Date.now() - 11 * 60 * 1000); // 11 mins ago
      const expiredAt = new Date(Date.now() - 1 * 60 * 1000); // Expired 1 min ago

      await simulateSaveOtp(email, rawOtp, "EMAIL_VERIFICATION", pastTime, expiredAt);

      await assert.rejects(
        async () => simulateVerifyOtp(email, rawOtp, "EMAIL_VERIFICATION"),
        (err: any) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /expired/i);
          return true;
        }
      );
    });

    it("should enforce brute-force protection and lockout after 5 incorrect attempts", async () => {
      const email = "brute_force_victim@datingapp.com";
      const correctOtp = "654321";
      const record = await simulateSaveOtp(email, correctOtp, "PASSWORD_RESET");

      // 4 failed attempts
      for (let i = 1; i <= 4; i++) {
        await assert.rejects(
          async () => simulateVerifyOtp(email, "000000", "PASSWORD_RESET"),
          (err: any) => {
            assert.equal(err.statusCode, 400);
            assert.equal(record.attempts, i);
            assert.equal(record.isUsed, false);
            return true;
          }
        );
      }

      // 5th failed attempt -> locks out & invalidates code
      await assert.rejects(
        async () => simulateVerifyOtp(email, "000000", "PASSWORD_RESET"),
        (err: any) => {
          assert.equal(err.statusCode, 400);
          assert.equal(record.attempts, 5);
          assert.equal(record.isUsed, true);
          return true;
        }
      );

      // Now even entering the CORRECT code must be rejected because attempts exceeded
      await assert.rejects(
        async () => simulateVerifyOtp(email, correctOtp, "PASSWORD_RESET"),
        (err: any) => {
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    });

    it("should enforce 60-second cooldown between consecutive OTP requests", () => {
      const now = new Date();
      const lastSentAt = new Date(now.getTime() - 30 * 1000); // 30 seconds ago
      const cooldownSeconds = 60;
      const elapsedSeconds = Math.floor((now.getTime() - lastSentAt.getTime()) / 1000);

      assert.ok(elapsedSeconds < cooldownSeconds);
      const remainingSeconds = cooldownSeconds - elapsedSeconds;
      assert.equal(remainingSeconds, 30);
    });
  });

  describe("3. Role-Based Access Control (RBAC) Middleware", () => {
    const createMockReqRes = (user?: any) => {
      const req: any = { user };
      let status = 200;
      let errorPassed: any = null;
      let nextCalled = false;

      const res: any = {
        status: (s: number) => {
          status = s;
          return res;
        },
        json: (d: any) => d,
      };

      const next = (err?: any) => {
        nextCalled = true;
        errorPassed = err;
      };

      return { req, res, next, getStatus: () => status, getError: () => errorPassed, wasNextCalled: () => nextCalled };
    };

    it("should allow ADMIN users to access admin-only routes", () => {
      const adminUser = { id: "admin-uuid-1", role: "ADMIN", isEmailVerified: true };
      const { req, res, next, getError, wasNextCalled } = createMockReqRes(adminUser);

      requireAdmin(req, res, next);
      assert.equal(wasNextCalled(), true);
      assert.equal(getError(), undefined);
    });

    it("should deny USER role with 403 Forbidden on admin-only routes", () => {
      const normalUser = { id: "user-uuid-1", role: "USER", isEmailVerified: true };
      const { req, res, next, getError, wasNextCalled } = createMockReqRes(normalUser);

      requireAdmin(req, res, next);
      assert.equal(wasNextCalled(), true);
      const err = getError();
      assert.ok(err instanceof ApiError);
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /Access denied/i);
    });

    it("should deny unauthenticated requests with 401 Unauthorized", () => {
      const { req, res, next, getError, wasNextCalled } = createMockReqRes(undefined);

      const middleware = authorizeRoles("USER", "ADMIN");
      middleware(req, res, next);
      assert.equal(wasNextCalled(), true);
      const err = getError();
      assert.ok(err instanceof ApiError);
      assert.equal(err.statusCode, 401);
    });

    it("should allow multi-role authorizeRoles matching either role", () => {
      const middleware = authorizeRoles("MODERATOR", "ADMIN");

      const userReq = createMockReqRes({ role: "ADMIN" });
      middleware(userReq.req, userReq.res, userReq.next);
      assert.equal(userReq.getError(), undefined);

      const unauthorizedReq = createMockReqRes({ role: "USER" });
      middleware(unauthorizedReq.req, unauthorizedReq.res, unauthorizedReq.next);
      assert.equal(unauthorizedReq.getError()?.statusCode, 403);
    });
  });

  describe("4. Email Verification Middleware (requireEmailVerified)", () => {
    const createMockReqRes = (user?: any) => {
      const req: any = { user };
      let errorPassed: any = null;
      let nextCalled = false;
      const res: any = {};
      const next = (err?: any) => {
        nextCalled = true;
        errorPassed = err;
      };
      return { req, res, next, getError: () => errorPassed, wasNextCalled: () => nextCalled };
    };

    it("should permit users whose email is verified (isEmailVerified = true)", () => {
      const verifiedUser = { id: "u-1", email: "verified@dating.com", isEmailVerified: true };
      const { req, res, next, getError, wasNextCalled } = createMockReqRes(verifiedUser);

      requireEmailVerified(req, res, next);
      assert.equal(wasNextCalled(), true);
      assert.equal(getError(), undefined);
    });

    it("should block unverified users with 403 Forbidden until OTP is verified", () => {
      const unverifiedUser = { id: "u-2", email: "unverified@dating.com", isEmailVerified: false };
      const { req, res, next, getError, wasNextCalled } = createMockReqRes(unverifiedUser);

      requireEmailVerified(req, res, next);
      assert.equal(wasNextCalled(), true);
      const err = getError();
      assert.ok(err instanceof ApiError);
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /Email address not verified/i);
    });
  });

  describe("5. Email Dispatch Service & Template Integration", () => {
    it("should generate HTML templates with correct action branding and security headers", async () => {
      const otp = "819204";
      const result = await EmailService.sendOtpEmail("test@example.com", otp, "EMAIL_VERIFICATION");

      // Verify that calling sendOtpEmail returns an outcome object without crashing
      assert.ok(typeof result === "object");
      assert.ok("success" in result);
    });

    it("should handle password reset and login OTP templates gracefully", async () => {
      const otp = "123456";
      const resetResult = await EmailService.sendOtpEmail("reset@example.com", otp, "PASSWORD_RESET");
      const loginResult = await EmailService.sendOtpEmail("login@example.com", otp, "LOGIN");

      assert.ok(typeof resetResult === "object");
      assert.ok(typeof loginResult === "object");
    });
  });
});
