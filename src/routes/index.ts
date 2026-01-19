import { Router } from "express";
import authRoutes from "../modules/auth/auth.route";
import profileRoutes from "../modules/profile/profile.route";
import feedRouter from "../modules/feed/feed.route";
import postRoutes from "../modules/post/post.route";
import commentRoutes from "../modules/comments/comments.route";
import productRoutes from "../modules/product/product.route";
import friendsRoutes from "../modules/friends/friends.route";
import notificationRoutes from "../modules/notification/notification.route";
import mediaRouter from "../modules/media/media.routes";

const rootRouter:Router = Router()

rootRouter.use("/auth", authRoutes)
rootRouter.use("/profile",profileRoutes )
rootRouter.use("/feed",feedRouter )
rootRouter.use("/post", postRoutes);
rootRouter.use("/", commentRoutes);
rootRouter.use("/product", productRoutes);
rootRouter.use("/friends", friendsRoutes);
rootRouter.use("/notifications", notificationRoutes);
rootRouter.use("/media", mediaRouter);



export {rootRouter}