import { Router } from "express";
import { PostController } from "./post.controller";
import { supabaseAuth } from "../auth/auth.middleware";

const router = Router();

// Feed
router.get("/", supabaseAuth, PostController.getFeed);

// Create post
router.post("/", supabaseAuth, PostController.createPost);

// Single post
router.get("/:id", supabaseAuth, PostController.getById);

// Like / unlike
router.post("/:id/like", supabaseAuth, PostController.toggleLike);

// Delete post
router.delete("/:id", supabaseAuth, PostController.deletePost);

export default router;
