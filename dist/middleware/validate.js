"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vaildator = void 0;
const vaildator = (schema) => {
    return (req, res, next) => {
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
exports.vaildator = vaildator;
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
