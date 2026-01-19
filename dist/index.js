"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const port = Number(process.env.PORT) || 8080;
const server = server_1.app.listen(port, "0.0.0.0", () => {
    console.log("✅ Server running:", server.address());
});
