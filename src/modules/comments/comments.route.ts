// src/modules/comment/comment.routes.ts
import { Router } from "express";
import {
  createComment,
  getPostComments,
  updateComment,
  deleteComment,
  reactToComment,
  removeCommentReaction,
  getCommentReplies,
  getMyCommentReaction
} from "./comment.controller";
import { supabaseAuth, optionalSupabaseAuth } from "../auth/auth.middleware";

const router = Router();

// comments for a post
router.get("/post/:postId/comment", optionalSupabaseAuth, getPostComments);
router.post("/post/:postId/comment", supabaseAuth, createComment);

router.get("/comments/:commentId/replies", supabaseAuth, getCommentReplies);


// single comment operations
router.patch("/comments/:commentId", supabaseAuth, updateComment);
router.delete("/comments/:commentId", supabaseAuth, deleteComment);

// reactions on comments
router.post("/comments/:commentId/react", supabaseAuth, reactToComment);
router.delete("/comments/:commentId/react", supabaseAuth, removeCommentReaction);
router.get("/comments/:commentId/reactions/me", supabaseAuth, getMyCommentReaction);


export default router;
