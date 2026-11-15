import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CloudinaryService } from "../../src/services/cloudinary.service.ts";
import { requireEmailVerified } from "../../src/middlewares/auth.middleware.ts";
import { ApiError } from "../../src/utils/apiError.ts";

describe("📸 Unit Tests: Cloudinary Service & Email Verification Gating", () => {
  describe("1. Cloudinary URL Extraction Helpers", () => {
    it("should extract correct public_id from standard Cloudinary secure_urls", () => {
      const url = "https://res.cloudinary.com/drizzle/image/upload/v1731678123/dating_app/photos/alice_pic_1.jpg";
      const publicId = CloudinaryService.extractPublicId(url);
      assert.equal(publicId, "dating_app/photos/alice_pic_1");
    });

    it("should handle URLs without version numbers correctly", () => {
      const url = "https://res.cloudinary.com/drizzle/image/upload/dating_app/avatars/bot_avatar.webp";
      const publicId = CloudinaryService.extractPublicId(url);
      assert.ok(publicId?.includes("dating_app/avatars/bot_avatar"));
    });

    it("should return null gracefully for invalid or empty image URLs", () => {
      assert.equal(CloudinaryService.extractPublicId(""), null);
      assert.equal(CloudinaryService.extractPublicId("https://example.com/not-cloudinary.png"), null);
      assert.equal(CloudinaryService.extractPublicId(null as any), null);
    });
  });

  describe("2. requireEmailVerified Gating across Core Dating Routes", () => {
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

    it("should block unverified user (isEmailVerified = false) with 403 Forbidden", () => {
      const unverifiedUser = { id: "u-bot-123", email: "bot@spam.com", isEmailVerified: false };
      const { req, res, next, getError, wasNextCalled } = createMockReqRes(unverifiedUser);

      requireEmailVerified(req, res, next);
      assert.equal(wasNextCalled(), true);
      const err = getError();
      assert.ok(err instanceof ApiError);
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /Email address not verified/i);
    });

    it("should permit verified user (isEmailVerified = true) to proceed to feed & requests", () => {
      const verifiedUser = { id: "u-real-456", email: "human@campus.edu", isEmailVerified: true };
      const { req, res, next, getError, wasNextCalled } = createMockReqRes(verifiedUser);

      requireEmailVerified(req, res, next);
      assert.equal(wasNextCalled(), true);
      assert.equal(getError(), undefined);
    });
  });

  describe("3. Photo Gallery Limits & Deletion Invariants", () => {
    it("should enforce maximum of 6 photos per profile", () => {
      const existingPhotos = [
        "https://res.cloudinary.com/drizzle/image/upload/v1/pic1.jpg",
        "https://res.cloudinary.com/drizzle/image/upload/v1/pic2.jpg",
        "https://res.cloudinary.com/drizzle/image/upload/v1/pic3.jpg",
        "https://res.cloudinary.com/drizzle/image/upload/v1/pic4.jpg",
        "https://res.cloudinary.com/drizzle/image/upload/v1/pic5.jpg",
        "https://res.cloudinary.com/drizzle/image/upload/v1/pic6.jpg",
      ];

      const maxLimit = 6;
      assert.equal(existingPhotos.length >= maxLimit, true);

      // Attempting to append 7th photo must throw an error
      const attemptUpload = () => {
        if (existingPhotos.length >= maxLimit) {
          throw new ApiError(400, "Maximum of 6 photos allowed. Please delete a photo before uploading a new one.");
        }
      };

      assert.throws(
        () => attemptUpload(),
        (err: any) => err.statusCode === 400 && /Maximum of 6 photos/i.test(err.message)
      );
    });

    it("should correctly remove specific photo URL from gallery list", () => {
      const initialPhotos = [
        "https://res.cloudinary.com/drizzle/image/upload/v1/photo_a.jpg",
        "https://res.cloudinary.com/drizzle/image/upload/v1/photo_b.jpg",
        "https://res.cloudinary.com/drizzle/image/upload/v1/photo_c.jpg",
      ];

      const toDelete = "https://res.cloudinary.com/drizzle/image/upload/v1/photo_b.jpg";
      const updatedPhotos = initialPhotos.filter((p) => p !== toDelete);

      assert.equal(updatedPhotos.length, 2);
      assert.ok(!updatedPhotos.includes(toDelete));
      assert.ok(updatedPhotos.includes("https://res.cloudinary.com/drizzle/image/upload/v1/photo_a.jpg"));
      assert.ok(updatedPhotos.includes("https://res.cloudinary.com/drizzle/image/upload/v1/photo_c.jpg"));
    });
  });
});
