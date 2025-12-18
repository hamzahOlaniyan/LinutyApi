import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { AuthedRequest } from "../auth/auth.middleware";



export class ProfileController{

  static async getProfiles(req: AuthedRequest, res: Response) {
    try {

      const profile = await prisma.profile.findMany({
        where:{}
      });

      return res.json(profile);
    } catch (error) {
      console.error("getMyProfile error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

    // GET /profile/me
  static async getMyProfile(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user.id;

      const profile = await prisma.profile.findUnique({
        where: { userId },
        include: {
          settings: true,
          lineageMemberships: {
            include: { lineage: true }
          },
          interests: {
            include: { interest: true }
          }
        }
      });

      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      return res.json(profile);
    } catch (error) {
      console.error("getMyProfile error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // PATCH /profiles/me
  static async updateMyProfile(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user.id;

      const {
        firstName,
        lastName,
        username,
        bio,
        country,
        city,
        district,
        location,
        gender,
        dateOfBirth,
        lineageMainSurname,
        lineageRootVillage
      } = req.body;

      // Only check username if it was provided
      if (username) {
        const existing = await prisma.profile.findFirst({
          where: {
            username,
            userId: { not: userId }
          },
          select: { id: true }
        });

        if (existing) {
          return res.status(409).json({ message: "Username already taken" });
        }
      }

      const updated = await prisma.profile.update({
        where: { userId },
        data: {
          firstName,
          lastName,
          username,
          bio,
          country,
          city,
          district,
          location,
          gender,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          lineageMainSurname,
          lineageRootVillage
        }
      });

      return res.json(updated);
    } catch (error) {
      console.error("updateMyProfile error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // PATCH /profiles/me/avatar
  static async updateMyAvatar(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { avatarUrl } = req.body;

      if (!avatarUrl) {
        return res.status(400).json({ message: "avatarUrl is required" });
      }

      const updated = await prisma.profile.update({
        where: { userId },
        data: { avatarUrl }
      });

      return res.json(updated);
    } catch (error) {
      console.error("updateMyAvatar error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // PATCH /profiles/me/cover
  static async updateMyCover(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { coverUrl } = req.body;

      if (!coverUrl) {
        return res.status(400).json({ message: "coverUrl is required" });
      }

      const updated = await prisma.profile.update({
        where: { userId },
        data: { coverUrl }
      });

      return res.json(updated);
    } catch (error) {
      console.error("updateMyCover error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // PATCH /profiles/me/interests
  // body: { interests: string[] }
  static async updateMyInterests(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { interests } = req.body as { interests: string[] };

      if (!Array.isArray(interests)) {
        return res
          .status(400)
          .json({ message: "interests must be an array of strings" });
      }

      const profile = await prisma.profile.findUnique({ where: { userId } });
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const uniqueNames = [...new Set(interests.map(i => i.trim()).filter(Boolean))];

      // Upsert Interest records
      const interestRecords = await Promise.all(
        uniqueNames.map(name =>
          prisma.interest.upsert({
            where: { name },
            update: {},
            create: { name }
          })
        )
      );

      const interestIds = interestRecords.map(i => i.id);

      // Remove old links not in new set
      await prisma.profileInterest.deleteMany({
        where: {
          userId: profile.id,
          interestId: { notIn: interestIds }
        }
      });

      // Add missing links
      await Promise.all(
        interestIds.map(interestId =>
          prisma.profileInterest.upsert({
            where: {
              userId_interestId: {
                userId: profile.id,
                interestId
              }
            },
            update: {},
            create: {
              userId: profile.id,
              interestId
            }
          })
        )
      );

      const updatedProfile = await prisma.profile.findUnique({
        where: { id: profile.id },
        include: {
          interests: {
            include: { interest: true }
          }
        }
      });

      return res.json(updatedProfile);
    } catch (error) {
      console.error("updateMyInterests error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // GET /profiles/username/check?username=...
  static async checkUsernameAvailability(req: Request, res: Response) {
    try {
      const username = (req.query.username as string | undefined)?.trim();
      if (!username) {
        return res.status(400).json({ available: false, message: "username is required" });
      }

      const existing = await prisma.profile.findUnique({
        where: { username }
      });

      return res.json({
        username,
        available: !existing
      });
    } catch (error) {
      console.error("checkUsernameAvailability error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // GET /profiles/:username
  static async getProfileByUsername(req: Request, res: Response) {
    try {
      const { username } = req.params;
      const viewerUserId = (req as any).user?.id as string | undefined;

      const profile = await prisma.profile.findUnique({
        where: { username },
        include: {
          settings: true,
          interests: {
            include: { interest: true }
          }
        }
      });

      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const isOwner = viewerUserId && profile.userId === viewerUserId;

      if (profile.settings?.isPrivate && !isOwner) {
        const limited = {
          id: profile.id,
          username: profile.username,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUrl: profile.avatarUrl,
          isVerified: profile.isVerified,
          bio: profile.bio
        };
        return res.json(limited);
      }

      return res.json(profile);
    } catch (error) {
      console.error("getProfileByUsername error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // GET /profiles/search?q=...&limit=...
  static async searchProfiles(req: Request, res: Response) {
    try {
      const q = (req.query.q as string) || "";
      const take = Math.min(Number(req.query.limit) || 20, 50);

      const profiles = await prisma.profile.findMany({
        where: q
          ? {
              OR: [
                { username: { contains: q, mode: "insensitive" } },
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { lineageMainSurname: { contains: q, mode: "insensitive" } },
                { lineageRootVillage: { contains: q, mode: "insensitive" } }
              ]
            }
          : {},
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          lineageMainSurname: true,
          lineageRootVillage: true,
          isVerified: true
        },
        take
      });

      return res.json(profiles);
    } catch (error) {
      console.error("searchProfiles error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async  completeMyProfile(req: AuthedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthenticated" });

    const {
      firstName,
      lastName,
      gender,
      dateOfBirth,
      country,
      city,
      district,
      location,
      bio
    } = req.body;

    const profile = await prisma.profile.update({
      where: { userId: user.id },
      data: {
        firstName,
        lastName,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        country,
        city,
        district,
        location,
        bio,
        isProfileComplete: true
      }
    });

    return res.json({ profile });
  } catch (err) {
    console.error("completeMyProfile error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
}
}
