"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../config/prisma");
async function main() {
    try {
        await prisma_1.prisma.$connect(); // <- actually call it
        console.log("✅ Connected to the database successfully!");
    }
    catch (err) {
        console.error("DB connection failed:", err);
    }
    finally {
        await prisma_1.prisma.$disconnect();
    }
}
main();
