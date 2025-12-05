"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAuth = supabaseAuth;
const supabase_1 = require("../../config/supabase");
async function supabaseAuth(req, res, next) {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Missing or invalid Authorization header" });
        }
        const token = header.split(" ")[1];
        const { data: { user }, error } = await supabase_1.supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            console.error("supabase getUser error:", error);
            return res.status(401).json({ message: "Invalid token" });
        }
        // Ensure email is verified
        if (!user.email_confirmed_at) {
            return res.status(403).json({ message: "Email not verified" });
        }
        // attach Supabase user object to request
        req.user = user;
        next();
    }
    catch (err) {
        console.error("Auth middleware error:", err);
        return res.status(500).json({ message: "Auth error" });
    }
}
