import { Router } from "express";
import { getVideoUploadUrl } from "./upload.controller";
import { supabaseAuth } from "../auth/auth.middleware";

const router = Router();

// client calls this to get a signed URL for raw video upload
router.post("/video-url", supabaseAuth, getVideoUploadUrl);

export default router;
