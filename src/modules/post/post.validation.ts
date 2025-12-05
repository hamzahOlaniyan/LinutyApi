// src/modules/post/post.validation.ts
import { z } from "zod";

export const createPostSchema = z.object({
  content: z.string().max(5000).optional(),

  visibility: z
    .enum(["PUBLIC", "FOLLOWERS", "LINEAGE_ONLY", "PRIVATE"])
    .optional(),

  lineageId: z.string().uuid().optional(),

  // For now: single video per post (you can expand later)
  video: z
    .object({
      rawObjectName: z.string().min(1, "rawObjectName is required"),
      mimeType: z.string().optional(),
      sizeBytes: z.number().int().optional(),
      width: z.number().int().optional(),
      height: z.number().int().optional()
    })
    .optional()
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
