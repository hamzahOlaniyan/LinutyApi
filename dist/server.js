"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = require("dotenv");
const prisma_1 = require("./config/prisma");
const routes_1 = require("./routes");
(0, dotenv_1.config)();
(0, prisma_1.connectDB)();
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json());
exports.app.use(express_1.default.urlencoded({ extended: true }));
exports.app.get("/", (req, res) => {
    res.send("Linuty API is running 🥳");
});
exports.app.use("/api", routes_1.rootRouter);
exports.default = exports.app;
