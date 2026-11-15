import { Router } from "express";
import { ChatController } from "./chat.controller.js";
import { authenticate, requireEmailVerified } from "../../middlewares/auth.middleware.js";

const router = Router();

// Public health check
router.get("/status", ChatController.getStatus);

// Protected routes (Require authenticated & email verified user)
router.use(authenticate, requireEmailVerified);

router.get("/messages/:matchId", ChatController.getMessages);
router.post("/messages", ChatController.createMessage);
router.put("/messages/:matchId/read", ChatController.markMessagesAsRead);

export default router;
