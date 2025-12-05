import { Request, Response } from "express";
import { AuthedRequest } from "../auth/auth.middleware";
import { prisma } from "../../config/prisma";
import { NotificationService } from "../notification/notification.service";


// helper: get profile of current user from Supabase user id
// 
export class FollowController {

  static async getCurrentProfile(req: AuthedRequest) {
    const userId = req.user?.id as string | undefined;
    if (!userId) return null;

    return prisma.profile.findUnique({
      where: { userId }
    });
  }

  // helper: get target profile by username
  static async getTargetProfile(username: string) {
    return prisma.profile.findUnique({
      where: { username }
    });
  }

/**
 * POST /profiles/:username/follow
 */
static async followProfile(req: AuthedRequest, res: Response) {
  try {
    const me = await this.getCurrentProfile(req);
    if (!me) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { username } = req.params;
    const target = await this.getTargetProfile(username);

    if (!target) {
      return res.status(404).json({ message: "Profile not found" });
    }

    if (target.id === me.id) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    // Check block relationships
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: me.id, blockedId: target.id },
          { blockerId: target.id, blockedId: me.id }
        ]
      }
    });

    if (block) {
      return res
        .status(403)
        .json({ message: "You cannot follow this user due to blocking" });
    }

    // Simple follow (no "requests" logic yet)
    const follow = await prisma.follow.upsert({
      where: {
        followerId_followeeId: {
          followerId: me.id,
          followeeId: target.id
        }
      },
      update: {}, // already following
      create: {
        followerId: me.id,
        followeeId: target.id
      }
    });

    await NotificationService.follow(target.id, me.id); // 👈 notify followee

    return res.status(200).json({ message: "Followed", follow });
  } catch (error) {
    console.error("followProfile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * DELETE /profiles/:username/follow
 */
static async unfollowProfile(req: AuthedRequest, res: Response) {
  try {
    const me = await this.getCurrentProfile(req);
    if (!me) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { username } = req.params;
    const target = await this.getTargetProfile(username);

    if (!target) {
      return res.status(404).json({ message: "Profile not found" });
    }

    if (target.id === me.id) {
      return res.status(400).json({ message: "You cannot unfollow yourself" });
    }

    await prisma.follow.deleteMany({
      where: {
        followerId: me.id,
        followeeId: target.id
      }
    });

    return res.status(200).json({ message: "Unfollowed" });
  } catch (error) {
    console.error("unfollowProfile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /profiles/:username/followers?limit=20&cursor=<followId>
 * simple cursor-based pagination on Follow.id
 */
static async getFollowers(req: Request, res: Response) {
  try {
    const { username } = req.params;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const target = await this.getTargetProfile(username);
    if (!target) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const followers = await prisma.follow.findMany({
      where: { followeeId: target.id },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1
          }
        : {}),
      orderBy: { createdAt: "desc" },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            isVerified: true
          }
        }
      }
    });

    let nextCursor: string | null = null;
    if (followers.length > limit) {
      const last = followers.pop();
      nextCursor = last?.id ?? null;
    }

    return res.json({
      data: followers.map(f => f.follower),
      nextCursor
    });
  } catch (error) {
    console.error("getFollowers error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /profiles/:username/following?limit=20&cursor=<followId>
 */
static async getFollowing(req: Request, res: Response) {
  try {
    const { username } = req.params;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const target = await this.getTargetProfile(username);
    if (!target) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const following = await prisma.follow.findMany({
      where: { followerId: target.id },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1
          }
        : {}),
      orderBy: { createdAt: "desc" },
      include: {
        followee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            isVerified: true
          }
        }
      }
    });

    let nextCursor: string | null = null;
    if (following.length > limit) {
      const last = following.pop();
      nextCursor = last?.id ?? null;
    }

    return res.json({
      data: following.map(f => f.followee),
      nextCursor
    });
  } catch (error) {
    console.error("getFollowing error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /profiles/:username/edge
 * returns relationship between current user and target user
 */
static async  getProfileEdge(req: AuthedRequest, res: Response) {
  try {
    const viewerProfile = await this.getCurrentProfile(req);
    const { username } = req.params;

    const target = await this.getTargetProfile(username);
    if (!target) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // anonymous viewer
    if (!viewerProfile) {
      return res.json({
        isFollowing: false,
        isFollowedBy: false,
        hasBlocked: false,
        isBlockedBy: false,
        isMuted: false
      });
    }

    if (viewerProfile.id === target.id) {
      // looking at own profile
      return res.json({
        isFollowing: false,
        isFollowedBy: false,
        hasBlocked: false,
        isBlockedBy: false,
        isMuted: false
      });
    }

    const [follow, followedBy, block, blockedBy, mute] = await Promise.all([
      prisma.follow.findUnique({
        where: {
          followerId_followeeId: {
            followerId: viewerProfile.id,
            followeeId: target.id
          }
        }
      }),
      prisma.follow.findUnique({
        where: {
          followerId_followeeId: {
            followerId: target.id,
            followeeId: viewerProfile.id
          }
        }
      }),
      prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: viewerProfile.id,
            blockedId: target.id
          }
        }
      }),
      prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: target.id,
            blockedId: viewerProfile.id
          }
        }
      }),
      prisma.mute.findUnique({
        where: {
          muterId_mutedId: {
            muterId: viewerProfile.id,
            mutedId: target.id
          }
        }
      })
    ]);

    return res.json({
      isFollowing: !!follow,
      isFollowedBy: !!followedBy,
      hasBlocked: !!block,
      isBlockedBy: !!blockedBy,
      isMuted: !!mute
    });
  } catch (error) {
    console.error("getProfileEdge error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
}  

