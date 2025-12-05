// src/middleware/validate.ts
import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

export function validateBody(schema: ZodSchema<any>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message =
        result.error.issues[0]?.message || "Invalid request body";
      return next({
        statusCode: 400,
        message
      });
    }

    // use parsed data (correct types / defaults)
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema<any>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const message =
        result.error.issues[0]?.message || "Invalid query params";
      return next({
        statusCode: 400,
        message
      });
    }

    req.query = result.data;
    next();
  };
}
