"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const post_route_1 = __importDefault(require("./modules/post/post.route"));
const cors_1 = __importDefault(require("cors"));
const auth_route_1 = __importDefault(require("./modules/auth/auth.route"));
const auth_middleware_1 = require("./modules/auth/auth.middleware");
const prisma_1 = require("./config/prisma");
require("dotenv/config");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/auth", auth_route_1.default);
app.get("/me", auth_middleware_1.supabaseAuth, async (req, res) => {
    const user = req.user; // Supabase user
    // Fetch your profile from `public.profiles` table via Prisma
    const profile = await prisma_1.prisma.profiles.findUnique({
        where: { id: user.id }
    });
    return res.json({
        authUser: {
            id: user.id,
            email: user.email,
            ...user.user_metadata
        },
        profile
    });
});
app.use("/post", post_route_1.default);
app.get("/", (req, res) => {
    res.send("Linuty API is running 🥳");
});
exports.default = app;
