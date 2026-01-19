// import { Response } from "express";
// import { AuthedRequest } from "../auth/auth.middleware";
// import { prisma } from "../../config/prisma";

import type { AuthedRequest } from "../auth/auth.middleware";
import type { Response } from "express";
import type { Prisma, PostVisibility } from "@prisma/client";
import { prisma } from "../../config/prisma";


async function getCurrentProfile(req: AuthedRequest) {
  const userId = req.user?.id as string | undefined;
  if (!userId) return null;

  return prisma.profile.findUnique({
    where: { userId }
  });
}

/**
 * GET /feed?limit=20&cursor=<postId>
 *
 * Home feed:
 * - my posts
 * - people I follow
 * - (optionally) lineages I belong to
 * - respects visibility + block graph
 */
// export async function getHomeFeed(req: AuthedRequest, res: Response) {
//   try {
//     const me = await getCurrentProfile(req);
//     if (!me) return res.status(401).json({ message: "Unauthenticated" });

//     const limit = Math.min(Number(req.query.limit) || 20, 50);
//     const cursor = req.query.cursor as string | undefined;

//     // who I follow
//     const follows = await prisma.follow.findMany({
//       where: { followerId: me.id },
//       select: { followeeId: true }
//     });
//     const followingIds = follows.map(f => f.followeeId);

//     // lineages I'm in
//     const memberships = await prisma.lineageMembership.findMany({
//       where: { profileId: me.id },
//       select: { lineageId: true }
//     });
//     const lineageIds = memberships.map(m => m.lineageId);

//     // blocks
//     const blocks = await prisma.block.findMany({
//       where: {
//         OR: [{ blockerId: me.id }, { blockedId: me.id }]
//       }
//     });
//     const blockedIds = new Set<string>();
//     blocks.forEach(b => {
//       blockedIds.add(b.blockerId);
//       blockedIds.add(b.blockedId);
//     });

//     // ---------- OR conditions (who's posts we consider) ----------
//     const orCandidates: Prisma.PostWhereInput[] = [
//       { profileId: me.id },
//       { profileId: { in: followingIds } }
//     ];

//     if (lineageIds.length > 0) {
//       orCandidates.push({
//         lineageId: { in: lineageIds }
//       });
//     }

//     // ---------- visibility rules (PUBLIC / FOLLOWERS / LINEAGE / PRIVATE) ----------
//     const visibilityOr: Prisma.PostWhereInput[] = [
//       // public posts
//       { visibility: "PUBLIC" as PostVisibility },

//       // followers-only, and I'm follower or author
//       {
//         visibility: "FOLLOWERS" as PostVisibility,
//         profileId: { in: [...followingIds, me.id] }
//       },

//       // private – only my own
//       {
//         visibility: "PRIVATE" as PostVisibility,
//         profileId: me.id
//       }
//     ];

//     if (lineageIds.length > 0) {
//       visibilityOr.push({
//         visibility: "LINEAGE_ONLY" as PostVisibility,
//         lineageId: { in: lineageIds }
//       });
//     }

//     const posts = await prisma.post.findMany({
//       take: limit + 1,
//       ...(cursor
//         ? {
//             cursor: { id: cursor },
//             skip: 1
//           }
//         : {}),
//       where: {
//         profileId: { notIn: Array.from(blockedIds) },
//         OR: orCandidates,
//         AND: [
//          {
//       OR: [
//         // PUBLIC from anyone
//         { visibility: "PUBLIC" },

//         // Otherwise, restrict to candidates (me/following/lineage)
//         {
//           OR: orCandidates,
//           AND: [{ OR: visibilityOr }],
//         }
//       ]
//     }
//         ]
//       },
//       orderBy: { createdAt: "desc" },
//       include: {
//         author: {
//           select: {
//             id: true,
//             username: true,
//             firstName: true,
//             lastName: true,
//             avatarUrl: true
//           }
//         },
//         mediaFiles: true,
//         lineage: {
//           select: {
//             id: true,
//             name: true,
//             primarySurname: true,
//             rootVillage: true
//           }
//         },
//         _count: {
//           select: {
//             comments: true,
//             reactions: true
//           }
//         }
//       }
//     });

//     let nextCursor: string | null = null;
//     if (posts.length > limit) {
//       const last = posts.pop();
//       nextCursor = last?.id ?? null;
//     }

//     // BigInt → number for JSON (if needed)
//     const serialized = posts.map(p => ({
//       ...p,
//       mediaFiles: p.mediaFiles.map(m => ({
//         ...m,
//         sizeBytes: m.sizeBytes ? Number(m.sizeBytes) : 0
//       }))
//     }));

//     return res.json({
//       data: serialized,
//       nextCursor 
//     });
//   } catch (error) {
//     console.error("getHomeFeed error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// }


export async function getHomeFeed(req: AuthedRequest, res: Response) {
  try {

    const DEFAULT_LIMIT = 10;
    const MAX_LIMIT = 30;

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = (req.query.cursor as string | undefined) || undefined;

    // Optional filters (you can expand later)
    const authorId = (req.query.authorId as string | undefined) || undefined;
    // const lineageId = (req.query.lineageId as string | undefined) || undefined;
    const visibility = (req.query.visibility as string | undefined) || undefined;

    const where: Prisma.PostWhereInput = {
      ...(authorId ? { profileId: authorId } : {}),
      // ...(lineageId ? { lineageId } : {}),
      ...(visibility ? { visibility: visibility as any } : {})
    };

    const posts = await prisma.post.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where,
      select:{
        id:true,
        profileId:true,
        content:true,
        visibility:true,
        likeCount:true,
        commentCount:true,
        author:{select:{id:true, fullName:true, avatarUrl:true,username:true}},
        mediaFiles: true,
        createdAt:true,
        _count:{ select: { comments:{where: {parentCommentId:null}} , reactions: true } }
        
      },
      orderBy: { createdAt: "desc" },
    });
     const postIds = posts.map(p => p.id);

     const counts = await prisma.comment.groupBy({
        by: ["postId"],
        where: {
          postId: { in: postIds },
          parentCommentId: null,
        },
        _count: { _all: true },
      });

      const topLevelCountByPostId = new Map(
        counts.map(c => [c.postId, c._count._all])
      );

    let nextCursor: string | null = null;
    if (posts.length > limit) {
      const last = posts.pop();
      nextCursor = last?.id ?? null;
    }

    // BigInt safe serialization
    const result = posts.map(p => ({
      ...p,
      mediaFiles: p?.mediaFiles.map(m => ({
        ...m,
        sizeBytes: m.sizeBytes ? Number(m.sizeBytes) : 0
      })),
      reactionCount: p._count.reactions,
      topLevelCommentCount: topLevelCountByPostId.get(p.id) ?? 0,
    }));

    return res.json({ data: result, nextCursor });
  } catch (error) {
    console.error("getAllPostsFeed error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}