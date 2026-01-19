"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/search/search.routes.ts
const express_1 = require("express");
const search_controller_1 = require("./search.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
// if you have an optional auth middleware, you can use that instead
// import { optionalSupabaseAuth } from "../auth/auth.middleware";
const router = (0, express_1.Router)();
// if you want search to work without login, swap supabaseAuth for optionalSupabaseAuth
router.get("/", auth_middleware_1.supabaseAuth, search_controller_1.globalSearch);
exports.default = router;
