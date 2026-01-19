import { Router } from "express";
import { supabaseAuth } from "../auth/auth.middleware";
import { ProductController } from "./product.controller";

const productRoutes = Router();


productRoutes.get("/feed", supabaseAuth, ProductController.listMarketplace);


productRoutes.post("/", supabaseAuth, ProductController.createProduct);
productRoutes.post("/:productId/media", ProductController.addProductMedia);

productRoutes.get("/:productId", supabaseAuth, ProductController.getProductById);
productRoutes.get("/:productId/media",supabaseAuth, ProductController.getProductMediaById);

productRoutes.patch("/:productId", supabaseAuth, ProductController.updateProductContent);

productRoutes.delete("/:productId", supabaseAuth, ProductController.deleteProduct);
productRoutes.delete("/media/:mediaId",supabaseAuth, ProductController.deleteProductMedia);



export default productRoutes;