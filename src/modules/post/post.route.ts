import { Router } from "express";
import { supabaseAuth, optionalSupabaseAuth } from "../auth/auth.middleware";
import { PostController } from "./post.controller";
import { createPostSchema } from "./post.validation";
import { validateBody } from "../../middleware/validate";


const router = Router();

// feed
router.get("/feed", supabaseAuth, PostController.getFeed);

// create/update/delete
router.post("/", supabaseAuth,validateBody(createPostSchema), PostController.createPost);
router.get("/:postId", optionalSupabaseAuth, PostController.getPostById);
router.patch("/:postId", supabaseAuth, PostController.updatePost);
router.delete("/:postId", supabaseAuth, PostController.deletePost);

// profile posts (mount under /profiles in profile.routes if you prefer)
router.get("/profile/:username", optionalSupabaseAuth, PostController.getProfilePosts);

// reactions
router.post("/:postId/react", supabaseAuth, PostController.reactToPost);
router.delete("/:postId/react", supabaseAuth, PostController.removePostReaction);

// comments
router.post("/:postId/comments", supabaseAuth, PostController.addComment);
router.get("/:postId/comments", optionalSupabaseAuth, PostController.getComments);




export default router;
