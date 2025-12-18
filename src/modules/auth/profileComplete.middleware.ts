// src/modules/auth/profileComplete.middleware.ts
import type { NextFunction, Response } from "express";
import type { AuthedRequest } from "./auth.middleware";
import { prisma } from "../../config/prisma";

export async function requireProfileComplete(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthenticated" });

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id }
    });

    if (!profile || !profile.isProfileComplete) {
      return res.status(403).json({
        message: "Profile not complete. Please finish onboarding."
      });
    }

    // optionally attach profile for later use
    (req as any).profile = profile;

    next();
  } catch (err) {
    console.error("requireProfileComplete error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
