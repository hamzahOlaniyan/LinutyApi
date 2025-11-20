import { Router } from "express";
import { getAllProfiles } from "../controllers/profilesController";

const route = Router();

route.get("/", getAllProfiles);

export default route;
