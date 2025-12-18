import { Router } from "express";
import{ProfileController} from "./profile.controller";
import { supabaseAuth, optionalSupabaseAuth } from "../auth/auth.middleware";
import { FollowController } from "../follow/follow.controller";


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

// follow / unfollow
router.post("/:username/follow", supabaseAuth, FollowController.followProfile);
router.delete("/:username/follow", supabaseAuth, FollowController.unfollowProfile);

// followers / following lists
router.get("/:username/followers", optionalSupabaseAuth, FollowController.getFollowers);
router.get("/:username/following", optionalSupabaseAuth, FollowController.getFollowing);

// relationship edge (used for UI)
router.get("/:username/edge", optionalSupabaseAuth, FollowController.getProfileEdge);

export default router;
