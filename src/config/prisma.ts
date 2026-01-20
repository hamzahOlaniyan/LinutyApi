import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL env not set");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

const connectDB = async () => {
  await prisma.$connect();
};

const disconnectDB = async () => {
   await prisma.$disconnect();
};

export { prisma, connectDB, disconnectDB };