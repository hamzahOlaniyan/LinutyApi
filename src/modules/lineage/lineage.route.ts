import { Router } from "express";
import {
  createLineage,
  getMyLineages,
  getLineageById,
  joinLineage,
  leaveLineage
} from "./lineage.controller";
import { supabaseAuth } from "../auth/auth.middleware";

const router = Router();

// create + mine
router.post("/", supabaseAuth, createLineage);
router.get("/mine", supabaseAuth, getMyLineages);

// details + members
router.get("/:id", supabaseAuth, getLineageById);

// join / leave
router.post("/:id/join", supabaseAuth, joinLineage);
router.delete("/:id/leave", supabaseAuth, leaveLineage);

export default router;
