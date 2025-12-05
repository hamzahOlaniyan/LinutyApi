import { Response } from "express";
import { AuthedRequest } from "../auth/auth.middleware";
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
export async function getHomeFeed(req: AuthedRequest, res: Response) {
  try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    // who I follow
    const follows = await prisma.follow.findMany({
      where: { followerId: me.id },
      select: { followeeId: true }
    });
    const followingIds = follows.map((f) => f.followeeId);

    // lineages I'm in
    const memberships = await prisma.lineageMembership.findMany({
      where: { profileId: me.id },
      select: { lineageId: true }
    });
    const lineageIds = memberships.map((m) => m.lineageId);

    // who is blocked (either direction) – keep it simple
    const blocks = await prisma.block.findMany({
      where: {
        OR: [{ blockerId: me.id }, { blockedId: me.id }]
      }
    });
    const blockedIds = new Set<string>();
    blocks.forEach((b) => {
      blockedIds.add(b.blockerId);
      blockedIds.add(b.blockedId);
    });

    const posts = await prisma.post.findMany({
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1
          }
        : {}),
      where: {
        // don't show blocked users' posts
        profileId: { notIn: Array.from(blockedIds) },

        // base candidates: me, people I follow, lineages I'm in
        OR: [
          { profileId: me.id },
          { profileId: { in: followingIds } },
          {
            lineageId: {
              in: lineageIds.length > 0 ? lineageIds : ["__none__"] // hack to avoid empty IN
            }
          }
        ],

        // visibility rules
        AND: [
          {
            OR: [
              // public posts
              { visibility: "PUBLIC" },

              // followers-only, and I'm a follower or the author
              {
                visibility: "FOLLOWERS",
                profileId: { in: [...followingIds, me.id] }
              },

              // lineage-only, and we share the lineage
              {
                visibility: "LINEAGE_ONLY",
                lineageId: {
                  in: lineageIds.length > 0 ? lineageIds : ["__none__"]
                }
              },

              // private – only show my own
              {
                visibility: "PRIVATE",
                profileId: me.id
              }
            ]
          }
        ]
      },
      orderBy: { createdAt: "desc" },
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
        mediaFiles: true,
        lineage: {
          select: {
            id: true,
            name: true,
            primarySurname: true,
            rootVillage: true
          }
        },
        _count: {
          select: {
            comments: true,
            reactions: true
          }
        }
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
    console.error("getHomeFeed error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
