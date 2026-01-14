import { prisma } from "../../config/prisma";

export const getProfile = async (userId: string | undefined) => {
   const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
   });

   if (!profile) throw Error("Profile not found. Create profile first.");

   return profile;
};
