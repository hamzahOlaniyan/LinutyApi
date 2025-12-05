import { Request, Response } from "express";
import { AuthedRequest } from "../auth/auth.middleware";
import { prisma } from "../../config/prisma";
import { ReactionType } from "@prisma/client";
import { NotificationService } from "../notification/notification.service";
import { CreatePostInput } from "./post.validation";
// import type { CreatePostInput } from "./post.validation";


// helper: current profile from Supabase user

export class PostController {

static getCurrentProfile(req: AuthedRequest) {
  const userId = req.user?.id as string | undefined;
  if (!userId) return null;

  return prisma.profile.findUnique({
    where: { userId }
  });
}

/**
 * POST /posts
 * body: {
 *   content?: string;
 *   visibility?: PostVisibility;   // "PUBLIC" | "FOLLOWERS" | "LINEAGE_ONLY" | "PRIVATE"
 *   locationText?: string;
 *   lineageId?: string;
 *   media?: {
 *     url: string;
 *     type: MediaType;             // "IMAGE" | "VIDEO" | ...
 *     mimeType: string;
 *     width?: number;
 *     height?: number;
 *     sizeBytes?: number;
 *   }[];
 * }
 */
// static async createPost(req: AuthedRequest, res: Response) {
//   try {
//     const me = await this.getCurrentProfile(req);
//     if (!me) {
//       return res.status(401).json({ message: "Unauthenticated" });
//     }

//     const {
//       content,
//       visibility = "PUBLIC",
//       locationText,
//       lineageId,
//       media
//     } = req.body as {
//       content?: string;
//       visibility?: "PUBLIC" | "FOLLOWERS" | "LINEAGE_ONLY" | "PRIVATE";
//       locationText?: string;
//       lineageId?: string;
//       media?: {
//         url: string;
//         type: string;
//         mimeType: string;
//         width?: number;
//         height?: number;
//         sizeBytes?: number;
//       }[];
//     };

//     if (!content && (!media || media.length === 0)) {
//       return res.status(400).json({ message: "Post must have content or media" });
//     }

//     const post = await prisma.$transaction(async (tx) => {
//       const createdPost = await tx.post.create({
//         data: {
//           profileId: me.id,
//           content,
//           visibility,
//           locationText,
//           lineageId: lineageId || null
//         }
//       });

//       let mediaFile = null;

//       if (media && media.length > 0) {
//         await tx.mediaFile.createMany({
//           data: media.map((m, index) => ({
//             postId: createdPost.id,
//             type: m.type as any,
//             url: m.url,
//             mimeType: m.mimeType,
//             width: m.width ?? null,
//             height: m.height ?? null,
//             sizeBytes: BigInt(m.sizeBytes ?? 0)
//           }))
//         });
//       }

//       return createdPost;
//     });

//     const fullPost = await prisma.post.findUnique({
//       where: { id: post.id },
//       include: {
//         author: {
//           select: {
//             id: true,
//             username: true,
//             firstName: true,
//             lastName: true,
//             avatarUrl: true,
//             isVerified: true
//           }
//         },
//         mediaFiles: true,
//         lineage: true
//       }
//     });

//     return res.status(201).json(fullPost);
//   } catch (error) {
//     console.error("createPost error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// }

static async  createPost(req: AuthedRequest, res: Response) {
  try {
    const me = await this.getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const body = req.body as CreatePostInput;

    const {
      content,
      visibility = "PUBLIC",
      lineageId,
      video
    } = body;

    // 1) Create the post
    const post = await prisma.post.create({
      data: {
        profileId: me.id,
        content,
        visibility,
        lineageId: lineageId ?? null
      }
    });

    let mediaFile = null;

    // 2) If there is a video, create MediaFile in PROCESSING state and call transcoder
    if (video) {
      mediaFile = await prisma.mediaFile.create({
        data: {
          postId: post.id,
          type: "VIDEO",
          url: "", // will be filled later with HLS master.m3u8 URL
          mimeType: video.mimeType ?? "video/mp4",
          sizeBytes: video.sizeBytes ? BigInt(video.sizeBytes) : BigInt(0),
          width: video.width ?? null,
          height: video.height ?? null,
          // status: "PROCESSING" // if you added MediaStatus enum
        }
      });

      // fire-and-forget call to transcoder
      const transcoderUrl = process.env.TRANSCODER_URL;
      const callbackSecret = process.env.API_CALLBACK_SECRET;

      if (transcoderUrl) {
        // Node 18+ has global fetch; if not, install node-fetch
        fetch(`${transcoderUrl}/transcode`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-linutyauth": callbackSecret ?? ""
          },
          body: JSON.stringify({
            rawObjectName: video.rawObjectName,
            postId: post.id
          })
        }).catch(err => {
          console.error("Error calling transcoder:", err);
        });
      } else {
        console.warn("TRANSCODER_URL is not set; video will never be processed.");
      }
    }

    return res.status(201).json({
      post,
      media: mediaFile
    });
  } catch (err) {
    console.error("createPost error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /posts/:postId
 */
static async getPostById(req: Request, res: Response) {
  try {
    const { postId } = req.params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            isVerified: true
          }
        },
        mediaFiles: true,
        lineage: true
      }
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.json(post);
  } catch (error) {
    console.error("getPostById error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * DELETE /posts/:postId
 * only author can delete
 */
static async deletePost(req: AuthedRequest, res: Response) {
  try {
    const me = await this.getCurrentProfile(req);
    if (!me) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { postId } = req.params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, profileId: true }
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.profileId !== me.id) {
      return res.status(403).json({ message: "Not allowed to delete this post" });
    }

    await prisma.post.delete({ where: { id: postId } });

    return res.status(200).json({ message: "Post deleted" });
  } catch (error) {
    console.error("deletePost error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * PATCH /posts/:postId
 * update content / visibility / locationText
 */
static async updatePost(req: AuthedRequest, res: Response) {
  try {
    const me = await this.getCurrentProfile(req);
    if (!me) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { postId } = req.params;
    const { content, visibility, locationText } = req.body;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, profileId: true }
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.profileId !== me.id) {
      return res.status(403).json({ message: "Not allowed to edit this post" });
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        content,
        visibility,
        locationText
      }
    });

    return res.json(updated);
  } catch (error) {
    console.error("updatePost error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /profiles/:username/posts?limit=20&cursor=<postId>
 * profile posts (for profile page)
 */
static async getProfilePosts(req: Request, res: Response) {
  try {
    const { username } = req.params;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const profile = await prisma.profile.findUnique({
      where: { username },
      select: { id: true }
    });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const posts = await prisma.post.findMany({
      where: { profileId: profile.id },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1
          }
        : {}),
      orderBy: { createdAt: "desc" },
      include: {
        mediaFiles: true
      }
    });

    let nextCursor: string | null = null;
    if (posts.length > limit) {
      const last = posts.pop();
      nextCursor = last?.id ?? null;
    }

    return res.json({
      data: posts,
      nextCursor
    });
  } catch (error) {
    console.error("getProfilePosts error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /feed?limit=20&cursor=<postId>
 * Basic home feed:
 * - posts from people I follow + myself
 * - PLUS PUBLIC posts
 * - PLUS LINEAGE_ONLY posts from my lineages
 * - EXCLUDES people I've blocked / who blocked me
 */
static async getFeed(req: AuthedRequest, res: Response) {
  try {
    const me = await this.getCurrentProfile(req);
    if (!me) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    // who I follow
    const follows = await prisma.follow.findMany({
      where: { followerId: me.id },
      select: { followeeId: true }
    });
    const followeeIds = follows.map(f => f.followeeId);

    // my lineages
    const memberships = await prisma.lineageMembership.findMany({
      where: { profileId: me.id },
      select: { lineageId: true }
    });
    const myLineageIds = memberships.map(m => m.lineageId);

    // blocked relationships
    const blocks = await prisma.block.findMany({
      where: {
        OR: [
          { blockerId: me.id },          // I blocked them
          { blockedId: me.id }           // they blocked me
        ]
      },
      select: { blockerId: true, blockedId: true }
    });

    const blockedProfiles = new Set<string>();
    for (const b of blocks) {
      if (b.blockerId === me.id) blockedProfiles.add(b.blockedId);
      if (b.blockedId === me.id) blockedProfiles.add(b.blockerId);
    }

    // feed query
    const posts = await prisma.post.findMany({
      where: {
        // exclude blocked
        profileId: { notIn: Array.from(blockedProfiles) },
        OR: [
          // from me or people I follow
          { profileId: { in: [me.id, ...followeeIds] } },
          // public
          { visibility: "PUBLIC" },
          // lineage-only from same lineage
          {
            visibility: "LINEAGE_ONLY",
            lineageId: { in: myLineageIds }
          }
        ]
      },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1
          }
        : {}),
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            isVerified: true
          }
        },
        mediaFiles: true,
        lineage: true
      }
    });

    let nextCursor: string | null = null;
    if (posts.length > limit) {
      const last = posts.pop();
      nextCursor = last?.id ?? null;
    }

    return res.json({
      data: posts,
      nextCursor
    });
  } catch (error) {
    console.error("getFeed error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * POST /posts/:postId/react
 * body: { type?: ReactionType } // default LIKE
 */
static async reactToPost(req: AuthedRequest, res: Response) {
  try {
    const me = await this.getCurrentProfile(req);
    if (!me) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { postId } = req.params;
    const { type = "LIKE" } = req.body as { type?: ReactionType };

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const existing = await prisma.postReaction.findUnique({
  where: {
    postId_profileId: {
      postId,
      profileId: me.id
    }
  }
});

    let reaction;

    if (!existing) {
      reaction = await prisma.postReaction.create({
        data: {
          postId,
          profileId: me.id,
          type
        }
      });

      // notify post author on first like
      if (type === "LIKE" && post.profileId !== me.id) {
        await NotificationService.likePost(post.profileId, me.id, postId);
      }
    } else {
      reaction = await prisma.postReaction.update({
        where: { id: existing.id },
        data: { type }
      });
    }


    // const reaction = await prisma.postReaction.upsert({
    //   where: {
    //     postId_profileId: {
    //       postId,
    //       profileId: me.id
    //     }
    //   },
    //   update: { type },
    //   create: {
    //     postId,
    //     profileId: me.id,
    //     type
    //   }
    // });

    // optional: recompute likeCount (only LIKE type)
    const likeCount = await prisma.postReaction.count({
      where: {
        postId,
        type: "LIKE"
      }
    });

    await prisma.post.update({
      where: { id: postId },
      data: { likeCount }
    });

    return res.json({ reaction, likeCount });
  } catch (error) {
    console.error("reactToPost error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * DELETE /posts/:postId/react
 */
static async removePostReaction(req: AuthedRequest, res: Response) {
  try {
    const me = await this.getCurrentProfile(req);
    if (!me) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { postId } = req.params;

    await prisma.postReaction.deleteMany({
      where: {
        postId,
        profileId: me.id
      }
    });

    const likeCount = await prisma.postReaction.count({
      where: {
        postId,
        type: "LIKE"
      }
    });

    await prisma.post.update({
      where: { id: postId },
      data: { likeCount }
    });

    return res.json({ message: "Reaction removed", likeCount });
  } catch (error) {
    console.error("removePostReaction error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * POST /posts/:postId/comments
 * body: { content: string; parentCommentId?: string }
 */
static async addComment(req: AuthedRequest, res: Response) {
  try {
    const me = await this.getCurrentProfile(req);
    if (!me) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { postId } = req.params;
    const { content, parentCommentId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Content is required" });
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          postId,
          profileId: me.id,
          content,
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

    return res.status(201).json(comment);
  } catch (error) {
    console.error("addComment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /posts/:postId/comments?limit=20&cursor=<commentId>
 */
static async getComments(req: Request, res: Response) {
  try {
    const { postId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const comments = await prisma.comment.findMany({
      where: { postId },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1
          }
        : {}),
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
        }
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
    console.error("getComments error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
}
