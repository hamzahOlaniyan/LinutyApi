"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optSchema = exports.registerSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email("email is required").trim(),
    password: zod_1.z.string('passowrd id required')
});
exports.loginSchema = loginSchema;
const registerSchema = zod_1.z.object({
    email: zod_1.z.string({ error: 'email is required' }).email().trim().lowercase(),
    password: zod_1.z.string({ error: 'password is required' }).min(3, "min 6 characters!").max(12, "max 12 characters!").trim(),
    username: zod_1.z.string({ error: 'username is required' }).min(3, "min 3 characters!").trim(),
    firstName: zod_1.z.string({ error: 'firstName is required' }).trim().min(3, "min 3 characters!"),
    lastName: zod_1.z.string({ error: 'lastName is required' }).trim().min(3, "min 3 characters!"),
});
exports.registerSchema = registerSchema;
const completeSchema = zod_1.z.object({
    email: zod_1.z.string({ error: 'email is required' }).email().trim().lowercase(),
    password: zod_1.z.string({ error: 'password is required' }).min(3, "min 6 characters!").max(12, "max 12 characters!").trim(),
    username: zod_1.z.string({ error: 'username is required' }).min(3, "min 3 characters!").trim(),
    firstName: zod_1.z.string({ error: 'firstName is required' }).trim().min(3, "min 3 characters!"),
    lastName: zod_1.z.string({ error: 'lastName is required' }).trim().min(3, "min 3 characters!"),
});
const optSchema = zod_1.z.object({
    email: zod_1.z.string().email("email is required").trim(),
    otp: zod_1.z.string()
});
exports.optSchema = optSchema;
