import { Router } from "express";
import { vaildator } from "../../middleware/validate";
import { loginSchema, optSchema, registerSchema } from "./auth.schema";
import { supabaseAuth } from "./auth.middleware";
import { checkEmail,  checkUsername,  completeRegistration,  logout,  register, resetPassword, signIn, verifyOtp } from "./auth.controller";

const authRoutes:Router = Router();

authRoutes.post("/register", vaildator(registerSchema), register);
authRoutes.post("/otp", vaildator(optSchema), verifyOtp);

authRoutes.post("/me/complete", supabaseAuth, completeRegistration);


// authRoutes.get("/validate", AuthController.validateSession);

// authRoutes.get("/user", AuthController.getUser);

// authRoutes.get("/user-identities", AuthController.getUserIdentities);

// authRoutes.post("/set-session", AuthController.setSession);

authRoutes.post("/check-email", checkEmail);
authRoutes.post("/check-username", checkUsername);

authRoutes.post("/reset-password", resetPassword);

authRoutes.post("/signin", signIn);
authRoutes.post("/logout", logout);





export default authRoutes;
