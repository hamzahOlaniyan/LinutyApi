"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = void 0;
const prisma_1 = require("../../config/prisma");
const getProfile = async (userId) => {
    const profile = await prisma_1.prisma.profile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!profile)
        throw Error("Profile not found. Create profile first.");
    return profile;
};
exports.getProfile = getProfile;
