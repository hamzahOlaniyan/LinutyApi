"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const supabase_1 = require("../../config/supabase");
const prisma_1 = require("../../config/prisma");
const buildAuthResponse = (session, user) => {
    return {
        user: {
            id: user.id,
            email: user.email,
            ...user.user_metadata
        },
        accessToken: session?.access_token,
        refreshToken: session?.refresh_token
    };
};
class AuthController {
    // POST /auth/register
    static async register(req, res) {
        try {
            const { email, password, username } = req.body;
            if (!email || !password) {
                return res.status(400).json({ message: "Email and password are required" });
            }
            const normalisedEmail = email.toLowerCase();
            // 1️⃣ Check if email already exists in auth.users
            const existingUser = await prisma_1.prisma.users.findFirst({
                where: { email: normalisedEmail }
            });
            if (existingUser) {
                return res.status(409).json({ message: "Email already registered" });
            }
            // 2️⃣ If username provided, check if it already exists in profiles
            if (username) {
                const existingProfile = await prisma_1.prisma.profiles.findUnique({
                    where: { username }
                });
                if (existingProfile) {
                    return res.status(409).json({ message: "Username already taken" });
                }
            }
            // 3️⃣ Create user in Supabase (this will create a row in auth.users)
            const { data, error } = await supabase_1.supabaseAdmin.auth.signUp({
                email: normalisedEmail,
                password,
                options: {
                    data: { username }
                }
            });
            if (error) {
                console.error("Supabase signUp error:", error);
                return res.status(400).json({ message: error.message });
            }
            // Supabase will handle sending OTP email if OTP/confirmation is enabled
            return res.status(200).json({
                message: "User registered. Please check your email for the OTP code."
            });
        }
        catch (err) {
            console.error("Register error:", err);
            return res.status(500).json({ message: "Something went wrong" });
        }
    }
    // POST /auth/verify-otp
    static async verifyOtp(req, res) {
        try {
            const { email, otp } = req.body;
            if (!email || !otp) {
                return res.status(400).json({ message: "Email and OTP are required" });
            }
            const normalisedEmail = email.toLowerCase();
            const { data, error } = await supabase_1.supabaseAdmin.auth.verifyOtp({
                email: normalisedEmail,
                token: otp,
                type: "email" // OTP from email
            });
            if (error) {
                console.error("verifyOtp error:", error);
                return res.status(400).json({ message: error.message });
            }
            const { session, user } = data;
            if (!session || !user) {
                return res.status(400).json({ message: "Invalid or expired OTP" });
            }
            // ensure profile exists in public.profiles
            const existingProfile = await prisma_1.prisma.profiles.findUnique({
                where: { id: user.id }
            });
            if (!existingProfile) {
                await prisma_1.prisma.profiles.create({
                    data: {
                        id: user.id,
                        email: user.email ?? undefined,
                        username: user.user_metadata?.username ?? null
                    }
                });
            }
            return res.status(200).json(buildAuthResponse(session, user));
        }
        catch (err) {
            console.error("verifyOtp controller error:", err);
            return res.status(500).json({ message: "Something went wrong" });
        }
    }
    // POST /auth/login – unchanged logic, just a tiny improvement
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ message: "Email and password are required" });
            }
            const normalisedEmail = email.toLowerCase();
            const { data, error } = await supabase_1.supabaseAdmin.auth.signInWithPassword({
                email: normalisedEmail,
                password
            });
            if (error) {
                console.error("signInWithPassword error:", error);
                return res.status(400).json({ message: error.message });
            }
            const { session, user } = data;
            if (!user?.email_confirmed_at) {
                return res.status(403).json({ message: "Please verify your email with the OTP first" });
            }
            return res.status(200).json(buildAuthResponse(session, user));
        }
        catch (err) {
            console.error("Login error:", err);
            return res.status(500).json({ message: "Something went wrong" });
        }
    }
    static async logout(req, res) {
        try {
            return res.status(200).json({ message: "Logged out (client should clear tokens)" });
        }
        catch (err) {
            console.error("Logout error:", err);
            return res.status(500).json({ message: "Something went wrong" });
        }
    }
}
exports.AuthController = AuthController;
