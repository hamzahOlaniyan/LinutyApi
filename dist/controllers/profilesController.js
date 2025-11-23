"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllProfiles = void 0;
const client_1 = require("../db/client");
const getAllProfiles = async (req, res) => {
    try {
        const profiles = await client_1.prisma.profiles.findMany();
        res.status(200).json(profiles);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getAllProfiles = getAllProfiles;
