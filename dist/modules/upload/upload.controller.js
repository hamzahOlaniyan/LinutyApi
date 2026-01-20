"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImageUploadUrl = getImageUploadUrl;
const crypto_1 = require("crypto");
const supabase_1 = require("../../config/supabase");
const supabaseAdmin = (0, supabase_1.getSupabaseAdmin)();
async function getImageUploadUrl(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: "Unauthenticated" });
        }
        const { fileName, contentType } = req.body;
        if (!fileName) {
            return res.status(400).json({ message: "fileName is required" });
        }
        const ext = fileName.includes(".") ? fileName.split(".").pop() : "jpg";
        // path inside bucket – you can adjust this structure
        const objectName = `posts/${user.id}/${Date.now()}-${(0, crypto_1.randomUUID)()}.${ext}`;
        // 1) signed upload URL (client will PUT the file here)
        const { data, error } = await supabaseAdmin.storage
            .from("post-images")
            .createSignedUploadUrl(objectName);
        if (error || !data) {
            console.error("createSignedUploadUrl error:", error);
            return res.status(500).json({ message: "Could not create upload URL" });
        }
        // 2) public URL (since bucket is public)
        const { data: publicData } = supabaseAdmin.storage
            .from("post-images")
            .getPublicUrl(objectName);
        const publicUrl = publicData?.publicUrl ?? null;
        return res.json({
            uploadUrl: data.signedUrl, // use this for PUT
            objectName, // storage path
            publicUrl, // use this in MediaFile.url
            contentType: contentType ?? "image/jpeg"
        });
    }
    catch (err) {
        console.error("getImageUploadUrl error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}
/**
 * POST /uploads/video-url
 * body: { contentType: string }  e.g. "video/mp4"
 */
// export async function getVideoUploadUrl(req: AuthedRequest, res: Response) {
//   try {
//     const user = req.user;
//     if (!user) {
//       return res.status(401).json({ message: "Unauthenticated" });
//     }
//     const { contentType } = req.body as { contentType?: string };
//     if (!contentType || !contentType.startsWith("video/")) {
//       return res.status(400).json({ message: "contentType must be a video/*" });
//     }
//     const userId = user.id as string;
//     // generate a unique object path in the raw bucket
//     const random = crypto.randomBytes(8).toString("hex");
//     const timestamp = Date.now();
//     const objectName = `raw/${userId}/${timestamp}-${random}.mp4`; // you can adjust extension
//     const file = rawVideoBucket.file(objectName);
//     const expires = Date.now() + 15 * 60 * 1000; // 15 minutes
//     const [uploadUrl] = await file.getSignedUrl({
//       version: "v4",
//       action: "write",
//       expires,
//       contentType
//     });
//     return res.json({
//       uploadUrl,
//       objectName,
//       bucket: rawVideoBucket.name,
//       expiresAt: new Date(expires).toISOString()
//     });
//   } catch (err) {
//     console.error("getVideoUploadUrl error:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// }
