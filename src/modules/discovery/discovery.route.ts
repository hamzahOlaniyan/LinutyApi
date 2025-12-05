import { Router } from "express";
import { getPeopleYouMayKnow } from "./discovery.controller";
import { supabaseAuth } from "../auth/auth.middleware";

const router = Router();

router.get("/people-you-may-know", supabaseAuth, getPeopleYouMayKnow);

export default router;
