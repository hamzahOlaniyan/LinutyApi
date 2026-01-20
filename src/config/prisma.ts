import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
 const prisma = new PrismaClient({ adapter });


const connectDB = async () => {
   try {
      await prisma.$connect();
   } catch (error) {
      console.error(`Failed to connect to the database: ${error}`);
      process.exit(1);
   }
};

const disconnectDB = async () => {
   await prisma.$disconnect();
};

export { prisma, connectDB, disconnectDB };