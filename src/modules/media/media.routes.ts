import { Router } from "express";
import {  MediaFileController } from "./media.controller";

const router = Router();

// internal callback from transcoder
router.post("/hls-ready", MediaFileController.markMediaHlsReady);


export default router;
