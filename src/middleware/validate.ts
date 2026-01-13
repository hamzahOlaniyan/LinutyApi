import type { NextFunction, Request, Response } from "express";
import type z from "zod";

export const vaildator = (schema: z.ZodSchema) => {
   return (req: Request, res: Response, next: NextFunction) => {
      const result = schema.safeParse(req.body);
      if (!result.success) {
         const { fieldErrors, formErrors } = result.error.flatten();
         return res.status(400).json({
            status: "error",
            message: "Validation error",
            errors: {
               ...fieldErrors,
               formErrors,
            },
         });
      }
      req.body = result.data;
      next();
   };
};



// export function validateQuery(schema: ZodSchema<any>) {
//   return (req: Request, _res: Response, next: NextFunction) => {
//     const result = schema.safeParse(req.query);

//     if (!result.success) {
//       const message =
//         result.error.issues[0]?.message || "Invalid query params";
//       return next({
//         statusCode: 400,
//         message
//       });
//     }

//     req.query = result.data;
//     next();
//   };
// }


