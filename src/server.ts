import express, { Response, Request } from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.route";
import profileRoutes from "./modules/profile/profile.route";
import postRoutes from "./modules/post/post.route";
import notificationRoutes from "./modules/notification/notification.route";
import chatRoutes from "./modules/chat/chat.route";
import lineageRoutes from "./modules/lineage/lineage.route";
import kinshipRoutes from "./modules/kinship/kinship.route";
import commentRoutes from "./modules/comments/comments.route";
import feedRoutes from "./modules/feed/feed.route";
import discoveryRoutes from "./modules/discovery/discovery.route";
import uploadRoutes from "./modules/upload/upload.routes";
import mediaRoutes from "./modules/media/media.routes";
import searchRoutes from "./modules/search/search.route";
import { supabaseAuth, AuthedRequest } from "./modules/auth/auth.middleware";
import { prisma } from "./config/prisma";
import "dotenv/config"


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));





app.use("/auth", authRoutes);
app.use("/feed", feedRoutes);
app.use("/profile", profileRoutes);
app.use("/post", postRoutes);
app.use("/", commentRoutes);

app.use("/notifications", notificationRoutes);
app.use("/conversations", chatRoutes);
app.use("/lineages", lineageRoutes);
app.use("/kinships", kinshipRoutes);
app.use("/discovery", discoveryRoutes);
app.use("/search", searchRoutes);
app.use("/internal/media", mediaRoutes);
app.use("/uploads", uploadRoutes);

// app.get("/me", supabaseAuth, async (req: AuthedRequest, res) => {
//   const user = req.user; 

//   // Fetch your profile from `public.profiles` table via Prisma
//   const profile = await prisma.profile.findUnique({
//     where: { id: user.id }
//   });

//   return res.json({
//     authUser: {
//       id: user.id,
//       email: user.email,
//       ...user.user_metadata
//     },
//     profile
//   });
// });

app.get("/", (req: Request, res: Response) => {
   res.send("Linuty API is running 🥳");
});

export default app;
