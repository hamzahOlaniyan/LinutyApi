// src/modules/search/search.controller.ts
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
 * GET /search?q=term&limit=10
 * Global search across profiles, lineages, posts.
 */
export async function globalSearch(req: AuthedRequest, res: Response) {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    const limit = Math.min(Number(req.query.limit) || 10, 30);

    if (!q || q.length < 2) {
      return res.status(400).json({ message: "q must be at least 2 characters" });
    }

    const me = await getCurrentProfile(req);

    // --- BLOCK GRAPH (if logged in) ---
    let blockedIds = new Set<string>();
    if (me) {
      const blocks = await prisma.block.findMany({
        where: {
          OR: [{ blockerId: me.id }, { blockedId: me.id }]
        }
      });
      blocks.forEach((b) => {
        blockedIds.add(b.blockerId);
        blockedIds.add(b.blockedId);
      });
    }

    // ----------------------
    // 1) PROFILES
    // ----------------------
    const profiles = await prisma.profile.findMany({
      where: {
        id: me ? { notIn: Array.from(blockedIds) } : undefined,
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { lineageMainSurname: { contains: q, mode: "insensitive" } },
          { lineageRootVillage: { contains: q, mode: "insensitive" } }
        ]
      },
      take: limit,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        lineageMainSurname: true,
        lineageRootVillage: true,
        isVerified: true
      }
    });

    // ----------------------
    // 2) LINEAGES
    // ----------------------
    const lineages = await prisma.lineage.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { primarySurname: { contains: q, mode: "insensitive" } },
          { rootVillage: { contains: q, mode: "insensitive" } },
          { rootRegion: { contains: q, mode: "insensitive" } }
        ]
      },
      take: limit,
      select: {
        id: true,
        name: true,
        type: true,
        primarySurname: true,
        rootVillage: true,
        rootRegion: true,
        createdAt: true
      }
    });

    // ----------------------
    // 3) POSTS (simple text search)
    // ----------------------
    const posts = await prisma.post.findMany({
      where: {
        content: { contains: q, mode: "insensitive" },
        // basic visibility rules (if logged in)
        ...(me
          ? {
              author: {
                id: { notIn: Array.from(blockedIds) }
              }
            }
          : {}),
        visibility: "PUBLIC" // keep it simple: only public posts in global search
      },
      orderBy: { createdAt: "desc" },
      take: limit,
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
        _count: {
          select: {
            comments: true,
            reactions: true
          }
        }
      }
    });

    return res.json({
      query: q,
      profiles,
      lineages,
      posts
    });
  } catch (error) {
    console.error("globalSearch error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
