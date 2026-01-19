"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalSearch = globalSearch;
const prisma_1 = require("../../config/prisma");
async function getCurrentProfile(req) {
    const userId = req.user?.id;
    if (!userId)
        return null;
    return prisma_1.prisma.profile.findUnique({
        where: { userId }
    });
}
/**
 * GET /search?q=term&limit=10
 * Global search across profiles, lineages, posts.
 */
async function globalSearch(req, res) {
    try {
        const q = req.query.q?.trim();
        const limit = Math.min(Number(req.query.limit) || 10, 30);
        if (!q || q.length < 2) {
            return res.status(400).json({ message: "q must be at least 2 characters" });
        }
        const me = await getCurrentProfile(req);
        // --- BLOCK GRAPH (if logged in) ---
        let blockedIds = new Set();
        if (me) {
            const blocks = await prisma_1.prisma.block.findMany({
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
        const profiles = await prisma_1.prisma.profile.findMany({
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
        // const lineages = await prisma.lineage.findMany({
        //   where: {
        //     OR: [
        //       { name: { contains: q, mode: "insensitive" } },
        //       { primarySurname: { contains: q, mode: "insensitive" } },
        //       { rootVillage: { contains: q, mode: "insensitive" } },
        //       { rootRegion: { contains: q, mode: "insensitive" } }
        //     ]
        //   },
        //   take: limit,
        //   select: {
        //     id: true,
        //     name: true,
        //     type: true,
        //     primarySurname: true,
        //     rootVillage: true,
        //     rootRegion: true,
        //     createdAt: true
        //   }
        // });
        // ----------------------
        // 3) POSTS (simple text search)
        // ----------------------
        const posts = await prisma_1.prisma.post.findMany({
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
            // lineages,
            posts
        });
    }
    catch (error) {
        console.error("globalSearch error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
