/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Clan` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProfileClan" DROP CONSTRAINT "ProfileClan_clanId_fkey";

-- DropForeignKey
ALTER TABLE "ProfileClan" DROP CONSTRAINT "ProfileClan_profileId_fkey";

-- AlterTable
ALTER TABLE "Clan" DROP COLUMN "createdAt",
ALTER COLUMN "id" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "ProfileClan" ADD CONSTRAINT "ProfileClan_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileClan" ADD CONSTRAINT "ProfileClan_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
