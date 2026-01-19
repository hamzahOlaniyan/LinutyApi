"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const feed_controller_1 = require("./feed.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const feedRouter = (0, express_1.Router)();
feedRouter.get("/", auth_middleware_1.supabaseAuth, feed_controller_1.getHomeFeed);
exports.default = feedRouter;
