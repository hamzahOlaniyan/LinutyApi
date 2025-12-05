import { Router } from "express";
import {
  createKinship,
  getMyKinships,
  verifyKinship,
  deleteKinship
} from "./kinship.controller";
import { supabaseAuth } from "../auth/auth.middleware";

const router = Router();

router.get("/", supabaseAuth, getMyKinships);
router.post("/", supabaseAuth, createKinship);
router.post("/:id/verify", supabaseAuth, verifyKinship);
router.delete("/:id", supabaseAuth, deleteKinship);

export default router;
