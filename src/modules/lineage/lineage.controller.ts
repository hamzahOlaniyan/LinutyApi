import { Request, Response } from "express";
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
 * POST /lineages
 * body: { name: string; type?: LineageType; primarySurname?: string; rootVillage?: string; rootRegion?: string; description?: string; }
 */
export async function createLineage(req: AuthedRequest, res: Response) {
  try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const {
      name,
      type = "FAMILY",
      primarySurname,
      rootVillage,
      rootRegion,
      description
    } = req.body as {
      name: string;
      type?: "FAMILY" | "CLAN" | "SURNAME_LINE" | "TRIBE";
      primarySurname?: string;
      rootVillage?: string;
      rootRegion?: string;
      description?: string;
    };

    if (!name?.trim()) {
      return res.status(400).json({ message: "name is required" });
    }

    const lineage = await prisma.lineage.create({
      data: {
        name: name.trim(),
        type,
        primarySurname: primarySurname ?? null,
        rootVillage: rootVillage ?? null,
        rootRegion: rootRegion ?? null,
        description: description ?? null,
        createdById: me.id,
        memberships: {
          create: {
            profileId: me.id,
            role: "ANCESTOR",
            isPrimaryLineage: true
          }
        }
      },
      include: {
        memberships: {
          include: {
            profile: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    return res.status(201).json(lineage);
  } catch (error) {
    console.error("createLineage error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /lineages/mine
 */
export async function getMyLineages(req: AuthedRequest, res: Response) {
  try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const memberships = await prisma.lineageMembership.findMany({
      where: { profileId: me.id },
      include: {
        lineage: true
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json(
      memberships.map((m) => ({
        id: m.lineage.id,
        name: m.lineage.name,
        type: m.lineage.type,
        primarySurname: m.lineage.primarySurname,
        rootVillage: m.lineage.rootVillage,
        rootRegion: m.lineage.rootRegion,
        description: m.lineage.description,
        role: m.role,
        isPrimaryLineage: m.isPrimaryLineage,
        joinedAt: m.createdAt
      }))
    );
  } catch (error) {
    console.error("getMyLineages error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /lineages/:id
 * includes members
 */
export async function getLineageById(req: AuthedRequest, res: Response) {
  try {
    const { id } = req.params;

    const lineage = await prisma.lineage.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            profile: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                lineageMainSurname: true,
                lineageRootVillage: true
              }
            }
          }
        }
      }
    });

    if (!lineage) {
      return res.status(404).json({ message: "Lineage not found" });
    }

    return res.json(lineage);
  } catch (error) {
    console.error("getLineageById error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * POST /lineages/:id/join
 * body: { role?: LineageRole; generation?: number; isPrimaryLineage?: boolean }
 */
export async function joinLineage(req: AuthedRequest, res: Response) {
  try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const { id: lineageId } = req.params;
    const { role = "DESCENDANT", generation, isPrimaryLineage = false } =
      req.body as {
        role?: "ANCESTOR" | "DESCENDANT" | "SPOUSE" | "EXTENDED";
        generation?: number;
        isPrimaryLineage?: boolean;
      };

    const lineage = await prisma.lineage.findUnique({
      where: { id: lineageId }
    });

    if (!lineage) {
      return res.status(404).json({ message: "Lineage not found" });
    }

    const membership = await prisma.lineageMembership.upsert({
      where: {
        lineageId_profileId: {
          lineageId,
          profileId: me.id
        }
      },
      update: {
        role,
        generation,
        isPrimaryLineage
      },
      create: {
        lineageId,
        profileId: me.id,
        role,
        generation,
        isPrimaryLineage,
        addedById: me.id
      }
    });

    return res.status(200).json(membership);
  } catch (error) {
    console.error("joinLineage error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * DELETE /lineages/:id/leave
 */
export async function leaveLineage(req: AuthedRequest, res: Response) {
  try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const { id: lineageId } = req.params;

    await prisma.lineageMembership.deleteMany({
      where: {
        lineageId,
        profileId: me.id
      }
    });

    return res.json({ message: "Left lineage" });
  } catch (error) {
    console.error("leaveLineage error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
