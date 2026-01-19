"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDB = exports.connectDB = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
require("dotenv/config");
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new client_1.PrismaClient({ adapter });
exports.prisma = prisma;
const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log("Db connected via prisma");
    }
    catch (error) {
        console.error(`Failed to connect to the database: ${error}`);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
const disconnectDB = async () => {
    await prisma.$disconnect();
};
exports.disconnectDB = disconnectDB;
