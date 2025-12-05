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
 * GET /discovery/people-you-may-know?limit=20
 */
export async function getPeopleYouMayKnow(req: AuthedRequest, res: Response) {
  try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const limit = Math.min(Number(req.query.limit) || 20, 50);

    // who I follow
    const myFollows = await prisma.follow.findMany({
      where: { followerId: me.id },
      select: { followeeId: true }
    });
    const followingIds = new Set(myFollows.map((f) => f.followeeId));

    // who follows me
    const followers = await prisma.follow.findMany({
      where: { followeeId: me.id },
      select: { followerId: true }
    });
    const followerIds = new Set(followers.map((f) => f.followerId));

    // my lineages
    const memberships = await prisma.lineageMembership.findMany({
      where: { profileId: me.id },
      select: { lineageId: true }
    });
    const myLineageIds = memberships.map((m) => m.lineageId);

    // my interests
    const myInterests = await prisma.profileInterest.findMany({
      where: { userId: me.id },
      select: { interestId: true }
    });
    const myInterestIds = myInterests.map((i) => i.interestId);

    // blocks (either direction)
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

    // base candidate pool (you can tune this – keep it fairly small)
    const candidates = await prisma.profile.findMany({
      where: {
        id: {
          not: me.id,
          notIn: Array.from(followingIds),      // not already following
          // notIn: Array.from(blockedIds)        // not blocked/blocking
        },
        // must share *something* with me to be in the pool
        OR: [
          // mutual followers
          {
            followsAsFollower: {
              some: { followeeId: { in: Array.from(followerIds) } }
            }
          },
          // same lineage
          {
            lineageMemberships: {
              some: {
                lineageId: { in: myLineageIds }
              }
            }
          },
          // similar interests
          {
            interests: {
              some: {
                interestId: { in: myInterestIds }
              }
            }
          }
        ]
      },
      include: {
        lineageMemberships: {
          select: { lineageId: true }
        },
        interests: {
          select: { interestId: true }
        },
        followsAsFollower: {
          select: { followeeId: true }
        },
        followsAsFollowee: {
          select: { followerId: true }
        }
      },
      take: 200 // big-ish pool, we'll score in JS
    });

    // score candidates
    type Scored = {
      score: number;
      profile: (typeof candidates)[number];
      mutualFollowers: number;
      sharedLineages: number;
      sharedInterests: number;
    };

    const scored: Scored[] = candidates.map((p) => {
      // mutual followers: people who follow both me and them, or I follow them and they follow someone who follows me
      const theirFollowers = p.followsAsFollowee.map((f) => f.followerId);
      const theirFollowing = p.followsAsFollower.map((f) => f.followeeId);

      const mutualFollowersCount = theirFollowers.filter((id) =>
        followerIds.has(id)
      ).length;

      const sharedLineagesCount = p.lineageMemberships.filter((lm) =>
        myLineageIds.includes(lm.lineageId)
      ).length;

      const sharedInterestsCount = p.interests.filter((i) =>
        myInterestIds.includes(i.interestId)
      ).length;

      // basic scoring heuristic
      const score =
        mutualFollowersCount * 5 +
        sharedLineagesCount * 4 +
        sharedInterestsCount * 2;

      return {
        score,
        profile: p,
        mutualFollowers: mutualFollowersCount,
        sharedLineages: sharedLineagesCount,
        sharedInterests: sharedInterestsCount
      };
    });

    scored.sort((a, b) => b.score - a.score);

    const top = scored.slice(0, limit).map((s) => ({
      id: s.profile.id,
      username: s.profile.username,
      firstName: s.profile.firstName,
      lastName: s.profile.lastName,
      avatarUrl: s.profile.avatarUrl,
      lineageMainSurname: s.profile.lineageMainSurname,
      lineageRootVillage: s.profile.lineageRootVillage,
      score: s.score,
      mutualFollowers: s.mutualFollowers,
      sharedLineages: s.sharedLineages,
      sharedInterests: s.sharedInterests
    }));

    return res.json(top);
  } catch (error) {
    console.error("getPeopleYouMayKnow error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
