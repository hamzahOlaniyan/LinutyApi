import { Router } from "express";
import { getAllPost, getPostById } from "../controllers/postsController";

const route = Router();

route.get("/", getAllPost);
route.get("/:id", getPostById);

export default route;
