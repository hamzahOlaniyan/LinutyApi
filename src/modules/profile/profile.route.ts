import { Router } from "express";
import { supabaseAuth, optionalSupabaseAuth } from "../auth/auth.middleware";
import { ProfileController } from "./profile.controller";

const profileRoutes = Router();

// authenticated
profileRoutes.get("/", supabaseAuth, ProfileController.getProfiles);
profileRoutes.get("/me", supabaseAuth, ProfileController.getMyProfile);
profileRoutes.get("/:profileId", supabaseAuth, ProfileController.getProfileById);
profileRoutes.get("/:email", supabaseAuth, ProfileController.getProfileByEmail);

profileRoutes.get("/post/:profileId", supabaseAuth, ProfileController.getPostsByProfileId);



// profileRoutes.patch("/me", supabaseAuth, ProfileController.updateMyProfile);
profileRoutes.patch("/me/avatar", supabaseAuth, ProfileController.updateMyAvatar);
profileRoutes.patch("/me/cover", supabaseAuth, ProfileController.updateMyCover);
// profileRoutes.patch("/me/interests", supabaseAuth, ProfileController.updateMyInterests);
// profileRoutes.post("/me/complete", supabaseAuth, ProfileController.completeRegistration);

// public / semi-public
profileRoutes.get("/username/check", ProfileController.checkUsernameAvailability);
profileRoutes.get("/search", optionalSupabaseAuth, ProfileController.searchProfiles);
profileRoutes.get("/:username", optionalSupabaseAuth, ProfileController.getProfileByUsername);

// profileRoutes.patch("/complete-registration", supabaseAuth, ProfileController.completeRegistration);



export default profileRoutes;
