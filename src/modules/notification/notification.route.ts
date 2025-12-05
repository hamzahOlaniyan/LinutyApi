import { Router } from "express";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from "./notification.controller";
import { supabaseAuth } from "../auth/auth.middleware";

const router = Router();

router.get("/", supabaseAuth, getMyNotifications);
router.patch("/:id/read", supabaseAuth, markNotificationRead);
router.patch("/read-all", supabaseAuth, markAllNotificationsRead);

export default router;
