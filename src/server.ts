import express, { Response, Request } from "express";
import postRoutes from "./modules/post/post.route";
import cors from "cors";
import authRoutes from "./modules/auth/auth.route";
import { supabaseAuth, AuthedRequest } from "./modules/auth/auth.middleware";
import { prisma } from "./config/prisma";
import "dotenv/config"


const app = express();
app.use(cors());
app.use(express.json());



app.use("/auth", authRoutes);
app.get("/me", supabaseAuth, async (req: AuthedRequest, res) => {
  const user = req.user; // Supabase user

  // Fetch your profile from `public.profiles` table via Prisma
  const profile = await prisma.profiles.findUnique({
    where: { id: user.id }
  });

  return res.json({
    authUser: {
      id: user.id,
      email: user.email,
      ...user.user_metadata
    },
    profile
  });
});
app.use("/post", postRoutes);

app.get("/", (req: Request, res: Response) => {
   res.send("Linuty API is running 🥳");
});

export default app;
