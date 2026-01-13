import { z } from "zod";

 const loginSchema = z.object({
   email: z.string().email("email is required").trim(),
   password: z.string('passowrd id required')
});

const registerSchema = z.object({
   email: z.string({error:'email is required'}).email().trim().lowercase(),
   password: z.string({error:'password is required'}).min(3, "min 6 characters!").max(12, "max 12 characters!").trim(),
   username: z.string({error:'username is required'}).min(3, "min 3 characters!").trim(),
   firstName: z.string({error:'firstName is required'}).trim().min(3, "min 3 characters!"),
   lastName: z.string({error:'lastName is required'}).trim().min(3, "min 3 characters!"),
});

const optSchema =  z.object({
   email: z.string().email("email is required").trim(),
    otp:z.string()

})

export {loginSchema, registerSchema,optSchema }
