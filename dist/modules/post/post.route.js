"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const post_controller_1 = require("./post.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const router = (0, express_1.Router)();
// Feed
router.get("/", auth_middleware_1.supabaseAuth, post_controller_1.PostController.getFeed);
// Create post
router.post("/", auth_middleware_1.supabaseAuth, post_controller_1.PostController.createPost);
// Single post
router.get("/:id", auth_middleware_1.supabaseAuth, post_controller_1.PostController.getById);
// Like / unlike
router.post("/:id/like", auth_middleware_1.supabaseAuth, post_controller_1.PostController.toggleLike);
// Delete post
router.delete("/:id", auth_middleware_1.supabaseAuth, post_controller_1.PostController.deletePost);
exports.default = router;
