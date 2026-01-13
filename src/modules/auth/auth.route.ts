import { Router } from "express";
import { vaildator } from "../../middleware/validate";
import { loginSchema, optSchema, registerSchema } from "./auth.schema";
import { supabaseAuth } from "./auth.middleware";
import { checkEmail,  checkUsername,  register, verifyOtp } from "./auth.controller";

const authRoutes:Router = Router();

authRoutes.post("/register", vaildator(registerSchema), register);
authRoutes.post("/otp", vaildator(optSchema), verifyOtp);




// authRoutes.post("/login", vaildator(loginSchema), AuthController.login);
// authRoutes.post("/me/complete", supabaseAuth,vaildator(loginSchema), AuthController.completeRegistration);

// authRoutes.post("/logout", AuthController.logout);

// authRoutes.get("/validate", AuthController.validateSession);

// authRoutes.get("/user", AuthController.getUser);

// authRoutes.get("/user-identities", AuthController.getUserIdentities);

// authRoutes.post("/set-session", AuthController.setSession);

authRoutes.post("/check-email", checkEmail);
authRoutes.post("/check-username", checkUsername);








export default authRoutes;
