"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/comment/comment.routes.ts
const express_1 = require("express");
const comment_controller_1 = require("./comment.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const commentRoutes = (0, express_1.Router)();
commentRoutes.get("/post/:postId/comment", auth_middleware_1.optionalSupabaseAuth, comment_controller_1.getPostComments);
commentRoutes.post("/post/:postId/comment", auth_middleware_1.supabaseAuth, comment_controller_1.createComment);
commentRoutes.get("/comments/:commentId/replies", auth_middleware_1.supabaseAuth, comment_controller_1.getCommentReplies);
commentRoutes.patch("/comments/:commentId", auth_middleware_1.supabaseAuth, comment_controller_1.updateComment);
commentRoutes.delete("/comments/:commentId", auth_middleware_1.supabaseAuth, comment_controller_1.deleteComment);
commentRoutes.post("/comments/:commentId/react", auth_middleware_1.supabaseAuth, comment_controller_1.reactToComment);
commentRoutes.delete("/comments/:commentId/react", auth_middleware_1.supabaseAuth, comment_controller_1.removeCommentReaction);
commentRoutes.get("/comments/:commentId/reactions/me", auth_middleware_1.supabaseAuth, comment_controller_1.getMyCommentReaction);
exports.default = commentRoutes;
