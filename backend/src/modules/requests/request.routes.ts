import { Router } from "express";
import { RequestController } from "./request.controller.js";
import { authenticate, requireEmailVerified } from "../../middlewares/auth.middleware.js";

const router = Router();

// Connecting & responding requires email verification via OTP
router.use(authenticate, requireEmailVerified);

router.post("/send", RequestController.sendRequest);
router.post("/:id/respond", RequestController.respondToRequest);
router.get("/my-requests", RequestController.getMyRequests);

export default router;
