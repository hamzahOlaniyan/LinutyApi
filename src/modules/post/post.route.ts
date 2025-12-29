import { Router } from "express";
import { supabaseAuth, optionalSupabaseAuth } from "../auth/auth.middleware";
import { PostController } from "./post.controller";

const router = Router();

router.post("/", supabaseAuth, PostController.createPost);
router.post("/:postId/reactions", supabaseAuth, PostController.reactToPost);
router.post("/:postId/media", PostController.addPostMedia);


router.get("/:postId", optionalSupabaseAuth, PostController.getPostById);
router.get("/:postId/media",supabaseAuth, PostController.getMediaByPostId);
router.get("/:postId/reactions/me", supabaseAuth, PostController.getMyPostReaction);

router.patch("/:postId", supabaseAuth, PostController.updatePostContent);

router.delete("/:postId", supabaseAuth, PostController.deletePost);
router.delete("/media/:mediaId",supabaseAuth, PostController.deleteMedia);



export default router;
