import { config } from "dotenv";
import { connectDB } from "./config/prisma";
import app from "./server";

async function main() {
  config();

  try {
    await connectDB();
    console.log("DB connected");
  } catch (err) {
    console.error("DB connect failed", err);
    process.exit(1);
  }

  const port = Number(process.env.PORT) || 8080;
  app.listen(port, "0.0.0.0", () => console.log(`Listening on ${port}`));
}

main();