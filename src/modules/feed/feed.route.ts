import { Router } from "express";
import { getHomeFeed } from "./feed.controller";
import { supabaseAuth } from "../auth/auth.middleware";

const feedRouter = Router();

feedRouter.get("/", supabaseAuth, getHomeFeed);

export default feedRouter;
