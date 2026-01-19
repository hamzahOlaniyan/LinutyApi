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

const commentRoutes = Router();

commentRoutes.get("/post/:postId/comment", optionalSupabaseAuth, getPostComments);
commentRoutes.post("/post/:postId/comment", supabaseAuth, createComment);

commentRoutes.get("/comments/:commentId/replies", supabaseAuth, getCommentReplies);


commentRoutes.patch("/comments/:commentId", supabaseAuth, updateComment);
commentRoutes.delete("/comments/:commentId", supabaseAuth, deleteComment);

commentRoutes.post("/comments/:commentId/react", supabaseAuth, reactToComment);
commentRoutes.delete("/comments/:commentId/react", supabaseAuth, removeCommentReaction);
commentRoutes.get("/comments/:commentId/reactions/me", supabaseAuth, getMyCommentReaction);


export default commentRoutes;
