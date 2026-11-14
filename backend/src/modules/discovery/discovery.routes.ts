import { Router } from "express";
import { DiscoveryController } from "./discovery.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/feed", DiscoveryController.getFeed);

export default router;
