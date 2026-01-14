/*
  Warnings:

  - You are about to drop the column `lineageId` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `occupation` on the `profile` table. All the data in the column will be lost.
  - You are about to drop the `Kinship` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Lineage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LineageMembership` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `gender` on table `profile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `dateOfBirth` on table `profile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `avatarUrl` on table `profile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ethnicity` on table `profile` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "RootClans" AS ENUM ('DAROOD', 'HAWIYE', 'GARDHEERE', 'DIR', 'ISAAQ', 'RAXANWEYN', 'SHEEKHAL', 'NULL');

-- DropForeignKey
ALTER TABLE "Kinship" DROP CONSTRAINT "Kinship_profileIdA_fkey";

-- DropForeignKey
ALTER TABLE "Kinship" DROP CONSTRAINT "Kinship_profileIdB_fkey";

-- DropForeignKey
ALTER TABLE "Lineage" DROP CONSTRAINT "Lineage_createdById_fkey";

-- DropForeignKey
ALTER TABLE "LineageMembership" DROP CONSTRAINT "LineageMembership_addedById_fkey";

-- DropForeignKey
ALTER TABLE "LineageMembership" DROP CONSTRAINT "LineageMembership_lineageId_fkey";

-- DropForeignKey
ALTER TABLE "LineageMembership" DROP CONSTRAINT "LineageMembership_profileId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_lineageId_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_lineageId_fkey";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "lineageId";

-- AlterTable
ALTER TABLE "profile" DROP COLUMN "occupation",
ADD COLUMN     "rootClan" "RootClans",
ALTER COLUMN "gender" SET NOT NULL,
ALTER COLUMN "dateOfBirth" SET NOT NULL,
ALTER COLUMN "location" DROP NOT NULL,
ALTER COLUMN "bio" DROP NOT NULL,
ALTER COLUMN "bio" SET DEFAULT '',
ALTER COLUMN "avatarUrl" SET NOT NULL,
ALTER COLUMN "ethnicity" SET NOT NULL;

-- DropTable
DROP TABLE "Kinship";

-- DropTable
DROP TABLE "Lineage";

-- DropTable
DROP TABLE "LineageMembership";

-- DropEnum
DROP TYPE "KinshipType";

-- DropEnum
DROP TYPE "LineageRole";

-- DropEnum
DROP TYPE "LineageType";
