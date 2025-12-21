import {  ProductCondition, ListingStatus,Available } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AuthedRequest } from "../auth/auth.middleware";
import {  Response } from "express";



type CreateProductInput = {
  title: string;
  description?: string;
  price: number;
  currency?: string;
  condition?: ProductCondition;
  category?: string;
  availability?: Available;
  negotiable?: boolean;
  status?: ListingStatus;
  locationText?: string;
  city?: string;
  district?: string;
  country?: string;
  lat?: number;
  lng?: number;

  images?: Array<{
    url: string;
    mimeType: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
    orderIndex?: number;
    isCover?: boolean;
  }>;
};


async function getCurrentProfile(req: AuthedRequest) {
  const userId = req.user?.id as string | undefined;
  if (!userId) return null;

  return prisma.profile.findUnique({
    where: { userId }
  });
}
export class ProductController{
    static async  createProduct(req: AuthedRequest, res: Response) {
    try {
        const me = await getCurrentProfile(req);
        if (!me) return res.status(401).json({ message: "Unauthenticated" });

        const body = req.body as CreateProductInput;

        const product = await prisma.product.create({
        data: {
            sellerId: me.id,
            title: body.title.trim(),
            description: body.description?.trim() as string,
            price: body.price,
            currency: body.currency ?? "NGN",
            condition: body.condition ?? "USED_GOOD",
            category: body.category ?? "OTHER",
            availability: body.availability ?? "IMMEDIATLY",
            negotiable: body.negotiable ?? true,
            status: body.status ?? "DRAFT",
            locationText: body.locationText,
            city: body.city,
            district: body.district,
            country: body.country,
            lat: body.lat,
            lng: body.lng,
            publishedAt: body.status === "ACTIVE" ? new Date() : null,
        }
        });

        
        if (body.images?.length) {
            await prisma.productMedia.createMany({
                data: body.images.map((img,idx)=>({
                    productId: product.id,
                    url: img.url,
                    mimeType: img.mimeType,
                    width: img.width,
                    height: img.height,
                    sizeBytes: img.sizeBytes ?? 0,
                    orderIndex: img.orderIndex ?? idx,
                    isCover: img.isCover ?? idx === 0
                }))
            })
        }

        

        // if (body.images?.length) {
        //     imageMedia = await prisma.$transaction(
        //         images.map((img, idx)=> prisma.productMedia.create({
        //          data:{
        //             productId: product.id,
        //             url: img.url,
        //             mimeType: img.mimeType,
        //             width: img.width,
        //             height: img.height,
        //             sizeBytes: BigInt(img.sizeBytes ?? 0),
        //             orderIndex: img.orderIndex ?? idx,
        //             isCover: img.isCover ?? idx === 0
        //             }
        //         }))
        //     )
        // }
        return res.status(201).json({ data: product,message: "new product created successfully" });
    } catch (err) {
        console.error("createProduct error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
    }

    static async  getProductById(req: AuthedRequest, res: Response) {
        try {
            const { productId } = req.params;

            const product = await prisma.product.findUnique({
                where: { id: productId },
                include:{
                    seller:{
                        select:{
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatarUrl: true,
                        }
                    }, media: true},
            });

            if (!product || product.deletedAt) {
            return res.status(404).json({ message: "Product not found" });
            }

            return res.json({ data: product });
        } catch (err) {
            console.error("getProductById error:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    static async  listMarketplace(req: AuthedRequest, res: Response) {
    try {
        // const limit = Math.min(Number(req.query.limit) || 20, 50);
        // const cursor = req.query.cursor as string | undefined;

        // const city = (req.query.city as string | undefined) ?? undefined;
        // const q = (req.query.q as string | undefined)?.trim();

        const products = await prisma.product.findMany(
            {
        // take: limit + 1,
        // ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        // where: {
        //     deletedAt: null,
        //     status: "ACTIVE",
        //     ...(city ? { city } : {}),
        //     ...(q
        //     ? {
        //         OR: [
        //             { title: { contains: q, mode: "insensitive" } },
        //             { description: { contains: q, mode: "insensitive" } }
        //         ]
        //         }
        //     : {})
        // },
        // orderBy: { createdAt: "desc" },
        include: {
            media: { orderBy: { orderIndex: "asc" }, take: 1 }, // cover only for feed
            seller: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } }
        }
        }
    );

        // let nextCursor: string | null = null;
        // if (products.length > limit) {
        // const last = products.pop();
        // nextCursor = last?.id ?? null;
        // }

        return res.json({ data: products });
    } catch (err) {
        console.error("listMarketplace error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
    }

static async deleteProduct(req: AuthedRequest, res: Response) {
    try {
      const me = await getCurrentProfile(req);
      if (!me) {
        return res.status(401).json({ message: "Unauthenticated" });
      }

      const { productId } = req.params;

      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, sellerId: true }
      });

      if (!product) {
        return res.status(404).json({ message: "product not found" });
      }

      if (product.sellerId !== me.id) {
        return res.status(403).json({ message: "Not allowed to delete this post" });
      }

      await prisma.product.delete({ where: { id: productId } });

      return res.status(200).json({ message: "Post deleted " });
    } catch (error) {
      console.error("deletePost error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async deleteProductMedia(req: AuthedRequest, res: Response) {
    try {
      const me = await getCurrentProfile(req);
      if (!me) return res.status(401).json({ message: "Unauthenticated" });
  
      const { mediaId } = req.params; // ✅ correct param name
      if (!mediaId) return res.status(400).json({ message: "mediaId is required" });
  
      const media = await prisma.productMedia.findUnique({ where: { id: mediaId } });
      if (!media) return res.status(404).json({ message: "Media not found" });
  
      const product = await prisma.product.findUnique({ where: { id: media.id } });
      if (!product || product.sellerId !== me.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
  
      await prisma.mediaFile.delete({ where: { id: mediaId } });
      return res.status(204).send();
    } catch (error) {
      console.log("failed to delete media ❌", error);
      return res.status(500).json({ message: "Server error" });
    }
  }




}