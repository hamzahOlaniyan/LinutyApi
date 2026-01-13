import { Router } from "express";
import authRoutes from "../modules/auth/auth.route";

const rootRouter:Router = Router()

rootRouter.use("/auth", authRoutes)

export {rootRouter}