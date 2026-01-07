// src/modules/comment/comment.controller.ts
import { Request, Response } from "express";
import { AuthedRequest } from "../auth/auth.middleware";
import { NotificationService } from "../notification/notification.service";
import { prisma } from "../../config/prisma";
import { id } from "zod/v4/locales";


// helper: current profile
async function getCurrentProfile(req: AuthedRequest) {
  const userId = req.user?.id as string | undefined;
  if (!userId) return null;

  return prisma.profile.findUnique({
    where: { userId }
  });
}

/**
 * POST /posts/:postId/comments
 * body: { content: string; parentCommentId?: string }
 */
export async function createComment(req: AuthedRequest, res: Response) {
  try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const { postId } = req.params;
    const { content, parentCommentId } = req.body as {
      content: string;
      parentCommentId?: string;
    };

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Content is required" });
    }

    if (parentCommentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentCommentId },
        select: { id: true, postId: true, parentCommentId: true }
      });

      // ✅ parent must exist and belong to this post
      if (!parent || parent.postId !== postId) {
        return res.status(400).json({ message: "Invalid parentId" });
      }

      // ✅ one-level replies only
      if (parent.parentCommentId) {
        return res
          .status(400)
          .json({ message: "Only one level of replies allowed" });
      }
    }

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          postId,
          profileId: me.id,
          content: content.trim(),
          parentCommentId: parentCommentId || null
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatarUrl: true
            }
          }
        }
      });

      const commentCount = await tx.comment.count({
        where: { postId }
      });

      await tx.post.update({
        where: { id: postId },
        data: { commentCount }
      });

      return created;
    });

    if (post.profileId !== me.id) {
      await NotificationService.comment(post.profileId, me.id, postId, comment.id);
    }

    return res.status(201).json(comment);
  } catch (error) {
    console.error("createComment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /posts/:postId/comments?limit=20&cursor=<commentId>
 */
export async function getPostComments(req: Request, res: Response) {
  try {
    const { postId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const comments = await prisma.comment.findMany({
      where: { postId },
      // take: limit + 1,
      // ...(cursor
      //   ? {
      //       cursor: { id: cursor },
      //       skip: 1
      //     }
      //   : {}),
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        },
        // replies: {
        //   take: 3, // preview
        //   orderBy: { createdAt: "asc" }
        // }
      }
    });

    let nextCursor: string | null = null;
    if (comments.length > limit) {
      const last = comments.pop();
      nextCursor = last?.id ?? null;
    }

    return res.json({
      data: comments,
      nextCursor
    });
  } catch (error) {
    console.error("getPostComments error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getCommentReplies(req: AuthedRequest, res: Response) {
  try {
    const commentId = req.params.commentId;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

     const parent = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true }
    });

    const count = await prisma.comment.count({
      where: { parentCommentId: commentId }
    });

    const replies = await prisma.comment.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where: { parentCommentId: commentId },
      orderBy: { createdAt: "asc" }, // replies read nicely oldest→newest
      include: {
        author: {
          select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true }
        }
      }
    });

    let nextCursor: string | null = null;
    if (replies.length > limit) nextCursor = replies.pop()?.id ?? null;

    return res.json({ data: replies, nextCursor });
  } catch (e) {
    console.error("getCommentReplies error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}


/**
 * PATCH /comments/:commentId
 * body: { content: string }
 */
export async function updateComment(req: AuthedRequest, res: Response) {
  try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const { commentId } = req.params;
    const { content } = req.body as { content: string };

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Content is required" });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, profileId: true }
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.profileId !== me.id) {
      return res.status(403).json({ message: "Not allowed to edit this comment" });
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content: content.trim() }
    });

    return res.json(updated);
  } catch (error) {
    console.error("updateComment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * DELETE /comments/:commentId
 */
export async function deleteComment(req: AuthedRequest, res: Response) {
  try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const { commentId } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, profileId: true, postId: true }
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.profileId !== me.id) {
      return res.status(403).json({ message: "Not allowed to delete this comment" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.comment.delete({ where: { id: commentId } });

      const commentCount = await tx.comment.count({
        where: { postId: comment.postId }
      });

      await tx.post.update({
        where: { id: comment.postId },
        data: { commentCount }
      });
    });

    return res.json({ message: "Comment deleted" });
  } catch (error) {
    console.error("deleteComment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * POST /comments/:commentId/react
 * body: { type?: ReactionType } // default LIKE
 */
export async function reactToComment(req: AuthedRequest, res: Response) {
  try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const { commentId } = req.params;
    const { type = "LIKE" } = req.body as { type?: "LIKE" | "LOVE" | "LAUGH" | "ANGRY" | "SAD" };

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, postId: true, profileId: true }
    });
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const isSelf = comment.profileId === me.id;

    const existing = await prisma.commentReaction.findUnique({
      where: {
        commentId_profileId: {
          commentId,
          profileId: me.id
        }
      }
    });

    // 1) create
    if (!existing) {
      const reaction = await prisma.$transaction(async (tx) => {
        const created = await tx.commentReaction.create({
          data: { commentId, profileId: me.id, type }
        });

        await tx.comment.update({
          where: { id: commentId },
          data: { likeCount: { increment: 1 } }
        });

        if (!isSelf) {
          await tx.notification.create({
            data: {
              recipientId: comment.profileId,
              senderId: me.id,
              type: "LIKE",
              postId: comment.postId,
              commentId
            }
          });
        }

        return created;
      });

      return res.status(201).json({ message: "Reaction added", reacted: true, reaction });
    }

    // 2) toggle off
    if (existing.type === type) {
      await prisma.$transaction(async (tx) => {
        await tx.commentReaction.delete({ where: { id: existing.id } });

        await tx.comment.update({
          where: { id: commentId },
          data: { likeCount: { decrement: 1 } }
        });

        if (!isSelf) {
          await tx.notification.deleteMany({
            where: {
              recipientId: comment.profileId,
              senderId: me.id,
              type: "LIKE",
              commentId
            }
          });
        }
      });

      return res.json({ message: "Reaction removed", reacted: false });
    }

    // 3) update type
    const reaction = await prisma.commentReaction.update({
      where: { id: existing.id },
      data: { type }
    });

    // ensure notif exists (avoid duplicates)
    if (!isSelf) {
      const notif = await prisma.notification.findFirst({
        where: {
          recipientId: comment.profileId,
          senderId: me.id,
          type: "LIKE",
          commentId
        },
        select: { id: true }
      });

      if (!notif) {
        await NotificationService.likeComment(comment.profileId, me.id, comment.postId, commentId);
      }
    }

    return res.json({ message: "Reaction updated", reacted: true, reaction });
  } catch (e) {
    console.error("reactToComment error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function  getMyCommentReaction(req: AuthedRequest, res: Response) {
  try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const { commentId } = req.params;

    const reaction = await prisma.commentReaction.findUnique({
      where: {
        commentId_profileId: {
          commentId,
          profileId: me.id
        }
      },
      select: { type: true }
    });

    return res.json({
      liked: !!reaction,
      type: reaction?.type ?? null
    });
  } catch (err) {
    console.error("getMyPostReaction error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * DELETE /comments/:commentId/react
 */
export async function removeCommentReaction(req: AuthedRequest, res: Response) {
  try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const { commentId } = req.params;

    await prisma.commentReaction.deleteMany({
      where: {
        commentId,
        profileId: me.id
      }
    });

    const likeCount = await prisma.commentReaction.count({
      where: {
        commentId,
        type: "LIKE"
      }
    });

    await prisma.comment.update({
      where: { id: commentId },
      data: { likeCount }
    });

    return res.json({ message: "Reaction removed", likeCount });
  } catch (error) {
    console.error("removeCommentReaction error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}


