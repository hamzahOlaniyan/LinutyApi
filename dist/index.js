"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const prisma_1 = require("./config/prisma");
const server_1 = __importDefault(require("./server"));
async function main() {
    (0, dotenv_1.config)();
    try {
        await (0, prisma_1.connectDB)();
        console.log("DB connected");
    }
    catch (err) {
        console.error("DB connect failed", err);
        process.exit(1);
    }
    const port = Number(process.env.PORT) || 8080;
    server_1.default.listen(port, "0.0.0.0", () => console.log(`Listening on ${port}`));
}
main();
