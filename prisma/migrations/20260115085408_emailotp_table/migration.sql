/*
  Warnings:

  - The values [NULL] on the enum `RootClans` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RootClans_new" AS ENUM ('DAROOD', 'HAWIYE', 'GARDHEERE', 'DIR', 'ISAAQ', 'RAXANWEYN', 'SHEEKHAL');
ALTER TABLE "profile" ALTER COLUMN "rootClan" TYPE "RootClans_new" USING ("rootClan"::text::"RootClans_new");
ALTER TYPE "RootClans" RENAME TO "RootClans_old";
ALTER TYPE "RootClans_new" RENAME TO "RootClans";
DROP TYPE "public"."RootClans_old";
COMMIT;

-- CreateTable
CREATE TABLE "EmailOtp" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailOtp_email_purpose_idx" ON "EmailOtp"("email", "purpose");

-- CreateIndex
CREATE INDEX "EmailOtp_expiresAt_idx" ON "EmailOtp"("expiresAt");
