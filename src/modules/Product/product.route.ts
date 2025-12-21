import { Router } from "express";
import { ProductController } from "./product.controller";
import { supabaseAuth } from "../auth/auth.middleware";

const router = Router();


router.get("/feed", supabaseAuth, ProductController.listMarketplace);


router.post("/", supabaseAuth, ProductController.createProduct);
router.post("/:productId/media", ProductController.addProductMedia);

router.get("/:productId", supabaseAuth, ProductController.getProductById);
router.get("/:productId/media",supabaseAuth, ProductController.getProductMediaById);

router.patch("/:productId", supabaseAuth, ProductController.updateProductContent);

router.delete("/:productId", supabaseAuth, ProductController.deleteProduct);
router.delete("/media/:mediaId",supabaseAuth, ProductController.deleteProductMedia);



export default router;