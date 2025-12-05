import { Request, Response } from "express";
import { AuthedRequest } from "../auth/auth.middleware";
import { prisma } from "../../config/prisma";
import { NotificationService } from "../notification/notification.service";


async function getCurrentProfile(req: AuthedRequest) {
  const userId = req.user?.id as string | undefined;
  if (!userId) return null;

  return prisma.profile.findUnique({
    where: { userId }
  });
}

// helper to resolve profile by username
async function getProfileByUsername(username: string) {
  return prisma.profile.findUnique({
    where: { username }
  });
}

/**
 * POST /kinships
 * body: {
 *   targetUsername: string;
 *   relationAtoB: KinshipType; // "PARENT" | "CHILD" | "SIBLING" | ...
 * }
 *
 * Creates a directional relation: me (A) -> target (B)
 */
export async function createKinship(req: AuthedRequest, res: Response) {
  try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const { targetUsername, relationAtoB } = req.body as {
      targetUsername: string;
      relationAtoB:
        | "PARENT"
        | "CHILD"
        | "SIBLING"
        | "SPOUSE"
        | "GRANDPARENT"
        | "GRANDCHILD"
        | "COUSIN"
        | "UNCLE_AUNT"
        | "NEPHEW_NIECE"
        | "OTHER";
    };

    if (!targetUsername || !relationAtoB) {
      return res
        .status(400)
        .json({ message: "targetUsername and relationAtoB are required" });
    }

    const target = await getProfileByUsername(targetUsername);
    if (!target) {
      return res.status(404).json({ message: "Target profile not found" });
    }

    if (target.id === me.id) {
      return res
        .status(400)
        .json({ message: "You cannot create kinship with yourself" });
    }

    const kinship = await prisma.kinship.create({
      data: {
        profileIdA: me.id,
        profileIdB: target.id,
        relationAtoB,
        verified: false
      },
      include: {
        profileA: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        },
        profileB: {
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

    return res.status(201).json(kinship);
  } catch (error) {
    console.error("createKinship error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /kinships
 * List all kinships where I'm A or B, normalised from my perspective.
 */
export async function getMyKinships(req: AuthedRequest, res: Response) {
  try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const kinships = await prisma.kinship.findMany({
      where: {
        OR: [{ profileIdA: me.id }, { profileIdB: me.id }]
      },
      orderBy: { createdAt: "desc" },
      include: {
        profileA: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        },
        profileB: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        },
        // verifiedBy: {
        //   select: {
        //     id: true,
        //     username: true
        //   }
        // }
      }
    });

    // normalise for frontend:
    // - always expose "relative" as the OTHER person
    // - directionFromMe: relation I set if I'm A, or inverse if I'm B (simple version: just show relationAtoB + who is A/B)
    const result = kinships.map((k) => {
      const iAmA = k.profileIdA === me.id;
      const relative = iAmA ? k.profileB : k.profileA;

      return {
        id: k.id,
        relationAtoB: k.relationAtoB,
        iAmA,
        relative,
        verified: k.verified,
        // verifiedBy: k.verifiedBy,
        createdAt: k.createdAt
      };
    });

    return res.json(result);
  } catch (error) {
    console.error("getMyKinships error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * POST /kinships/:id/verify
 * Only profileB (the "other party") or an admin-like user can verify.
 */
export async function verifyKinship(req: AuthedRequest, res: Response) {
  try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const { id } = req.params;

    const kinship = await prisma.kinship.findUnique({
      where: { id }
    });

    if (!kinship) {
      return res.status(404).json({ message: "Kinship not found" });
    }

    // simple rule: only B can verify (the person being "claimed")
    if (kinship.profileIdB !== me.id) {
      return res
        .status(403)
        .json({ message: "Only the other party can verify this relationship" });
    }

    const updated = await prisma.kinship.update({
      where: { id },
      data: {
        verified: true,
        verifiedById: me.id
      }
    });

    await NotificationService.lineageAccept(kinship.profileIdA,me.id,"")                   
  ;

    return res.json(updated);
  } catch (error) {
    console.error("verifyKinship error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * DELETE /kinships/:id
 * Either side can remove the relation.
 */
export async function deleteKinship(req: AuthedRequest, res: Response) {
  try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const { id } = req.params;

    const kinship = await prisma.kinship.findUnique({
      where: { id }
    });

    if (!kinship) {
      return res.status(404).json({ message: "Kinship not found" });
    }

    if (kinship.profileIdA !== me.id && kinship.profileIdB !== me.id) {
      return res
        .status(403)
        .json({ message: "You are not part of this kinship" });
    }

    await prisma.kinship.delete({ where: { id } });

    return res.json({ message: "Kinship deleted" });
  } catch (error) {
    console.error("deleteKinship error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
