import { Router } from "express";
import { AdminController } from "./admin.controller.js";
import { authenticate, requireAdmin } from "../../middlewares/auth.middleware.js";
import { uploadExcel } from "../../middlewares/upload.middleware.js";

const router = Router();

// Protect all admin routes
router.use(authenticate, requireAdmin);

router.post("/upload-master-sheet", uploadExcel.single("file"), AdminController.uploadMasterSheet);
router.get("/unverified-users", AdminController.getUnverifiedUsers);
router.post("/verify-user/:id", AdminController.verifyUser);

export default router;
