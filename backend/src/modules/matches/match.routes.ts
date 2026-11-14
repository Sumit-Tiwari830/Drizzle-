import { Router } from "express";
import { MatchController } from "./match.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/my-match", MatchController.getMyMatch);
router.post("/:id/reveal-request", MatchController.requestProfileReveal);
router.post("/:id/unmatch", MatchController.unmatch);

export default router;
