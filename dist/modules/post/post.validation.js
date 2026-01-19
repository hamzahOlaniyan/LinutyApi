"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPostSchema = void 0;
// src/modules/post/post.validation.ts
const zod_1 = require("zod");
exports.createPostSchema = zod_1.z.object({
    content: zod_1.z.string().max(5000).optional(),
    // visibility: z
    //   .enum(["PUBLIC", "FOLLOWERS", "LINEAGE_ONLY", "PRIVATE"])
    //   .optional(),
    // lineageId: z.string().uuid().optional(),
    // For now: single video per post (you can expand later)
    images: zod_1.z
        .array(zod_1.z.object({
        url: zod_1.z.string().url("Invalid image url"),
        mimeType: zod_1.z.string().optional(),
        width: zod_1.z.number().int().optional(),
        height: zod_1.z.number().int().optional(),
        sizeBytes: zod_1.z.number().int().optional()
    }))
        .optional(),
    video: zod_1.z
        .object({
        rawObjectName: zod_1.z.string().min(1, "rawObjectName is required"),
        mimeType: zod_1.z.string().optional(),
        sizeBytes: zod_1.z.number().int().optional(),
        width: zod_1.z.number().int().optional(),
        height: zod_1.z.number().int().optional()
    })
        .optional()
});
