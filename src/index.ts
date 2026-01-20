import "dotenv/config";
import { config } from "dotenv";
import { app } from "./server";
import { connectDB } from "./config/prisma";


console.log("BOOT: process starting");

config();

const port = Number(process.env.PORT) || 8080;

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Listening on ${port}`);

  connectDB()
    .then(() => console.log("DB connected"))
    .catch(err => {
      console.error("DB connection failed", err);
    });
});
