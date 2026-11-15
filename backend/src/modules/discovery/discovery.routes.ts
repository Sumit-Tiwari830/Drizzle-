import { Router } from "express";
import { DiscoveryController } from "./discovery.controller.js";
import { authenticate, requireEmailVerified } from "../../middlewares/auth.middleware.js";

const router = Router();

// Feed discovery requires both authentication AND email verification via OTP
router.use(authenticate, requireEmailVerified);

router.get("/feed", DiscoveryController.getFeed);

export default router;
