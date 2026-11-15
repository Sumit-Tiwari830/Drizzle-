import { Router } from "express";
import { NotificationController } from "./notification.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

// All notification routes are protected
router.use(authenticate);

router.get("/", NotificationController.getMyNotifications);
router.get("/unread-count", NotificationController.getUnreadCount);
router.put("/mark-all-read", NotificationController.markAllAsRead);
router.put("/:id/read", NotificationController.markAsRead);
router.delete("/:id", NotificationController.deleteNotification);

export default router;
