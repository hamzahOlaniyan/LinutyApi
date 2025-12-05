// src/modules/chat/chat.routes.ts
import { Router } from "express";
import {
  createConversation,
  listConversations,
  sendMessage,
  getMessages,
  markConversationRead
} from "./chat.controller";
import { supabaseAuth } from "../auth/auth.middleware";

const router = Router();

router.get("/", supabaseAuth, listConversations);
router.post("/", supabaseAuth, createConversation);
router.get("/:id/messages", supabaseAuth, getMessages);
router.post("/:id/messages", supabaseAuth, sendMessage);
router.post("/:id/read", supabaseAuth, markConversationRead);

export default router;
