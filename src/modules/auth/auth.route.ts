import { Router } from "express";
import { AuthController } from "./auth.controller";

const router = Router();

// /auth/register -> create Supabase user, send OTP email
router.post("/register", AuthController.register);

// /auth/verify-otp -> verify OTP from email, confirm email, return tokens
router.post("/verify-otp", AuthController.verifyOtp);

// /auth/login -> normal email/password login
router.post("/login", AuthController.login);

// /auth/logout -> client should clear tokens
router.post("/logout", AuthController.logout);

router.get("/validate", AuthController.validateSession);

router.get("/user", AuthController.getUser);

router.get("/user-identities", AuthController.getUserIdentities);

router.post("/set-session", AuthController.setSession);

router.post("/check-email", AuthController.checkEmailAvailability);

router.post("/check-username", AuthController.checkUsernameAvailability);





export default router;
