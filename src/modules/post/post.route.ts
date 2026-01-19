import { Router } from "express";
import { supabaseAuth, optionalSupabaseAuth } from "../auth/auth.middleware";
import { PostController } from "./post.controller";

const postRoutes = Router();

postRoutes.post("/", supabaseAuth, PostController.createPost);
postRoutes.post("/:postId/reactions", supabaseAuth, PostController.reactToPost);
postRoutes.post("/:postId/media", PostController.addPostMedia);


postRoutes.get("/:postId", optionalSupabaseAuth, PostController.getPostById);
postRoutes.get("/:postId/creatorId", supabaseAuth, PostController.getPostCreatorId);
postRoutes.get("/:postId/media",supabaseAuth, PostController.getMediaByPostId);
postRoutes.get("/:postId/reactions/me", supabaseAuth, PostController.getMyPostReaction);

postRoutes.get("/:postId/reaction", supabaseAuth, PostController.getReactions);




postRoutes.patch("/:postId", supabaseAuth, PostController.updatePostContent);

postRoutes.delete("/:postId", supabaseAuth, PostController.deletePost);
postRoutes.delete("/media/:mediaId",supabaseAuth, PostController.deleteMedia);



export default postRoutes;
