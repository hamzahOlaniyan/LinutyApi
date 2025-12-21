import { Router } from "express";
import { ProductController } from "./product.controller";
import { supabaseAuth } from "../auth/auth.middleware";

const router = Router();


router.post("/", supabaseAuth, ProductController.createProduct);

router.get("/feed", supabaseAuth, ProductController.listMarketplace);
router.get("/:productId", supabaseAuth, ProductController.getProductById);

router.delete("/:productId", supabaseAuth, ProductController.deleteProduct);



export default router;