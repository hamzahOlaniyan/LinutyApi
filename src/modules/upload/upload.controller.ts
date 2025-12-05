import { Response } from "express";
import { rawVideoBucket } from "../../lib/gcs";
import { AuthedRequest } from "../auth/auth.middleware";
import crypto from "crypto";

/**
 * POST /uploads/video-url
 * body: { contentType: string }  e.g. "video/mp4"
 */
export async function getVideoUploadUrl(req: AuthedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { contentType } = req.body as { contentType?: string };

    if (!contentType || !contentType.startsWith("video/")) {
      return res.status(400).json({ message: "contentType must be a video/*" });
    }

    const userId = user.id as string;

    // generate a unique object path in the raw bucket
    const random = crypto.randomBytes(8).toString("hex");
    const timestamp = Date.now();
    const objectName = `raw/${userId}/${timestamp}-${random}.mp4`; // you can adjust extension

    const file = rawVideoBucket.file(objectName);

    const expires = Date.now() + 15 * 60 * 1000; // 15 minutes

    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires,
      contentType
    });

    return res.json({
      uploadUrl,
      objectName,
      bucket: rawVideoBucket.name,
      expiresAt: new Date(expires).toISOString()
    });
  } catch (err) {
    console.error("getVideoUploadUrl error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
