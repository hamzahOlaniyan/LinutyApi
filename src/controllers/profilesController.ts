import { Request, Response } from "express";

import { prisma } from "../db/client";
export const getAllProfiles = async (req: Request, res: Response) => {
   try {
      const profiles = await prisma.profiles.findMany();
      res.status(200).json(profiles);
   } catch (error: any) {
      res.status(500).json({ error: error.message });
   }
};
