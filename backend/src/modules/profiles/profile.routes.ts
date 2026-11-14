import { Router } from "express";
import { ProfileController } from "./profile.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/me", ProfileController.getMyProfile);
router.put("/username", ProfileController.updateUsername);
router.put("/toggle-public-reveal", ProfileController.togglePublicReveal);
router.put("/me", ProfileController.updateProfile);

export default router;
