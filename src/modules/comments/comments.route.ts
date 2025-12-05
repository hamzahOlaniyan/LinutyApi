// src/modules/comment/comment.routes.ts
import { Router } from "express";
import {
  createComment,
  getPostComments,
  updateComment,
  deleteComment,
  reactToComment,
  removeCommentReaction
} from "./comment.controller";
import { supabaseAuth, optionalSupabaseAuth } from "../auth/auth.middleware";

const router = Router();

// comments for a post
router.get("/posts/:postId/comments", optionalSupabaseAuth, getPostComments);
router.post("/posts/:postId/comments", supabaseAuth, createComment);

// single comment operations
router.patch("/comments/:commentId", supabaseAuth, updateComment);
router.delete("/comments/:commentId", supabaseAuth, deleteComment);

// reactions on comments
router.post("/comments/:commentId/react", supabaseAuth, reactToComment);
router.delete("/comments/:commentId/react", supabaseAuth, removeCommentReaction);

export default router;
