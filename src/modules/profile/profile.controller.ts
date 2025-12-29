import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { AuthedRequest } from "../auth/auth.middleware";
import { Profile } from "@prisma/client";
import { includes } from "zod";

async function getCurrentProfile(req: AuthedRequest) {
  const userId = req.user?.id as string | undefined;
  if (!userId) return null;

  return prisma.profile.findUnique({
    where: { userId }
  });
}

type completeRegistrationInput={
      location?: string;
      dateOfBirth?: string;     
      clan_tree?: string[];     
      gender?: string | null;
      ethnicity?: string | null;
      fullName?: string | null;
      avatarUrl?: string | null;
      profession?: string | null;
      interest?: string[];     
      appInterests?: string[];
      isProfileComplete?:boolean
}

export class ProfileController{

  static async getProfiles(req: AuthedRequest, res: Response) {
    try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const q = String(req.query.query ?? "").trim();
    const limit = Math.min(Number(req.query.limit ?? 20), 50);

    const profiles = await prisma.profile.findMany({
      where: {
        id: { not: me.id },
        ...(q
          ? {
              OR: [
                { username: { contains: q, mode: "insensitive" } },
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        avatarUrl: true,
        
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });


    const ids = profiles.map((p) => p.id);

    // 1) friendships between me and these ids
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userAId: me.id, userBId: { in: ids } },
          { userBId: me.id, userAId: { in: ids } },
        ],
      },
      select: { userAId: true, userBId: true },
    });

    const friendSet = new Set(
      friendships.map((f) => (f.userAId === me.id ? f.userBId : f.userAId))
    );

    // 2) pending requests (both directions)
    const pending = await prisma.friendRequest.findMany({
      where: {
        status: "PENDING",
        OR: [
          { requesterId: me.id, addresseeId: { in: ids } }, // outgoing
          { addresseeId: me.id, requesterId: { in: ids } }, // incoming
        ],
      },
      select: { id: true, requesterId: true, addresseeId: true },
    });

    const outgoingMap = new Map<string, string>(); // profileId -> requestId
    const incomingMap = new Map<string, string>(); // profileId -> requestId

    for (const r of pending) {
      if (r.requesterId === me.id) outgoingMap.set(r.addresseeId, r.id);
      else incomingMap.set(r.requesterId, r.id);
    }

    const items = profiles.map((p) => {
      if (friendSet.has(p.id)) {
        return { ...p, friendStatus: "FRIENDS" as const };
      }
      const incomingId = incomingMap.get(p.id);
      if (incomingId) {
        return {
          ...p,
          friendStatus: "PENDING_INCOMING" as const,
          requestId: incomingId,
        };
      }
      const outgoingId = outgoingMap.get(p.id);
      if (outgoingId) {
        return {
          ...p,
          friendStatus: "PENDING_OUTGOING" as const,
          requestId: outgoingId,
        };
      }
      return { ...p, friendStatus: "NONE" as const };
    });

    return res.status(200).json({ items });
  } catch (error) {
    console.log("exploreProfiles ❌", error);
    return res.status(500).json({ message: "Server error" });
  }
  }

  
  static async getProfileById(req: AuthedRequest, res: Response) {
    try {
      const me = await getCurrentProfile(req);
      if (!me) return res.status(401).json({ message: "Unauthenticated" });

      const { profileId } = req.params;

      const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        // include whatever you need
        // include: { settings: true, ... }
      });

      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const friendsCount = await prisma.friendship.count({
        where: {
          OR: [{ userAId: profile.id }, { userBId: profile.id }],
        },
      });


      // If user is viewing their own profile
      if (profile.id === me.id) {
        return res.status(200).json({
          ...profile,
          friendStatus: "SELF" as const,
        });
      }

      // 1) Are we already friends?
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { userAId: me.id, userBId: profile.id },
            { userBId: me.id, userAId: profile.id },
          ],
        },
        select: { id: true },
      });

      if (friendship) {
        return res.status(200).json({
          ...profile,
          friendStatus: "FRIENDS" as const,
        });
      }

      // 2) Is there a pending friend request either way?
      const pending = await prisma.friendRequest.findFirst({
        where: {
          status: "PENDING",
          OR: [
            { requesterId: me.id, addresseeId: profile.id }, // outgoing
            { addresseeId: me.id, requesterId: profile.id }, // incoming
          ],
        },
        select: { id: true, requesterId: true, addresseeId: true },
      });

      if (pending) {
        const isOutgoing = pending.requesterId === me.id;

        return res.status(200).json({
          ...profile,
          friendStatus: isOutgoing
            ? ("PENDING_OUTGOING" as const)
            : ("PENDING_INCOMING" as const),
          requestId: pending.id,
        });
      }

      // 3) Nothing between you two
      return res.status(200).json({
        ...profile,
        friendsCount,
        friendStatus: "NONE" as const,
      });
    } catch (error) {
      console.error("getProfileById error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
}

static async getProfileByEmail(req: AuthedRequest, res: Response) {
    try {
      const { email } = req.params;

      const profile = await prisma.profile.findUnique({
        where: { email: email },
      });

      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      return res.status(200).json(profile);
    } catch (error) {
      console.error("getProfileById error:", error);
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
  // static async updateMyProfile(req: AuthedRequest, res: Response) {
  //   try {
  //     const userId = req.user.id;

  //     const {
  //       firstName,
  //       lastName,
  //       username,
  //       bio,
  //       country,
  //       city,
  //       district,
  //       location,
  //       gender,
  //       dateOfBirth,
  //       lineageMainSurname,
  //       lineageRootVillage
  //     } = req.body;

  //     // Only check username if it was provided
  //     if (username) {
  //       const existing = await prisma.profile.findFirst({
  //         where: {
  //           username,
  //           userId: { not: userId }
  //         },
  //         select: { id: true }
  //       });

  //       if (existing) {
  //         return res.status(409).json({ message: "Username already taken" });
  //       }
  //     }

  //     const updated = await prisma.profile.update({
  //       where: { userId },
  //       data: {
  //         firstName,
  //         lastName,
  //         username,
  //         bio,
  //         country,
  //         city,
  //         district,
  //         location,
  //         gender,
  //         dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
  //         lineageMainSurname,
  //         lineageRootVillage
  //       }
  //     });

  //     return res.json(updated);
  //   } catch (error) {
  //     console.error("updateMyProfile error:", error);
  //     return res.status(500).json({ message: "Internal server error" });
  //   }
  // }
//   static async updateMyProfile(req: AuthedRequest, res: Response) {
//   try {
//     const userId = req.user.id;

//     const allowedKeys = [
//       "firstName",
//       "lastName",
//       "username",
//       "bio",
//       "country",
//       "city",
//       "district",
//       "location",
//       "gender",
//       "dateOfBirth",
//       "lineageMainSurname",
//       "lineageRootVillage",
//     ] as const;

//     type AllowedKey = (typeof allowedKeys)[number];

//     const body = Object.fromEntries(
//       Object.entries(req.body).filter(([key, value]) => {
//         // allow only whitelisted keys + ignore undefined
//         return (allowedKeys as readonly string[]).includes(key) && value !== undefined;
//       })
//     ) as Partial<Record<AllowedKey, any>>;

//     // normalize date
//     if (content.dateOfBirth) {
//       content.dateOfBirth = new Date(content.dateOfBirth);
//     }

//     // username check only if username sent
//     if (content.username) {
//       const existing = await prisma.profile.findFirst({
//         where: { username: content.username, userId: { not: userId } },
//         select: { id: true },
//       });
//       if (existing) return res.status(409).json({ message: "Username already taken" });
//     }

//     const updated = await prisma.profile.update({
//       where: { userId },
//       data: content,
//     });

//     return res.json(updated);
//   } catch (error) {
//     console.error("updateMyProfile error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// }


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
  // static async updateMyInterests(req: AuthedRequest, res: Response) {
  //   try {
  //     const userId = req.user.id;
  //     const { interests } = req.body as { interests: string[] };

  //     if (!Array.isArray(interests)) {
  //       return res
  //         .status(400)
  //         .json({ message: "interests must be an array of strings" });
  //     }

  //     const profile = await prisma.profile.findUnique({ where: { userId } });
  //     if (!profile) {
  //       return res.status(404).json({ message: "Profile not found" });
  //     }

  //     const uniqueNames = [...new Set(interests.map(i => i.trim()).filter(Boolean))];

  //     // Upsert Interest records
  //     const interestRecords = await Promise.all(
  //       uniqueNames.map(name =>
  //         prisma.interest.upsert({
  //           where: { name },
  //           update: {},
  //           create: { name }
  //         })
  //       )
  //     );

  //     const interestIds = interestRecords.map(i => i.id);

  //     // Remove old links not in new set
  //     await prisma.profileInterest.deleteMany({
  //       where: {
  //         userId: profile.id,
  //         interestId: { notIn: interestIds }
  //       }
  //     });

  //     // Add missing links
  //     await Promise.all(
  //       interestIds.map(interestId =>
  //         prisma.profileInterest.upsert({
  //           where: {
  //             userId_interestId: {
  //               userId: profile.id,
  //               interestId
  //             }
  //           },
  //           update: {},
  //           create: {
  //             userId: profile.id,
  //             interestId
  //           }
  //         })
  //       )
  //     );

  //     const updatedProfile = await prisma.profile.findUnique({
  //       where: { id: profile.id },
  //       include: {
  //         interests: {
  //           include: { interest: true }
  //         }
  //       }
  //     });

  //     return res.json(updatedProfile);
  //   } catch (error) {
  //     console.error("updateMyInterests error:", error);
  //     return res.status(500).json({ message: "Internal server error" });
  //   }
  // }
  static async completeRegistration(req: AuthedRequest, res: Response) {
  try {
    const authUserId = req.user.id;
    const body = req.body as completeRegistrationInput;

    const result = await prisma.$transaction(async (tx) => {
      // ✅ find profile by userId (auth user id)
      const me = await tx.profile.findUnique({ where: { userId: authUserId } });
      if (!me) return null;

      const profile = await tx.profile.update({
        where: { userId: authUserId },
         data: {
          location: body.location,
          dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
          gender: body.gender,
          fullName:body.fullName,
          ethnicity: body.ethnicity,
          avatarUrl: body.avatarUrl,
          profession: body.profession,
          isProfileComplete: true,
         },
      });

      // ---------- CLAN TREE ----------
      if (Array.isArray(body.clan_tree)) {
        await tx.profileClan.deleteMany({ where: { profileId: profile.id } });

        const names = body.clan_tree.map((n) => String(n).trim()).filter(Boolean);

        for (let i = 0; i < names.length; i++) {
          const clan = await tx.clan.upsert({
            where: { name: names[i] },
            create: { name: names[i] },
            update: {},
          });

          await tx.profileClan.create({
            data: { profileId: profile.id, clanId: clan.id, order: i },
          });
        }
      }

      // ---------- INTERESTS ----------
      if (Array.isArray(body.interest)) {
        await tx.profileInterest.deleteMany({ where: { userId: profile.id } });

        const names = [...new Set(body.interest.map((n) => String(n).trim()).filter(Boolean))];

        for (const name of names) {
          const interest = await tx.interest.upsert({
            where: { name },
            create: { name },
            update: {},
          });

          await tx.profileInterest.create({
            data: { userId: profile.id, interestId: interest.id },
          });
        }
      }

      // ---------- APP INTERESTS ----------
      if (Array.isArray(body.appInterests)) {
        await tx.profileAppInterests.deleteMany({ where: { userId: profile.id } });

        const names = [...new Set(body.appInterests.map((n) => String(n).trim()).filter(Boolean))];

        const rows = await Promise.all(
          names.map(async (name) =>
            tx.appInterest.upsert({
              where: { name },
              create: { name },
              update: {},
              select: { id: true },
            })
          )
        );

      await tx.profileAppInterests.createMany({
        data: rows.map((r) => ({
          userId: profile.id,
          interestId: r.id,
        })),
        skipDuplicates: true,
      });
      }

      return tx.profile.findUnique({
        where: { id: profile.id },
        include: {
          clanTree: { orderBy: { order: "asc" }, include: { clan: true } },
          interests: { include: { interest: true } },
          appInterests: { include: { interest: true } },
        },
      });
    },{timeout: 20000});

    if (!result) return res.status(404).json({ message: "Profile not found" });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("completeRegistration error:", error);
    return res.status(500).json({ message: error?.message ?? "Internal server error" });
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

//   static async  completeMyProfile(req: AuthedRequest, res: Response) {
//   try {
//     const user = req.user;
//     if (!user) return res.status(401).json({ message: "Unauthenticated" });

//     const {
//       firstName,
//       lastName,
//       gender,
//       dateOfBirth,
//       country,
//       city,
//       district,
//       location,
//       bio
//     } = req.body;

//     const profile = await prisma.profile.update({
//       where: { userId: user.id },
//       data: {
//         firstName,
//         lastName,
//         gender,
//         dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
//         country,
//         city,
//         district,
//         location,
//         bio,
//         isProfileComplete: true
//       }
//     });

//     return res.json({ profile });
//   } catch (err) {
//     console.error("completeMyProfile error:", err);
//     return res.status(500).json({ message: "Something went wrong" });
//   }
// }
}
