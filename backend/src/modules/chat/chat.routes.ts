import { Router } from "express";
import { ChatController } from "./chat.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

// Public health check
router.get("/status", ChatController.getStatus);

// Protected routes (Require authenticated user)
router.use(authenticate);

router.get("/messages/:matchId", ChatController.getMessages);
router.post("/messages", ChatController.createMessage);

export default router;
