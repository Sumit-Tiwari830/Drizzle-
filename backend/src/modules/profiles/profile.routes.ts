import { Router } from "express";
import { ProfileController } from "./profile.controller.js";
import { authenticate, requireEmailVerified } from "../../middlewares/auth.middleware.js";
import { uploadImage } from "../../middlewares/upload.middleware.js";

const router = Router();

// User can view their own profile with authenticate
router.use(authenticate);
router.get("/me", ProfileController.getMyProfile);

// Actions modifying public profile require email verification via OTP
router.put("/username", requireEmailVerified, ProfileController.updateUsername);
router.put("/toggle-public-reveal", requireEmailVerified, ProfileController.togglePublicReveal);
router.put("/toggle-region-visibility", requireEmailVerified, ProfileController.toggleRegionVisibility);
router.put("/me", requireEmailVerified, ProfileController.updateProfile);

// Cloudinary Image Uploads (Require Verified Email)
router.post("/upload-avatar", requireEmailVerified, uploadImage.single("avatar"), ProfileController.uploadAvatar);
router.post("/upload-photo", requireEmailVerified, uploadImage.single("photo"), ProfileController.uploadPhoto);
router.delete("/photos", requireEmailVerified, ProfileController.deletePhoto);

export default router;
