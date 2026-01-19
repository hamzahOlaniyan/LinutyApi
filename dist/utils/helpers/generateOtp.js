"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOtpCode = generateOtpCode;
exports.hashOtp = hashOtp;
const node_crypto_1 = __importDefault(require("node:crypto"));
function generateOtpCode(len = 6) {
    const digits = "0123456789";
    let out = "";
    for (let i = 0; i < len; i++)
        out += digits[Math.floor(Math.random() * digits.length)];
    return out;
}
function hashOtp(email, code) {
    return node_crypto_1.default.createHash("sha256").update(`${email}:${code}`).digest("hex");
}
