import crypto from "node:crypto";

export function generateOtpCode(len = 6) {
  const digits = "0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += digits[Math.floor(Math.random() * digits.length)];
  return out;
}

export function hashOtp(email: string, code: string) {
  return crypto.createHash("sha256").update(`${email}:${code}`).digest("hex");
}
