"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const media_controller_1 = require("./media.controller");
const mediaRouter = (0, express_1.Router)();
mediaRouter.post("/hls-ready", media_controller_1.MediaFileController.markMediaHlsReady);
mediaRouter.get("/:profileId", media_controller_1.MediaFileController.getMediaByProfileId);
exports.default = mediaRouter;
