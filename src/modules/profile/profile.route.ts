import { Router } from "express";
import { supabaseAuth, optionalSupabaseAuth } from "../auth/auth.middleware";
import { ProfileController } from "./profile.controller";

const router = Router();

// authenticated
router.get("/", supabaseAuth, ProfileController.getProfiles);
router.get("/me", supabaseAuth, ProfileController.getMyProfile);
router.patch("/me", supabaseAuth, ProfileController.updateMyProfile);
router.patch("/me/avatar", supabaseAuth, ProfileController.updateMyAvatar);
router.patch("/me/cover", supabaseAuth, ProfileController.updateMyCover);
router.patch("/me/interests", supabaseAuth, ProfileController.updateMyInterests);
router.post("/me/complete", supabaseAuth, ProfileController.completeMyProfile);

// public / semi-public
router.get("/username/check", ProfileController.checkUsernameAvailability);
router.get("/search", optionalSupabaseAuth, ProfileController.searchProfiles);
router.get("/:username", optionalSupabaseAuth, ProfileController.getProfileByUsername);


export default router;
