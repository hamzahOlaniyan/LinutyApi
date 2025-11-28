"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const router = (0, express_1.Router)();
// /auth/register -> create Supabase user, send OTP email
router.post("/register", auth_controller_1.AuthController.register);
// /auth/verify-otp -> verify OTP from email, confirm email, return tokens
router.post("/verify-otp", auth_controller_1.AuthController.verifyOtp);
// /auth/login -> normal email/password login
router.post("/login", auth_controller_1.AuthController.login);
// /auth/logout -> client should clear tokens
router.post("/logout", auth_controller_1.AuthController.logout);
exports.default = router;
