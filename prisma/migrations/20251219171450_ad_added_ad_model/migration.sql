-- CreateEnum
CREATE TYPE "Available" AS ENUM ('IMMEDIATLY', 'IN_A_WEEK', 'IN_A_MONTH', 'OTHER');

-- DropIndex
DROP INDEX "Notification_recipientId_actorId_type_postId_key";

-- CreateTable
CREATE TABLE "Ad" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "visibility" "PostVisibility" NOT NULL DEFAULT 'PUBLIC',
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "condition" "Available" NOT NULL,
    "availability" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdMediaFile" (
    "id" UUID NOT NULL,
    "AdId" UUID NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdMediaFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdMediaFile_AdId_idx" ON "AdMediaFile"("AdId");

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdMediaFile" ADD CONSTRAINT "AdMediaFile_AdId_fkey" FOREIGN KEY ("AdId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
