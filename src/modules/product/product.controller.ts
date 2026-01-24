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
      const products = await prisma.product.findMany({
      include: {
          media: { orderBy: { orderIndex: "asc" }, take: 1 }, // cover only for feed
          seller: { select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true } }
      }
      }
  );
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
  
      const product = await prisma.product.findUnique({ where: { id: media.productId} });
      if (!product || product.sellerId !== me.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
  
      await prisma.productMedia.delete({ where: { id: mediaId } });
      return res.status(204).send();
    } catch (error) {
      console.log("failed to delete media ❌", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  static async updateProductContent(req: AuthedRequest, res: Response) {
      try {
        const me = await getCurrentProfile(req);
        if (!me) return res.status(401).json({ message: "Unauthenticated" });
  
        const { productId } = req.params;
        const body = req.body as CreateProductInput;
  
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) return res.status(404).json({ message: "product not found" });
        if (product.sellerId !== me.id) return res.status(403).json({ message: "Forbidden" });
  
        const updated = await prisma.product.update({
          where: { id: productId },
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
  
        return res.status(200).json(updated);
      } catch (error) {
        console.log("failed to update post ❌", error);
        return res.status(500).json({ message: "Server error" });
      }
  }

static async addProductMedia(req: AuthedRequest, res: Response) {
  try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const { productId } = req.params;

    const { images } = req.body as {
      images?: Array<{
        url: string;
        mimeType?: string;
        sizeBytes?: number;
        width?: number | null;
        height?: number | null;
      }>;
    };

    if (!images?.length) {
      return res.status(400).json({ message: "No images provided" });
    }

    // optional: verify post exists (and belongs to user)
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: "product not found" });
    if (product.sellerId !== me.id) return res.status(403).json({ message: "Forbidden" });

    const created = await prisma.$transaction(
      images.map((img) =>
        prisma.productMedia.create({
          data: {
            productId,
            // type: "IMAGE",
            url: img.url,
            mimeType: img.mimeType ?? "image/jpeg",
            sizeBytes: img.sizeBytes ?? 0,
            width: img.width ?? null,
            height: img.height ?? null
          }
        })
      )
    );

    return res.status(201).json(created);
  } catch (error) {
    console.log("failed to add post media ❌", error);
    return res.status(500).json({ message: "Server error" });
  }
  }
  
  static async getProductMediaById(req: AuthedRequest, res: Response) {
  try {
    const me = await getCurrentProfile(req);
    if (!me) return res.status(401).json({ message: "Unauthenticated" });

    const { productId } = req.params;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: "product not found" });
    if (product.sellerId !== me.id) return res.status(403).json({ message: "Forbidden" });


    const media = await prisma.productMedia.findMany({ where: { productId }, });
    if (!media) return res.status(404).json({ message: "Media not found" });

    return res.status(200).json(media);
  } catch (error) {
    console.log("failed to delete media ❌", error);
    return res.status(500).json({ message: "Server error" });
  }
  }

  static async getProductProfileId(req: AuthedRequest, res: Response) {
    try {
          const { profileId } = req.params;

          const product = await prisma.product.findMany({
              where: { sellerId:  profileId},
          });

          if (!product) {
          return res.status(404).json({ message: "Product not found" });
          }

          return res.json({ data: product });
      } catch (err) {
          console.error("getProductById error:", err);
          return res.status(500).json({ message: "Internal server error" });
      }

  }
    // static async deleteMedia(req: AuthedRequest, res: Response) {
    //   try {
    //     const me = await getCurrentProfile(req);
    //     if (!me) return res.status(401).json({ message: "Unauthenticated" });

    //     const { mediaId } = req.params; // ✅ correct param name
    //     if (!mediaId) return res.status(400).json({ message: "mediaId is required" });

    //     const media = await prisma.productMedia
    //     .findUnique({ where: { id: mediaId } });
    //     if (!media) return res.status(404).json({ message: "Media not found" });

    //     const product = await prisma.product.findUnique({ where: { id: media.productId } });
    //     if (!product || product.sellerId !== me.id) {
    //       return res.status(403).json({ message: "Forbidden" });
    //     }

    //     await prisma.productMedia.delete({ where: { id: mediaId } });
    //     return res.status(204).send();
    //   } catch (error) {
    //     console.log("failed to delete media ❌", error);
    //     return res.status(500).json({ message: "Server error" });
    //   }
    // }






}