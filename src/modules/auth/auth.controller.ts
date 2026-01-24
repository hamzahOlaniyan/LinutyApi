import type {   Response } from "express";
import { prisma } from "../../config/prisma";
import {  AuthedRequest } from "./auth.middleware";
import { getSupabaseAdmin } from "../../config/supabase";
import { supabase } from "../../lib/supabaseClient";
import { reactToComment } from "../comments/comment.controller";
import { Resend } from "resend";
import { getProfile } from "../../utils/helpers/getProfile";
import { generateOtpCode, hashOtp } from "../../utils/helpers/generateOtp";

type completeRegistrationInput={
      country?: string;
      dateOfBirth?: string;     
      clan?: string[];     
      gender?: string | null;
      ethnicity?: string | null;
      fullName?: string | null;
      avatarUrl?: string | null;
      profession?: string | null;
      interest?: string[];     
      appInterests?: string[];
      isProfileComplete?:boolean
}
const resend = new Resend(process.env.RESEND_API_KEY!);

const supabaseAdmin = getSupabaseAdmin();



// const buildAuthResponse = (session: any, user: any, profile?:any) => {
//   return {
//     user: {
//       id: user.id,
//       email: user.email,
//       ...user.user_metadata
//     },
//     accessToken: session?.access_token,
//     refreshToken: session?.refresh_token
//   };
// };

  export async function signup(req: AuthedRequest, res: Response) {
    try {
      const { email, password, username, firstName, lastName } = req.body;

      if (!firstName || !lastName|| !email || !password || !username) return res.status(401).json({ error: "Fields cannot be left enpty!" });

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm:false
      });

      const userId = data.user?.id;
      if (!userId) return res.status(500).json({ status: "error", message: "Failed to create auth user" })


      const user = data.user;
      const fullname = `${firstName.trim()} ${lastName.trim()}`

      const profile = await prisma.profile.create({
        data: {
          userId,
          email,
          username ,
          firstName,
          lastName,
          fullName: fullname 
        },
        select:{id:true,userId:true,email:true,username:true,firstName:true,lastName
          :true,fullName:true
        }
      });

        const code = generateOtpCode(6);
        const codeHash = hashOtp(email, code);
        const ttlMin = Number(process.env.OTP_TTL_MINUTES ?? 10);
        const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);

        await prisma.emailOtp.updateMany({
          where: { email, purpose:'signup', usedAt: null },
          data: { usedAt: new Date() },
        });

        await prisma.emailOtp.create({
          data: { email, purpose: "signup", codeHash, expiresAt },
        });

       const result =  await resend.emails.send({
          from: "onboarding@resend.dev",
          to: email,
          subject: "Your Linuty verification code",
          html: `<p>Your code is <b>${code}</b>. It expires in ${ttlMin} minutes.</p>`,
        });

        
      console.log("RESEND RESULT:", result);

      return res.status(201).json({
        status: "success",
        data: profile,
        message: "Registration was successful. Please check your email for the 6 digit OTP code."
      });
    } catch (err) {
      console.error("Register error:", err);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
  

//    static async resendOtp(req:AuthedRequest,res:Response){
//     try {
//      const { error } = await supabaseAdmin.auth.resend({
//       type: 'signup',
//       email: 'email@example.com',
//       options: {
//         emailRedirectTo: 'https://example.com/welcome'
//       }
//     })
//        if (error) throw new Error(error.message ?? "Failed to get getUserIdentities");
//       //  return res.status(200).json(data);
      
//     } catch (error) {
//        console.error("failed to get user:", error);
//       return res.status(500).json({ message: "failed getUserIdentities" });
//     }
//   }

//   // POST /auth/login – unchanged logic, just a tiny improvement
//   static async login(req: AuthedRequest, res: Response) {
//     try {
//       const { email, password } = req.body;

//       if (!email || !password) {
//         return res.status(400).json({ message: "Email and password are required" });
//       }

//       const normalisedEmail = email.toLowerCase();

//       const { data, error } = await supabaseAdmin.auth.signInWithPassword({
//         email: normalisedEmail,
//         password
//       });

      
//       if (error) {
//         console.error("signInWithPassword error:", error);
//         return res.status(400).json({ message: error.message });
//       }
      
//       const { session, user } = data;

//       const profile = await prisma.profile.findUnique({
//         where: { userId: user.id },
//       });
      

//       if (!user?.email_confirmed_at) {
//         return res.status(403).json({ message: "Please verify your email with the OTP first" });
//       }

//       return res.status(200).json(buildAuthResponse(session, user, profile));
//     } catch (err) {
//       console.error("Login error:", err);
//       return res.status(500).json({ message: "Something went wrong" });
//     }
//   }

//   static async logout(req: AuthedRequest, res: Response) {
//     try {

//       console.log("Auth/session headers:", req.headers.authorization);

      
//       const authHeader = req.headers.authorization;

//       if (!authHeader?.startsWith("Bearer ")) {
//         // No token → from server POV you're already logged out
//         return res.status(200).json({ message: "Already logged out" });
//       }

//       const accessToken = authHeader.split(" ")[1];

//       // Supabase: revoke this session (refresh tokens etc.)
//       const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);

//       if (error) {
//         console.error("Supabase admin.signOut error:", error);
//         return res
//           .status(500)
//           .json({ message: "Failed to revoke Supabase session" });
//       }

//       return res.status(200).json({ message: "Logged out successfully" });
//     } catch (err) {
//       console.error("Logout error:", err);
//       return res.status(500).json({ message: "Something went wrong" });
//     }
//   }

//   static async setSession(req: AuthedRequest, res: Response) {
//     try {
//       const { data, error } = await supabaseAdmin.auth.setSession({access_token:'', refresh_token:""} );
//       if (error) throw new Error(error.message ?? "Failed to get set session");
//       return res.status(200).json(data);
//     } catch (err) {
//       console.error("failed to get session:", err);
//       return res.status(500).json({ message: "Something went wrong getting set session" });
//     }
//   }

//   static async validateSession(req: AuthedRequest, res: Response) {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader?.startsWith("Bearer ")) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const token = authHeader.slice("Bearer ".length);

//     const { data, error } = await supabaseAdmin.auth.getUser(token);

//     if (error || !data?.user) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     return res.status(200).json({ user: data.user });
//   } catch (err) {
//     console.log("ME ERROR:", err);
//     return res.status(401).json({ message: "Unauthorized" });
//   }
// }



// static async  requireAuth(req: any, res: Response, next: NextFunction) {
//   const header = req.headers.authorization;

//   if (!header?.startsWith("Bearer ")) {
//     return res.status(401).json({ message: "Unauthorized" });
//   }

//   const token = header.slice(7);
//   const { data, error } = await supabaseAdmin.auth.getUser(token);

//   if (error || !data?.user) {
//     return res.status(401).json({ message: "Unauthorized" });
//   }

//   req.user = data.user; // attach
//   next();
// }




//   static async getUser(req: AuthedRequest, res: Response) {
//     try {
//      const { data: { user }, error } = await supabaseAdmin.auth.getUser( )
//       if (error) throw new Error(error.message ?? "Failed to get user");
//       return res.status(200).json(user);
//     } catch (err) {
//       console.error("failed to get user:", err);
//       return res.status(500).json({ message: "Something went wrong getting user" });
//     }
//   }

//   static async getUserIdentities(req:AuthedRequest,res:Response){
//     try {
//       const { data, error } = await supabaseAdmin.auth.getUserIdentities()
//        if (error) throw new Error(error.message ?? "Failed to get getUserIdentities");
//        return res.status(200).json(data);
      
//     } catch (error) {
//        console.error("failed to get user:", error);
//       return res.status(500).json({ message: "failed getUserIdentities" });
//     }
//   }

  export async function checkEmail (req:AuthedRequest,res:Response) {
    try {
      const { email } = req.body

      if (!email) return res.status(400).json({status: "failed", message: "Email is required!" });

      const existingProfile = await prisma.profile.findUnique({
        where: { email }
      });

      if (existingProfile) return res.json({status: "success", message: "Email is already in use! try another email.",  available:false  });

      return res.json({ status:"success", message: "Email is available", available:true });

    } catch (error) {
      console.error("checkEmailAvailability error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  };

  export async function checkUsername(req:AuthedRequest,res:Response){
   try {
    const { username } = req.body;

    if (!username) return res.status(400).json({status: "failed", message: "username is required" });

    const existingProfile = await prisma.profile.findUnique({
      where: { username }
    });

    if (existingProfile) return res.status(409).json({ status:"failed", message: "Username is already in use! try another email.", available:false });

    return res.status(200).json({ status:"success", message:"Username is available", available:true });

  } catch (error) {
    console.error("checkusernameAvailability error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
  }

   export async function resetPassword(req:AuthedRequest,res:Response){
    try {
      const { email } = req.body;

      if (!email) return res.status(400).json({status: "failed", message: "email is required" });

      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email,{redirectTo: "linutyapp://reset-password"})

      if (error) return res.status(401).json({ status:"failed", message: `failed to reset password ${error.message}`});

      return res.status(200).json({ status:"success",message: "If an account with that email exists, a reset link has been sent.",});

    } catch (error) {
      console.error("resetPassword error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
}

  export async function completeRegistration(req: AuthedRequest, res: Response){
  try {
    const authUserId = req.user.id;
    const body = req.body as completeRegistrationInput;

    const result = await prisma.$transaction(async (tx) => {
      // ✅ find profile by userId (auth user id)
      const me = await tx.profile.findUnique({ where: { userId: authUserId } });
      if (!me) return null;

      const profile = await tx.profile.update({
        where: { userId: authUserId },
         data: {
          country: body.country,
          dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
          gender: body.gender,
          fullName:body.fullName,
          ethnicity: body.ethnicity,
          avatarUrl: body.avatarUrl,
          profession: body.profession,
          isProfileComplete: true,
         },
      });

      // ---------- CLAN TREE ----------
      if (Array.isArray(body.clan)) {
        await tx.profileClan.deleteMany({ where: { profileId: profile.id } });

        const names = body.clan.map((n) => String(n).trim()).filter(Boolean);

        for (let i = 0; i < names.length; i++) {
          const clan = await tx.clan.upsert({
            where: { name: names[i] },
            create: { name: names[i] },
            update: {},
          });

          await tx.profileClan.create({
            data: { profileId: profile.id, clanId: clan.id, order: i },
          });
        }
      }

      // ---------- INTERESTS ----------
      if (Array.isArray(body.interest)) {
        await tx.profileInterest.deleteMany({ where: { userId: profile.id } });

        const names = [...new Set(body.interest.map((n) => String(n).trim()).filter(Boolean))];

        for (const name of names) {
          const interest = await tx.interest.upsert({
            where: { name },
            create: { name },
            update: {},
          });

          await tx.profileInterest.create({
            data: { userId: profile.id, interestId: interest.id },
          });
        }
      }

      // ---------- APP INTERESTS ----------
      if (Array.isArray(body.appInterests)) {
        await tx.profileAppInterests.deleteMany({ where: { userId: profile.id } });

        const names = [...new Set(body.appInterests.map((n) => String(n).trim()).filter(Boolean))];

        const rows = await Promise.all(
          names.map(async (name) =>
            tx.appInterest.upsert({
              where: { name },
              create: { name },
              update: {},
              select: { id: true },
            })
          )
        );

      await tx.profileAppInterests.createMany({
        data: rows.map((r) => ({
          userId: profile.id,
          interestId: r.id,
        })),
        skipDuplicates: true,
      });
      }

      return tx.profile.findUnique({
        where: { id: profile.id },
        include: {
          clan: { orderBy: { order: "asc" }, include: { clan: true } },
          interests: { include: { interest: true } },
          appInterests: { include: { interest: true } },
        },
      });
    },{timeout: 20000});

    if (!result) return res.status(404).json({ message: "Profile not found" });

    return res.status(200).json({status:"success", data:result, message:'Suceessfully completed profile'});
  } catch (error: any) {
    console.error("completeRegistration error:", error);
    return res.status(500).json({ message: error?.message ?? "Internal server error" });
  }
}

export async function signIn(req:AuthedRequest,res:Response) {
  const {email,password} = req.body

  const {data,error}= await supabaseAdmin.auth.signInWithPassword({
    email,password
  })

  if(error) res.status(409).json({message:"something went wrong signing in"})

  res.status(201).json({status:"success", data: data})
  
}

export async function logout(req:AuthedRequest,res:Response) {

  const {error}= await supabaseAdmin.auth.signOut()

  if(error) res.status(409).json({message:"something went wrong login out"})

  res.status(201).json({status:"success", message: "Successfully logged out"})
  
}

export async function sendEmailOtp(req: any, res: any) {
  const { email, purpose = "signup" } = req.body as { email: string; purpose?: string };
  if (!email) return res.status(400).json({ status: "error", message: "email is required" });

  const code = generateOtpCode(6);
  const codeHash = hashOtp(email, code);

  const ttlMin = Number(process.env.OTP_TTL_MINUTES ?? 10);
  const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);

  // Optional: invalidate old unused OTPs for this email+purpose
  await prisma.emailOtp.updateMany({
    where: { email, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.emailOtp.create({
    data: { email, purpose, codeHash, expiresAt },
  });

  await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to: email,
    subject: "Your verification code",
    html: `<p>Your code is <b>${code}</b>. It expires in ${ttlMin} minutes.</p>`,
  });

  return res.status(200).json({ status: "success", message: "OTP sent" });
}

export async function verifyEmailOtp(req: any, res: any) {
  const { email, code, purpose = "signup" } = req.body as {
    email: string;
    code: string;
    purpose?: string;
  };

  if (!email || !code) {
    return res.status(400).json({ status: "error", message: "email and code are required" });
  }

  const now = new Date();
  const codeHash = hashOtp(email, code);

  const otp = await prisma.emailOtp.findFirst({
    where: {
      email,
      purpose,
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return res.status(400).json({ status: "error", message: "Invalid or expired code" });
  }

  // basic brute-force guard
  if (otp.attempts >= 5) {
    return res.status(429).json({ status: "error", message: "Too many attempts" });
  }

  if (otp.codeHash !== codeHash) {
    await prisma.emailOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return res.status(400).json({ status: "error", message: "Invalid or expired code" });
  }

    await prisma.emailOtp.update({
      where: { id: otp.id } ,
      data: { usedAt: now },
    });

    await prisma.profile.update({
      where: { email },
      data: { isVerified: true },
    });

    const { data } = await supabaseAdmin.auth.admin.listUsers();

    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) return res.status(404).json({ status: "error", message: "User not found" });

    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });
  
    return res.status(200).json({ status: "success", message: "email verified!", verified:true });
}



