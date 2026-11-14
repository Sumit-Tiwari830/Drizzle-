import { Router } from "express";
import { RequestController } from "./request.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.post("/send", RequestController.sendRequest);
router.post("/:id/respond", RequestController.respondToRequest);
router.get("/my-requests", RequestController.getMyRequests);

export default router;
