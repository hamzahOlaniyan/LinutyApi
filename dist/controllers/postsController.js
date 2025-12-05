"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPostById = exports.getAllPost = void 0;
const prisma_1 = require("../config/prisma");
const getAllPost = async (req, res) => {
    try {
        const posts = await prisma_1.prisma.posts.findMany();
        res.status(200).json(posts);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getAllPost = getAllPost;
const getPostById = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await prisma_1.prisma.posts.findUnique({
            where: { id: id },
        });
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }
        res.status(200).json(post);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getPostById = getPostById;
