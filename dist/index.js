"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const dotenv_1 = require("dotenv");
const server_1 = require("./server");
const prisma_1 = require("./config/prisma");
console.log("BOOT: process starting");
(0, dotenv_1.config)();
const port = Number(process.env.PORT) || 8080;
const server = server_1.app.listen(port, "0.0.0.0", () => {
    console.log(`Listening on ${port}`);
    (0, prisma_1.connectDB)()
        .then(() => console.log("DB connected"))
        .catch(err => {
        console.error("DB connection failed", err);
    });
});
