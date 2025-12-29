-- AlterTable
ALTER TABLE "profile" ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "profession" TEXT;

-- CreateTable
CREATE TABLE "Clan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileClan" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "clanId" UUID NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ProfileClan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppInterest" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "AppInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileAppInterests" (
    "userId" UUID NOT NULL,
    "interestId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileAppInterests_pkey" PRIMARY KEY ("userId","interestId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Clan_name_key" ON "Clan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileClan_profileId_order_key" ON "ProfileClan"("profileId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "AppInterest_name_key" ON "AppInterest"("name");

-- CreateIndex
CREATE INDEX "ProfileAppInterests_interestId_idx" ON "ProfileAppInterests"("interestId");

-- AddForeignKey
ALTER TABLE "ProfileClan" ADD CONSTRAINT "ProfileClan_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileClan" ADD CONSTRAINT "ProfileClan_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileAppInterests" ADD CONSTRAINT "ProfileAppInterests_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "AppInterest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileAppInterests" ADD CONSTRAINT "ProfileAppInterests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
