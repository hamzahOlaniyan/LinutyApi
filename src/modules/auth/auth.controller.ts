// src/modules/auth/auth.controller.ts
import type {  NextFunction, Response } from "express";
import { supabaseAdmin } from "../../config/supabase";
import { prisma } from "../../config/prisma";
import {  AuthedRequest } from "./auth.middleware";


const buildAuthResponse = (session: any, user: any, profile?:any) => {
  return {
    user: {
      id: user.id,
      email: user.email,
      ...user.user_metadata
    },
    accessToken: session?.access_token,
    refreshToken: session?.refresh_token
  };
};

export class AuthController {
  // POST /auth/register
  static async register(req: AuthedRequest, res: Response) {
  try {
    const { email, password, username, firstName, lastName } = req.body;

    if (!email || !password || !username || !firstName|| !lastName) {
      return res.status(400).json({ message: "Email and password are required!" });
    }

    const normalisedEmail = email.toLowerCase();

    // ✅ Only check email in Prisma (profiles)
    // if(email){
    //       const existingProfile = await prisma.profile.findUnique({
    //     where: { email: email }
    //   });

    //   if (existingProfile) {
    //     return res.status(409).json({ message: "email is already in use!" });
    //   }
    // }

     // ✅ Only check username in Prisma (profiles)

    // if (username) {
    //   const existingUsername = await prisma.profile.findUnique({
    //     where: { username }
    //   });

    //   if (existingUsername) {
    //     return res.status(409).json({ message: "Username already taken!" });
    //   }
    // }


    // ✅ Let Supabase handle email uniqueness
    const { data, error } = await supabaseAdmin.auth.signUp({
      email: normalisedEmail,
      password,
      options: { data: { username } }
    });

    if (error || !data.user) {
      // Supabase will return an error if email already exists
      console.error("Supabase signUp error:", error);

      // you can special-case "User already registered" if you want
      return res.status(400).json({ message: error?.message || "Sign up failed" });
    }

    const supaUser = data.user;

    await prisma.profile.create({
      data: {
        userId: supaUser.id,
        email: normalisedEmail,
        username: username ,
        firstName,
        lastName,
      }
    });

    return res.status(200).json({
      message: "User registered. Please check your email for the OTP code."
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

  // POST /auth/verify-otp
  static async verifyOtp(req: AuthedRequest, res: Response) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      const normalisedEmail = email.toLowerCase();

      const { data, error } = await supabaseAdmin.auth.verifyOtp({
        email: normalisedEmail,
        token: otp,
        type: "email" // OTP from email
      });

      if (error) {
        console.error("verifyOtp error:", error);
        return res.status(400).json({ message: error.message });
      }

      const { session, user } = data;

      if (!session || !user) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      return res.status(200).json(buildAuthResponse(session, user));
    } catch (err) {
      console.error("verifyOtp controller error:", err);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }

   static async resendOtp(req:AuthedRequest,res:Response){
    try {
     const { error } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email: 'email@example.com',
      options: {
        emailRedirectTo: 'https://example.com/welcome'
      }
    })
       if (error) throw new Error(error.message ?? "Failed to get getUserIdentities");
      //  return res.status(200).json(data);
      
    } catch (error) {
       console.error("failed to get user:", error);
      return res.status(500).json({ message: "failed getUserIdentities" });
    }
  }

  // POST /auth/login – unchanged logic, just a tiny improvement
  static async login(req: AuthedRequest, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const normalisedEmail = email.toLowerCase();

      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email: normalisedEmail,
        password
      });

      
      if (error) {
        console.error("signInWithPassword error:", error);
        return res.status(400).json({ message: error.message });
      }
      
      const { session, user } = data;

      const profile = await prisma.profile.findUnique({
        where: { userId: user.id },
      });
      

      if (!user?.email_confirmed_at) {
        return res.status(403).json({ message: "Please verify your email with the OTP first" });
      }

      return res.status(200).json(buildAuthResponse(session, user, profile));
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }

  static async logout(req: AuthedRequest, res: Response) {
    try {

      console.log("Auth/session headers:", req.headers.authorization);

      
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith("Bearer ")) {
        // No token → from server POV you're already logged out
        return res.status(200).json({ message: "Already logged out" });
      }

      const accessToken = authHeader.split(" ")[1];

      // Supabase: revoke this session (refresh tokens etc.)
      const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);

      if (error) {
        console.error("Supabase admin.signOut error:", error);
        return res
          .status(500)
          .json({ message: "Failed to revoke Supabase session" });
      }

      return res.status(200).json({ message: "Logged out successfully" });
    } catch (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }




  static async setSession(req: AuthedRequest, res: Response) {
    try {
      const { data, error } = await supabaseAdmin.auth.setSession({access_token:'', refresh_token:""} );
      if (error) throw new Error(error.message ?? "Failed to get set session");
      return res.status(200).json(data);
    } catch (err) {
      console.error("failed to get session:", err);
      return res.status(500).json({ message: "Something went wrong getting set session" });
    }
  }

  static async getSession(req: AuthedRequest, res: Response) {
  try {
    // 1. Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(200).json({ session: null });
    }

    const token = authHeader.replace("Bearer ", "");

    // 2. Use Supabase auth to decode + verify token
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(200).json({ session: null });
    }

    // 3. Return session-like object
    return res.status(200).json({
      user: data.user,
      accessToken: token,      // same token client sent
      refreshToken: null       // (optional) remove if not used
    });
  } catch (err) {
    console.log("SESSION ERROR:", err);
    return res.status(200).json({ session: null });
  }
}

  static async getUser(req: AuthedRequest, res: Response) {
    try {
     const { data: { user }, error } = await supabaseAdmin.auth.getUser( )
      if (error) throw new Error(error.message ?? "Failed to get user");
      return res.status(200).json(user);
    } catch (err) {
      console.error("failed to get user:", err);
      return res.status(500).json({ message: "Something went wrong getting user" });
    }
  }


  static async getUserIdentities(req:AuthedRequest,res:Response){
    try {
      const { data, error } = await supabaseAdmin.auth.getUserIdentities()
       if (error) throw new Error(error.message ?? "Failed to get getUserIdentities");
       return res.status(200).json(data);
      
    } catch (error) {
       console.error("failed to get user:", error);
      return res.status(500).json({ message: "failed getUserIdentities" });
    }
  }

  static async checkEmailAvailability (req:AuthedRequest,res:Response) {
  try {
    const { email } = (req.body || {}) as { email?: string };

    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    const existingProfile = await prisma.profile.findUnique({
      where: { email }
    });

    if (existingProfile) {
      res.status(409).json({ message: "Email is already in use!" });
      return;
    }

    res.status(200).json({ message: "Email is available" });
  } catch (error) {
    console.error("checkEmailAvailability error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

  static async checkUsernameAvailability(req:AuthedRequest,res:Response){
   try {
    const { username } = (req.body || {}) as { username?: string };

    if (!username) {
      res.status(400).json({ message: "username is required" });
      return;
    }

    const existingProfile = await prisma.profile.findUnique({
      where: { username }
    });

    if (existingProfile) {
      res.status(409).json({ message: "username is already in use!" });
      return;
    }

    res.status(200).json({ message: "username is available" });
  } catch (error) {
    console.error("checkusernameAvailability error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
}
}




