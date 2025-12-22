import { app } from "./server";

console.log("✅ index.ts booted");

const port = Number(process.env.PORT) || 8080;

const server = app.listen(port, "0.0.0.0", () => {
  console.log("✅ Server running:", server.address());
});
