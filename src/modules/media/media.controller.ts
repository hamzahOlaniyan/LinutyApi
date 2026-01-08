import type { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { AuthedRequest } from "../auth/auth.middleware";


async function getCurrentProfile(req: AuthedRequest) {
  const userId = req.user?.id as string | undefined;
  if (!userId) return null;

  return prisma.profile.findUnique({
    where: { userId }
  });
}
export class MediaFileController  {

  static async  markMediaHlsReady(req: Request, res: Response) {
    try {
      const secret = req.headers["x-linutyauth"];
  
      if (secret !== process.env.API_CALLBACK_SECRET) {
        return res.status(401).json({ message: "Unauthorized" });
      }
  
      const { postId, hlsUrl } = req.body as {
        postId?: string;
        hlsUrl?: string;
      };
  
      if (!postId || !hlsUrl) {
        return res
          .status(400)
          .json({ message: "postId and hlsUrl are required" });
      }
  
      // Update all VIDEO media for that post.
      // If you only ever have 1 video per post, this is fine.
      await prisma.mediaFile.updateMany({
        where: {
          postId,
          type: "VIDEO"
        },
        data: {
          url: hlsUrl,
          mimeType: "application/vnd.apple.mpegurl",
          // status: "READY" // uncomment if you added MediaStatus enum
        }
      });
  
      return res.json({ ok: true });
    } catch (err) {
      console.error("markMediaHlsReady error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getMediaByProfileId(req: Request, res: Response) {
  try {
    const { profileId } = req.params;

    const media = await prisma.mediaFile.findMany({
      where: {
        post: { profileId },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json( media );
  } catch (error) {
    console.error("getMediaByProfileId error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

}

