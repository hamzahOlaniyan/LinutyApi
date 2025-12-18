import { Router } from "express";
import { getImageUploadUrl } from "./upload.controller";
import { supabaseAuth } from "../auth/auth.middleware";

const router = Router();

// client calls this to get a signed URL for raw video upload
// router.post("/video-url", supabaseAuth, getVideoUploadUrl);
router.post("/image-url", supabaseAuth, getImageUploadUrl);


export default router;
