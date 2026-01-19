"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireProfileComplete = requireProfileComplete;
const prisma_1 = require("../../config/prisma");
async function requireProfileComplete(req, res, next) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ message: "Unauthenticated" });
        const profile = await prisma_1.prisma.profile.findUnique({
            where: { userId: user.id }
        });
        if (!profile || !profile.isProfileComplete) {
            return res.status(403).json({
                message: "Profile not complete. Please finish onboarding."
            });
        }
        // optionally attach profile for later use
        req.profile = profile;
        next();
    }
    catch (err) {
        console.error("requireProfileComplete error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}
