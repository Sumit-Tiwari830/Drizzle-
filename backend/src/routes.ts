import { Router } from "express";
import adminRoutes from "./modules/admin/admin.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import profileRoutes from "./modules/profiles/profile.routes.js";
import requestRoutes from "./modules/requests/request.routes.js";
import matchRoutes from "./modules/matches/match.routes.js";
import discoveryRoutes from "./modules/discovery/discovery.routes.js";

const router = Router();

router.use("/admin", adminRoutes);
router.use("/auth", authRoutes);
router.use("/profiles", profileRoutes);
router.use("/requests", requestRoutes);
router.use("/matches", matchRoutes);
router.use("/discovery", discoveryRoutes);

export default router;
