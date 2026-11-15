import { Router } from "express";
import { MatchController } from "./match.controller.js";
import { authenticate, requireEmailVerified } from "../../middlewares/auth.middleware.js";

const router = Router();

// Match operations require verified email via OTP
router.use(authenticate, requireEmailVerified);

router.get("/my-match", MatchController.getMyMatch);
router.post("/:id/reveal-request", MatchController.requestProfileReveal);
router.post("/:id/unmatch", MatchController.unmatch);

export default router;
