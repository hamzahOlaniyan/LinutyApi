import { prisma } from "../config/prisma";

async function main() {
   try {
      await prisma.$connect(); // <- actually call it
      console.log("✅ Connected to the database successfully!");
   } catch (err) {
      console.error("DB connection failed:", err);
   } finally {
      await prisma.$disconnect();
   }
}

main();
