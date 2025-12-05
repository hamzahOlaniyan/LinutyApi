"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("./client");
async function main() {
    try {
        await client_1.prisma.$connect(); // <- actually call it
        console.log("✅ Connected to the database successfully!");
    }
    catch (err) {
        console.error("DB connection failed:", err);
    }
    finally {
        await client_1.prisma.$disconnect();
    }
}
main();
