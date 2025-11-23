"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const profileRoutes_1 = __importDefault(require("./routes/profileRoutes"));
const postsRoutes_1 = __importDefault(require("./routes/postsRoutes"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use("/profiles", profileRoutes_1.default);
app.use("/posts", postsRoutes_1.default);
app.get("/", (req, res) => {
    res.send("Linuty API is running 🥳");
});
exports.default = app;
