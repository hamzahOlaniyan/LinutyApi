import { Router } from "express";
import {
  NotificationController
} from "./notification.controller";
import { supabaseAuth } from "../auth/auth.middleware";

const notificationRoutes = Router();

notificationRoutes.get("/", supabaseAuth, NotificationController.getMyNotifications);
notificationRoutes.get("/count", supabaseAuth, NotificationController.getNotificationCount);
notificationRoutes.patch("/:id/read", supabaseAuth, NotificationController.markNotificationRead);
notificationRoutes.patch("/read-all", supabaseAuth, NotificationController.markAllNotificationsRead);

export default notificationRoutes;
