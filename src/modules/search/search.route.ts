// src/modules/search/search.routes.ts
import { Router } from "express";
import { globalSearch } from "./search.controller";
import { supabaseAuth } from "../auth/auth.middleware";
// if you have an optional auth middleware, you can use that instead
// import { optionalSupabaseAuth } from "../auth/auth.middleware";

const router = Router();

// if you want search to work without login, swap supabaseAuth for optionalSupabaseAuth
router.get("/", supabaseAuth, globalSearch);

export default router;
