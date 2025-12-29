import { Router } from "express";
import { supabaseAuth, optionalSupabaseAuth } from "../auth/auth.middleware";
import { ProfileController } from "./profile.controller";

const router = Router();

// authenticated
router.get("/", supabaseAuth, ProfileController.getProfiles);
router.get("/me", supabaseAuth, ProfileController.getMyProfile);
router.get("/:profileId", supabaseAuth, ProfileController.getProfileById);
router.get("/:email", supabaseAuth, ProfileController.getProfileByEmail);


// router.patch("/me", supabaseAuth, ProfileController.updateMyProfile);
router.patch("/me/avatar", supabaseAuth, ProfileController.updateMyAvatar);
router.patch("/me/cover", supabaseAuth, ProfileController.updateMyCover);
// router.patch("/me/interests", supabaseAuth, ProfileController.updateMyInterests);
router.post("/me/complete", supabaseAuth, ProfileController.completeRegistration);

// public / semi-public
router.get("/username/check", ProfileController.checkUsernameAvailability);
router.get("/search", optionalSupabaseAuth, ProfileController.searchProfiles);
router.get("/:username", optionalSupabaseAuth, ProfileController.getProfileByUsername);

router.patch("/complete-registration", supabaseAuth, ProfileController.completeRegistration);



export default router;
