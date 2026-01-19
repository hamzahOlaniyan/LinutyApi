"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_controller_1 = require("./upload.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const router = (0, express_1.Router)();
// client calls this to get a signed URL for raw video upload
// router.post("/video-url", supabaseAuth, getVideoUploadUrl);
router.post("/image-url", auth_middleware_1.supabaseAuth, upload_controller_1.getImageUploadUrl);
exports.default = router;
