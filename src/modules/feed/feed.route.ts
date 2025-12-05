import { Router } from "express";
import { getHomeFeed } from "./feed.controller";
import { supabaseAuth } from "../auth/auth.middleware";

const router = Router();

router.get("/", supabaseAuth, getHomeFeed);

export default router;
