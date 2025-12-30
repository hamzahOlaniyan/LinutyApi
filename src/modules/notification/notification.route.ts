import { Router } from "express";
import {
  NotificationController
} from "./notification.controller";
import { supabaseAuth } from "../auth/auth.middleware";

const router = Router();

router.get("/", supabaseAuth, NotificationController.getMyNotifications);
router.get("/count", supabaseAuth, NotificationController.getNotificationCount);
router.patch("/:id/read", supabaseAuth, NotificationController.markNotificationRead);
router.patch("/read-all", supabaseAuth, NotificationController.markAllNotificationsRead);

export default router;
