import { Router } from "express";
import {  MediaFileController } from "./media.controller";

const mediaRouter = Router();

mediaRouter.post("/hls-ready", MediaFileController.markMediaHlsReady);

mediaRouter.get("/:profileId", MediaFileController.getMediaByProfileId);



export default mediaRouter;
