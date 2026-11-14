import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.delete("/delete-account", authenticate, AuthController.deleteAccount);

export default router;
