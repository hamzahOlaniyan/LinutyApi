// src/modules/auth/auth.controller.ts
import type {  Response } from "express";
import { supabaseAdmin } from "../../config/supabase";
import { prisma } from "../../config/prisma";
import {  AuthedRequest } from "./auth.middleware";

export const access_token = "eyJhbGciOiJIUzI1NiIsImtpZCI6ImcvSUcwZVllYXdKUDdjREUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3BuZWRwbWZ2dG52c2hzcnhldW5qLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJmZTg4YjUzYy1jMGQ1LTRlMjgtOWNhZC1mOGU4OTllN2Y3ZjYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY0NzE2ODAyLCJpYXQiOjE3NjQ3MTMyMDIsImVtYWlsIjoicGF0cmlja2xlbWEwNEBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoicGF0cmlja2xlbWEwNEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiJmZTg4YjUzYy1jMGQ1LTRlMjgtOWNhZC1mOGU4OTllN2Y3ZjYiLCJ1c2VybmFtZSI6ImhhbXphaDg4In0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib3RwIiwidGltZXN0YW1wIjoxNzY0NzEzMjAyfV0sInNlc3Npb25faWQiOiJhOWRhODVmMS1iZWJhLTRkMWEtOGM4YS0xYmQzZmI5OTZlZmEiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.u0sABhrvRcdGtuFMD7q2zvdoyu4WWAFXnvzYvaUsr2s"
const refresh_token = "odhwdbhf2sp6"

const buildAuthResponse = (session: any, user: any) => {
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

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required!" });
    }

    const normalisedEmail = email.toLowerCase();

    // ✅ Only check username in Prisma (profiles)
    if(email){
          const existingProfile = await prisma.profile.findUnique({
        where: { email: email }
      });

      if (existingProfile) {
        return res.status(409).json({ message: "email is already in use!" });
      }
    }

    if (username) {
      const existingUsername = await prisma.profile.findUnique({
        where: { username }
      });

      if (existingUsername) {
        return res.status(409).json({ message: "Username already taken!" });
      }
    }


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

      if (!user?.email_confirmed_at) {
        return res.status(403).json({ message: "Please verify your email with the OTP first" });
      }

      return res.status(200).json(buildAuthResponse(session, user));
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }

  static async logout(req: AuthedRequest, res: Response) {
    try {
      return res.status(200).json({ message: "Logged out (client should clear tokens)" });
    } catch (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }

  static async setSession(req: AuthedRequest, res: Response) {
    try {
      const { data, error } = await supabaseAdmin.auth.setSession({access_token, refresh_token} );
      if (error) throw new Error(error.message ?? "Failed to get set session");
      return res.status(200).json(data);
    } catch (err) {
      console.error("failed to get session:", err);
      return res.status(500).json({ message: "Something went wrong getting set session" });
    }
  }

  static async getSession(req: AuthedRequest, res: Response) {
    try {
      const { data, error } = await supabaseAdmin.auth.getSession();
      if (error) throw new Error(error.message ?? "Failed to get session");
      return res.status(200).json(data);
    } catch (err) {
      console.error("failed to get session:", err);
      return res.status(500).json({ message: "Something went wrong getting session" });
    }
  }

  static async getUser(req: AuthedRequest, res: Response) {
    try {
     const { data: { user }, error } = await supabaseAdmin.auth.getUser(access_token )
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
}


