"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaFileController = void 0;
const prisma_1 = require("../../config/prisma");
async function getCurrentProfile(req) {
    const userId = req.user?.id;
    if (!userId)
        return null;
    return prisma_1.prisma.profile.findUnique({
        where: { userId }
    });
}
class MediaFileController {
    static async markMediaHlsReady(req, res) {
        try {
            const secret = req.headers["x-linutyauth"];
            if (secret !== process.env.API_CALLBACK_SECRET) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const { postId, hlsUrl } = req.body;
            if (!postId || !hlsUrl) {
                return res
                    .status(400)
                    .json({ message: "postId and hlsUrl are required" });
            }
            // Update all VIDEO media for that post.
            // If you only ever have 1 video per post, this is fine.
            await prisma_1.prisma.mediaFile.updateMany({
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
        }
        catch (err) {
            console.error("markMediaHlsReady error:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
    static async getMediaByProfileId(req, res) {
        try {
            const { profileId } = req.params;
            const media = await prisma_1.prisma.mediaFile.findMany({
                where: {
                    post: { profileId },
                },
                orderBy: { createdAt: "desc" },
            });
            return res.json(media);
        }
        catch (error) {
            console.error("getMediaByProfileId error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
}
exports.MediaFileController = MediaFileController;
