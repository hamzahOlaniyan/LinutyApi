"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const profile_controller_1 = require("./profile.controller");
const profileRoutes = (0, express_1.Router)();
// authenticated
profileRoutes.get("/", auth_middleware_1.supabaseAuth, profile_controller_1.ProfileController.getProfiles);
profileRoutes.get("/me", auth_middleware_1.supabaseAuth, profile_controller_1.ProfileController.getMyProfile);
profileRoutes.get("/:profileId", auth_middleware_1.supabaseAuth, profile_controller_1.ProfileController.getProfileById);
profileRoutes.get("/:email", auth_middleware_1.supabaseAuth, profile_controller_1.ProfileController.getProfileByEmail);
profileRoutes.get("/post/:profileId", auth_middleware_1.supabaseAuth, profile_controller_1.ProfileController.getPostsByProfileId);
// profileRoutes.patch("/me", supabaseAuth, ProfileController.updateMyProfile);
profileRoutes.patch("/me/avatar", auth_middleware_1.supabaseAuth, profile_controller_1.ProfileController.updateMyAvatar);
profileRoutes.patch("/me/cover", auth_middleware_1.supabaseAuth, profile_controller_1.ProfileController.updateMyCover);
// profileRoutes.patch("/me/interests", supabaseAuth, ProfileController.updateMyInterests);
// profileRoutes.post("/me/complete", supabaseAuth, ProfileController.completeRegistration);
// public / semi-public
profileRoutes.get("/username/check", profile_controller_1.ProfileController.checkUsernameAvailability);
profileRoutes.get("/search", auth_middleware_1.optionalSupabaseAuth, profile_controller_1.ProfileController.searchProfiles);
profileRoutes.get("/:username", auth_middleware_1.optionalSupabaseAuth, profile_controller_1.ProfileController.getProfileByUsername);
// profileRoutes.patch("/complete-registration", supabaseAuth, ProfileController.completeRegistration);
exports.default = profileRoutes;
