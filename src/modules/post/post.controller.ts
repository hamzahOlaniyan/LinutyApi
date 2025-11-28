import type { Response } from "express";
import { prisma } from "../../config/prisma";
import type { AuthedRequest } from "../auth/auth.middleware";

export class PostController {
  // POST /posts
  // body: { content?: string, images?: any, media?: any, parentId?: string }
  static async createPost(req: AuthedRequest, res: Response) {
    try {
      const user = req.user; // Supabase user from middleware
      const { content, images, media, parentId } = req.body;

      if (!content && !images && !media) {
        return res
          .status(400)
          .json({ message: "Post must have content or media!" });
      }

      const post = await prisma.posts.create({
        data: {
          content: content ?? null,
          images: images ?? null, // should be JSON-serializable
          media: media ?? null,   // same
          parent_id: parentId ?? null,
          author: user.id         // profiles.id == auth.users.id
        },
        include: {
          profiles: true,
          _count: {
            select: {
              comments: true,
              postLikes: true
            }
          }
        }
      });

      return res.status(201).json(post);
    } catch (err) {
      console.error("createPost error:", err);
      return res.status(500).json({ message: "Something went wrong!" });
    }
  }

  // GET /posts?limit=20&cursor=<created_at ISO>
  // simple feed (newest first)
  static async getFeed(req: AuthedRequest, res: Response) {
    try {
      const limit = Number(req.query.limit) || 20;
      const cursorDate = req.query.cursor
        ? new Date(String(req.query.cursor))
        : null;

      const posts = await prisma.posts.findMany({
        where: cursorDate
          ? { created_at: { lt: cursorDate } }
          : undefined,
        orderBy: { created_at: "desc" },
        take: limit,
        include: {
          profiles: true,
          _count: {
            select: {
              comments: true,
              postLikes: true
            }
          }
        }
      });

      const nextCursor =
        posts.length > 0 ? posts[posts.length - 1].created_at : null;

      return res.json({
        items: posts,
        nextCursor
      });
    } catch (err) {
      console.error("getFeed error:", err);
      return res.status(500).json({ message: "Something went wrong!" });
    }
  }

  // GET /posts/:id
  static async getById(req: AuthedRequest, res: Response) {
    try {
      const { id } = req.params;

      const post = await prisma.posts.findUnique({
        where: { id },
        include: {
          profiles: true,
          comments: {
            orderBy: { created_at: "asc" },
            include: {
              profiles: true
            }
          },
          postLikes: true,
          _count: {
            select: {
              comments: true,
              postLikes: true
            }
          }
        }
      });

      if (!post) {
        return res.status(404).json({ message: "Post not found!" });
      }

      return res.json(post);
    } catch (err) {
      console.error("getById error:", err);
      return res.status(500).json({ message: "Something went wrong!" });
    }
  }

  // POST /posts/:id/like  (toggle like)
  static async toggleLike(req: AuthedRequest, res: Response) {
    try {
      const user = req.user;
      const { id: postId } = req.params;

      // Check post exists
      const post = await prisma.posts.findUnique({ where: { id: postId } });
      if (!post) {
        return res.status(404).json({ message: "Post not found!" });
      }

      // See if user has already liked this post
      const existingLike = await prisma.postLikes.findFirst({
        where: {
          postId,
          userId: user.id
        }
      });

      if (existingLike) {
        await prisma.postLikes.delete({
          where: { id: existingLike.id }
        });

        return res.json({ liked: false });
      } else {
        await prisma.postLikes.create({
          data: {
            postId,
            userId: user.id
          }
        });

        return res.json({ liked: true });
      }
    } catch (err) {
      console.error("toggleLike error:", err);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }

  // DELETE /posts/:id  (only author can delete)
  static async deletePost(req: AuthedRequest, res: Response) {
    try {
      const user = req.user;
      const { id } = req.params;

      const post = await prisma.posts.findUnique({ where: { id } });

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (post.author !== user.id) {
        return res.status(403).json({ message: "Not allowed to delete this post" });
      }

      await prisma.posts.delete({ where: { id } });

      return res.json({ message: "Post deleted" });
    } catch (err) {
      console.error("deletePost error:", err);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
}
