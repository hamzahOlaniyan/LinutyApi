"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostController = void 0;
const prisma_1 = require("../../config/prisma");
const notification_service_1 = require("../notification/notification.service");
function toJsonMedia(m) {
    return {
        ...m,
        sizeBytes: m.sizeBytes ? Number(m.sizeBytes) : 0
    };
}
async function getCurrentProfile(req) {
    const userId = req.user?.id;
    if (!userId)
        return null;
    return prisma_1.prisma.profile.findUnique({
        where: { userId }
    });
}
class PostController {
    /**
     * POST /posts/
     */
    static async createPost(req, res) {
        try {
            const me = await getCurrentProfile(req);
            if (!me)
                return res.status(401).json({ message: "Unauthenticated" });
            const body = req.body;
            const { content, images } = req.body;
            if (!content?.trim() && (!images || images.length === 0)) {
                return res.status(400).json({ message: "Post must have content or images" });
            }
            // 1) Create the post
            const post = await prisma_1.prisma.post.create({
                data: {
                    profileId: me.id,
                    content: content?.trim() || null
                }
            });
            let imageMedia = [];
            if (images?.length) {
                imageMedia = await prisma_1.prisma.$transaction(images.map((img) => prisma_1.prisma.mediaFile.create({
                    data: {
                        postId: post.id,
                        type: "IMAGE",
                        url: img.url,
                        mimeType: img.mimeType ?? "image/jpeg",
                        sizeBytes: img.sizeBytes ?? 0, // IMPORTANT if your schema uses BigInt
                        width: img.width ?? null,
                        height: img.height ?? null
                    }
                })));
            }
            // let mediaFile = null;
            // 2) If there is a video, create MediaFile in PROCESSING state and call transcoder
            // if (video) {
            //   mediaFile = await prisma.mediaFile.create({
            //     data: {
            //       postId: post.id,
            //       type: "VIDEO",
            //       url: "", // will be filled later with HLS master.m3u8 URL
            //       mimeType: video.mimeType ?? "video/mp4",
            //       sizeBytes: video.sizeBytes ? BigInt(video.sizeBytes) : BigInt(0),
            //       width: video.width ?? null,
            //       height: video.height ?? null,
            //       // status: "PROCESSING" // if you added MediaStatus enum
            //     }
            //   });
            //   // fire-and-forget call to transcoder
            //   const transcoderUrl = process.env.TRANSCODER_URL;
            //   const callbackSecret = process.env.API_CALLBACK_SECRET;
            //   if (transcoderUrl) {
            //     // Node 18+ has global fetch; if not, install node-fetch
            //     fetch(`${transcoderUrl}/transcode`, {
            //       method: "POST",
            //       headers: {
            //         "Content-Type": "application/json",
            //         "x-linutyauth": callbackSecret ?? ""
            //       },
            //       body: JSON.stringify({
            //         rawObjectName: video.rawObjectName,
            //         postId: post.id
            //       })
            //     }).catch(err => {
            //       console.error("Error calling transcoder:", err);
            //     });
            //   } else {
            //     console.warn("TRANSCODER_URL is not set; video will never be processed.");
            //   }
            // }
            return res.status(201).json({
                data: post,
                images: imageMedia.map(toJsonMedia),
                message: "Post created successfully"
            });
        }
        catch (err) {
            console.error("createPost error:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
    static async getPostById(req, res) {
        try {
            const { postId } = req.params;
            const post = await prisma_1.prisma.post.findUnique({
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
                }
            });
            if (!post) {
                return res.status(404).json({ message: "Post not found" });
            }
            return res.status(200).json(post);
        }
        catch (error) {
            console.error("getPostById error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
    static async getPostCreatorId(req, res) {
        const me = await getCurrentProfile(req);
        if (!me)
            return res.status(401).json({ message: "Unauthenticated" });
        try {
            const { postId } = req.params;
            const post = await prisma_1.prisma.post.findUnique({
                where: { id: postId },
                select: { profileId: true }
            });
            if (!post) {
                return res.status(404).json({ message: "Post not found" });
            }
            return res.status(200).json(post);
        }
        catch (error) {
            console.error("getPostById error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
    static async reactToPost(req, res) {
        try {
            const me = await getCurrentProfile(req);
            if (!me)
                return res.status(401).json({ message: "Unauthenticated" });
            const { postId } = req.params;
            const { type = "LIKE" } = req.body;
            const post = await prisma_1.prisma.post.findUnique({
                where: { id: postId },
                select: { id: true, profileId: true }
            });
            if (!post)
                return res.status(404).json({ message: "Post not found" });
            const isSelf = post.profileId === me.id;
            const existing = await prisma_1.prisma.postReaction.findUnique({
                where: {
                    postId_profileId: { postId, profileId: me.id }
                }
            });
            // 1) No reaction -> create + increment + notify
            if (!existing) {
                const reaction = await prisma_1.prisma.$transaction(async (tx) => {
                    const created = await tx.postReaction.create({
                        data: { postId, profileId: me.id, type }
                    });
                    await tx.post.update({
                        where: { id: postId },
                        data: { likeCount: { increment: 1 } }
                    });
                    // ✅ Notification (not in tx unless your service accepts tx)
                    return created;
                });
                if (!isSelf) {
                    // prevent duplicates if user taps fast, etc.
                    await prisma_1.prisma.notification.deleteMany({
                        where: {
                            recipientId: post.profileId,
                            senderId: me.id,
                            type: "LIKE",
                            postId
                        }
                    });
                    await notification_service_1.NotificationService.likePost(post.profileId, me.id, postId);
                }
                return res.status(201).json({
                    message: "Reaction added",
                    reacted: true,
                    reaction
                });
            }
            // 2) Same type -> toggle off + decrement + delete notif
            if (existing.type === type) {
                await prisma_1.prisma.$transaction(async (tx) => {
                    await tx.postReaction.delete({ where: { id: existing.id } });
                    await tx.post.update({
                        where: { id: postId },
                        data: { likeCount: { decrement: 1 } }
                    });
                    if (!isSelf) {
                        await tx.notification.deleteMany({
                            where: {
                                recipientId: post.profileId,
                                senderId: me.id,
                                type: "LIKE",
                                postId
                            }
                        });
                    }
                });
                return res.json({
                    message: "Reaction removed",
                    reacted: false
                });
            }
            // 3) Different type -> update (no count change) + ensure notif exists
            const reaction = await prisma_1.prisma.postReaction.update({
                where: { id: existing.id },
                data: { type }
            });
            if (!isSelf) {
                // Ensure at least one LIKE notification exists (no duplicates)
                const existingNotif = await prisma_1.prisma.notification.findFirst({
                    where: {
                        recipientId: post.profileId,
                        senderId: me.id,
                        type: "LIKE",
                        postId
                    },
                    select: { id: true }
                });
                if (!existingNotif) {
                    await notification_service_1.NotificationService.likePost(post.profileId, me.id, postId);
                }
            }
            return res.json({
                message: "Reaction updated",
                reacted: true,
                reaction
            });
        }
        catch (error) {
            console.error("reactToPost error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
    static async getMyPostReaction(req, res) {
        try {
            const me = await getCurrentProfile(req);
            if (!me)
                return res.status(401).json({ message: "Unauthenticated" });
            const { postId } = req.params;
            const reaction = await prisma_1.prisma.postReaction.findUnique({
                where: {
                    postId_profileId: {
                        postId,
                        profileId: me.id
                    }
                },
                select: { type: true }
            });
            return res.json({
                liked: !!reaction,
                type: reaction?.type ?? null
            });
        }
        catch (err) {
            console.error("getMyPostReaction error:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
    static async getReactions(req, res) {
        try {
            const me = await getCurrentProfile(req);
            if (!me)
                return res.status(401).json({ message: "Unauthenticated" });
            const { postId } = req.params;
            const reaction = await prisma_1.prisma.postReaction.findMany({
                where: { postId: postId },
                include: { profile: { select: { id: true, fullName: true, avatarUrl: true,
                            username: true
                        } } }
            });
            return res.status(200).json(reaction);
        }
        catch (err) {
            console.error("getMyPostReaction error:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
    static async deletePost(req, res) {
        try {
            const me = await getCurrentProfile(req);
            if (!me) {
                return res.status(401).json({ message: "Unauthenticated" });
            }
            const { postId } = req.params;
            const post = await prisma_1.prisma.post.findUnique({
                where: { id: postId },
                select: { id: true, profileId: true }
            });
            if (!post) {
                return res.status(404).json({ message: "Post not found" });
            }
            if (post.profileId !== me.id) {
                return res.status(403).json({ message: "Not allowed to delete this post" });
            }
            await prisma_1.prisma.post.delete({ where: { id: postId } });
            return res.status(200).json({ message: "Post deleted " });
        }
        catch (error) {
            console.error("deletePost error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
    /**
     * PATCH /posts/:postId
     * update content / visibility / locationText
     */
    // static async updatePost(req: AuthedRequest, res: Response) {
    //     try {
    //       const me = await getCurrentProfile(req);
    //       if (!me) {
    //         return res.status(401).json({ message: "Unauthenticated" });
    //       }
    //       const { postId } = req.params;
    //       const { content } = req.body;
    //       const post = await prisma.post.findUnique({
    //         where: { id: postId },
    //         select: { id: true, profileId: true }
    //       });
    //       if (!post) {
    //         return res.status(404).json({ message: "Post not found" });
    //       }
    //       if (post.profileId !== me.id) {
    //         return res.status(403).json({ message: "Not allowed to edit this post" });
    //       }
    //       const updated = await prisma.post.update({
    //         where: { id: postId },
    //         data: {
    //           content
    //         }
    //       });
    //       return res.json(updated);
    //     } catch (error) {
    //       console.error("updatePost error:", error);
    //       return res.status(500).json({ message: "Internal server error" });
    //     }
    // }
    static async updatePostContent(req, res) {
        try {
            const me = await getCurrentProfile(req);
            if (!me)
                return res.status(401).json({ message: "Unauthenticated" });
            const { postId } = req.params;
            const { content } = req.body;
            const post = await prisma_1.prisma.post.findUnique({ where: { id: postId } });
            if (!post)
                return res.status(404).json({ message: "Post not found" });
            if (post.profileId !== me.id)
                return res.status(403).json({ message: "Forbidden" });
            const updated = await prisma_1.prisma.post.update({
                where: { id: postId },
                data: { content: content?.trim() || null }
            });
            return res.status(200).json(updated);
        }
        catch (error) {
            console.log("failed to update post ❌", error);
            return res.status(500).json({ message: "Server error" });
        }
    }
    static async addPostMedia(req, res) {
        try {
            const me = await getCurrentProfile(req);
            if (!me)
                return res.status(401).json({ message: "Unauthenticated" });
            const { postId } = req.params;
            const { images } = req.body;
            if (!images?.length) {
                return res.status(400).json({ message: "No images provided" });
            }
            // optional: verify post exists (and belongs to user)
            const post = await prisma_1.prisma.post.findUnique({ where: { id: postId } });
            if (!post)
                return res.status(404).json({ message: "Post not found" });
            if (post.profileId !== me.id)
                return res.status(403).json({ message: "Forbidden" });
            const created = await prisma_1.prisma.$transaction(images.map((img) => prisma_1.prisma.mediaFile.create({
                data: {
                    postId,
                    type: "IMAGE",
                    url: img.url,
                    mimeType: img.mimeType ?? "image/jpeg",
                    sizeBytes: img.sizeBytes ?? 0,
                    width: img.width ?? null,
                    height: img.height ?? null
                }
            })));
            return res.status(201).json(created);
        }
        catch (error) {
            console.log("failed to add post media ❌", error);
            return res.status(500).json({ message: "Server error" });
        }
    }
    static async getMediaByPostId(req, res) {
        try {
            const me = await getCurrentProfile(req);
            if (!me)
                return res.status(401).json({ message: "Unauthenticated" });
            const { postId } = req.params;
            const post = await prisma_1.prisma.post.findUnique({ where: { id: postId } });
            if (!post)
                return res.status(404).json({ message: "Post not found" });
            // if (post.profileId !== me.id) return res.status(403).json({ message: "Forbidden" });
            const media = await prisma_1.prisma.mediaFile.findMany({ where: { postId }, });
            if (!media)
                return res.status(404).json({ message: "Media not found" });
            return res.status(200).json(media);
        }
        catch (error) {
            console.log("failed to delete media ❌", error);
            return res.status(500).json({ message: "Server error" });
        }
    }
    static async deleteMedia(req, res) {
        try {
            const me = await getCurrentProfile(req);
            if (!me)
                return res.status(401).json({ message: "Unauthenticated" });
            const { mediaId } = req.params; // ✅ correct param name
            if (!mediaId)
                return res.status(400).json({ message: "mediaId is required" });
            const media = await prisma_1.prisma.mediaFile.findUnique({ where: { id: mediaId } });
            if (!media)
                return res.status(404).json({ message: "Media not found" });
            const post = await prisma_1.prisma.post.findUnique({ where: { id: media.postId } });
            if (!post || post.profileId !== me.id) {
                return res.status(403).json({ message: "Forbidden" });
            }
            await prisma_1.prisma.mediaFile.delete({ where: { id: mediaId } });
            return res.status(204).send();
        }
        catch (error) {
            console.log("failed to delete media ❌", error);
            return res.status(500).json({ message: "Server error" });
        }
    }
}
exports.PostController = PostController;
// /**
//  * GET /profiles/:username/posts?limit=20&cursor=<postId>
//  * profile posts (for profile page)
//  */
// static async getProfilePosts(req: Request, res: Response) {
//   try {
//     const { username } = req.params;
//     const limit = Math.min(Number(req.query.limit) || 20, 50);
//     const cursor = req.query.cursor as string | undefined;
//     const profile = await prisma.profile.findUnique({
//       where: { username },
//       select: { id: true }
//     });
//     if (!profile) {
//       return res.status(404).json({ message: "Profile not found" });
//     }
//     const posts = await prisma.post.findMany({
//       where: { profileId: profile.id },
//       take: limit + 1,
//       ...(cursor
//         ? {
//             cursor: { id: cursor },
//             skip: 1
//           }
//         : {}),
//       orderBy: { createdAt: "desc" },
//       include: {
//         mediaFiles: true
//       }
//     });
//     let nextCursor: string | null = null;
//     if (posts.length > limit) {
//       const last = posts.pop();
//       nextCursor = last?.id ?? null;
//     }
//     return res.json({
//       data: posts,
//       nextCursor
//     });
//   } catch (error) {
//     console.error("getProfilePosts error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// }
// /**
//  * GET /feed?limit=20&cursor=<postId>
//  * Basic home feed:
//  * - posts from people I follow + myself
//  * - PLUS PUBLIC posts
//  * - PLUS LINEAGE_ONLY posts from my lineages
//  * - EXCLUDES people I've blocked / who blocked me
//  */
// static async getFeed(req: AuthedRequest, res: Response) {
//   try {
//     const me = await this.getCurrentProfile(req);
//     if (!me) {
//       return res.status(401).json({ message: "Unauthenticated" });
//     }
//     const limit = Math.min(Number(req.query.limit) || 20, 50);
//     const cursor = req.query.cursor as string | undefined;
//     // who I follow
//     const follows = await prisma.follow.findMany({
//       where: { followerId: me.id },
//       select: { followeeId: true }
//     });
//     const followeeIds = follows.map(f => f.followeeId);
//     // my lineages
//     const memberships = await prisma.lineageMembership.findMany({
//       where: { profileId: me.id },
//       select: { lineageId: true }
//     });
//     const myLineageIds = memberships.map(m => m.lineageId);
//     // blocked relationships
//     const blocks = await prisma.block.findMany({
//       where: {
//         OR: [
//           { blockerId: me.id },          // I blocked them
//           { blockedId: me.id }           // they blocked me
//         ]
//       },
//       select: { blockerId: true, blockedId: true }
//     });
//     const blockedProfiles = new Set<string>();
//     for (const b of blocks) {
//       if (b.blockerId === me.id) blockedProfiles.add(b.blockedId);
//       if (b.blockedId === me.id) blockedProfiles.add(b.blockerId);
//     }
//     // feed query
//     const posts = await prisma.post.findMany({
//       where: {
//         // exclude blocked
//         profileId: { notIn: Array.from(blockedProfiles) },
//         OR: [
//           // from me or people I follow
//           { profileId: { in: [me.id, ...followeeIds] } },
//           // public
//           { visibility: "PUBLIC" },
//           // lineage-only from same lineage
//           {
//             visibility: "LINEAGE_ONLY",
//             lineageId: { in: myLineageIds }
//           }
//         ]
//       },
//       take: limit + 1,
//       ...(cursor
//         ? {
//             cursor: { id: cursor },
//             skip: 1
//           }
//         : {}),
//       orderBy: { createdAt: "desc" },
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
//     let nextCursor: string | null = null;
//     if (posts.length > limit) {
//       const last = posts.pop();
//       nextCursor = last?.id ?? null;
//     }
//     return res.json({
//       data: posts,
//       nextCursor
//     });
//   } catch (error) {
//     console.error("getFeed error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// }
/**
 * POST /posts/:postId/react
 * body: { type?: ReactionType } // default LIKE
 */
// static async reactToPost(req: AuthedRequest, res: Response) {
//   try {
//     const me = await getCurrentProfile(req);
//     if (!me) {
//       return res.status(401).json({ message: "Unauthenticated" });
//     }
//     const { postId } = req.params;
//     const { type = "LIKE" } = req.body as { type?: ReactionType };
//     const post = await prisma.post.findUnique({ where: { id: postId } });
//     if (!post) {
//       return res.status(404).json({ message: "Post not found" });
//     }
//     // const existing = await prisma.postReaction.findUnique({
//     //   where: {
//     //     postId_profileId: {
//     //       postId,
//     //       profileId: me.id
//     //     }
//     //   }})
//   // }
// }
//     let reaction;
//     if (!existing) {
//       reaction = await prisma.postReaction.create({
//         data: {
//           postId,
//           profileId: me.id,
//           type
//         }
//       });
//       // notify post author on first like
//       if (type === "LIKE" && post.profileId !== me.id) {
//         await NotificationService.likePost(post.profileId, me.id, postId);
//       }
//     } else {
//       reaction = await prisma.postReaction.update({
//         where: { id: existing.id },
//         data: { type }
//       });
//     }
//     // const reaction = await prisma.postReaction.upsert({
//     //   where: {
//     //     postId_profileId: {
//     //       postId,
//     //       profileId: me.id
//     //     }
//     //   },
//     //   update: { type },
//     //   create: {
//     //     postId,
//     //     profileId: me.id,
//     //     type
//     //   }
//     // });
//     // optional: recompute likeCount (only LIKE type)
//     const likeCount = await prisma.postReaction.count({
//       where: {
//         postId,
//         type: "LIKE"
//       }
//     });
//     await prisma.post.update({
//       where: { id: postId },
//       data: { likeCount }
//     });
//     return res.json({ reaction, likeCount });
//   } catch (error) {
//     console.error("reactToPost error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// }
// /**
//  * DELETE /posts/:postId/react
//  */
// static async removePostReaction(req: AuthedRequest, res: Response) {
//   try {
//     const me = await this.getCurrentProfile(req);
//     if (!me) {
//       return res.status(401).json({ message: "Unauthenticated" });
//     }
//     const { postId } = req.params;
//     await prisma.postReaction.deleteMany({
//       where: {
//         postId,
//         profileId: me.id
//       }
//     });
//     const likeCount = await prisma.postReaction.count({
//       where: {
//         postId,
//         type: "LIKE"
//       }
//     });
//     await prisma.post.update({
//       where: { id: postId },
//       data: { likeCount }
//     });
//     return res.json({ message: "Reaction removed", likeCount });
//   } catch (error) {
//     console.error("removePostReaction error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// }
// /**
//  * POST /posts/:postId/comments
//  * body: { content: string; parentCommentId?: string }
//  */
// static async addComment(req: AuthedRequest, res: Response) {
//   try {
//     const me = await this.getCurrentProfile(req);
//     if (!me) {
//       return res.status(401).json({ message: "Unauthenticated" });
//     }
//     const { postId } = req.params;
//     const { content, parentCommentId } = req.body;
//     if (!content || !content.trim()) {
//       return res.status(400).json({ message: "Content is required" });
//     }
//     const post = await prisma.post.findUnique({ where: { id: postId } });
//     if (!post) {
//       return res.status(404).json({ message: "Post not found" });
//     }
//     const comment = await prisma.$transaction(async (tx) => {
//       const created = await tx.comment.create({
//         data: {
//           postId,
//           profileId: me.id,
//           content,
//           parentCommentId: parentCommentId || null
//         },
//         include: {
//           author: {
//             select: {
//               id: true,
//               username: true,
//               firstName: true,
//               lastName: true,
//               avatarUrl: true
//             }
//           }
//         }
//       });
//       const commentCount = await tx.comment.count({
//         where: { postId }
//       });
//       await tx.post.update({
//         where: { id: postId },
//         data: { commentCount }
//       });
//       return created;
//     });
//     return res.status(201).json(comment);
//   } catch (error) {
//     console.error("addComment error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// }
// /**
//  * GET /posts/:postId/comments?limit=20&cursor=<commentId>
//  */
// static async getComments(req: Request, res: Response) {
//   try {
//     const { postId } = req.params;
//     const limit = Math.min(Number(req.query.limit) || 20, 50);
//     const cursor = req.query.cursor as string | undefined;
//     const comments = await prisma.comment.findMany({
//       where: { postId },
//       take: limit + 1,
//       ...(cursor
//         ? {
//             cursor: { id: cursor },
//             skip: 1
//           }
//         : {}),
//       orderBy: { createdAt: "asc" },
//       include: {
//         author: {
//           select: {
//             id: true,
//             username: true,
//             firstName: true,
//             lastName: true,
//             avatarUrl: true
//           }
//         }
//       }
//     });
//     let nextCursor: string | null = null;
//     if (comments.length > limit) {
//       const last = comments.pop();
//       nextCursor = last?.id ?? null;
//     }
//     return res.json({
//       data: comments,
//       nextCursor
//     });
//   } catch (error) {
//     console.error("getComments error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
