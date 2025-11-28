import { Request, Response } from "express";

import { prisma } from "../config/prisma";

export const getAllPost = async (req: Request, res: Response) => {
   try {
      const posts = await prisma.posts.findMany();
      res.status(200).json(posts);
   } catch (error: any) {
      res.status(500).json({ error: error.message });
   }
};

export const getPostById = async (req: Request, res: Response) => {
   try {
      const { id } = req.params;

      const post = await prisma.posts.findUnique({
         where: { id: id },
      });

      if (!post) {
         return res.status(404).json({ error: "Post not found" });
      }

      res.status(200).json(post);
   } catch (error: any) {
      res.status(500).json({ error: error.message });
   }
};
