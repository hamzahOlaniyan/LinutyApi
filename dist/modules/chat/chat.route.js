"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/chat/chat.routes.ts
const express_1 = require("express");
const chat_controller_1 = require("./chat.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const router = (0, express_1.Router)();
router.get("/", auth_middleware_1.supabaseAuth, chat_controller_1.listConversations);
router.post("/", auth_middleware_1.supabaseAuth, chat_controller_1.createConversation);
router.get("/:id/messages", auth_middleware_1.supabaseAuth, chat_controller_1.getMessages);
router.post("/:id/messages", auth_middleware_1.supabaseAuth, chat_controller_1.sendMessage);
router.post("/:id/read", auth_middleware_1.supabaseAuth, chat_controller_1.markConversationRead);
exports.default = router;
