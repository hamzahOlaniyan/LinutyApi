import { Router } from "express";
import { markMediaHlsReady } from "./media.controller";

const router = Router();

// internal callback from transcoder
router.post("/hls-ready", markMediaHlsReady);

export default router;
