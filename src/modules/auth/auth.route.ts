

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

export default router;
