import express, { Response, Request } from "express";
import profileRoutes from "./routes/profileRoutes";
import postRoutes from "./routes/postsRoutes";

const app = express();
app.use(express.json());

app.use("/profiles", profileRoutes);
app.use("/posts", postRoutes);

app.get("/", (req: Request, res: Response) => {
   res.send("Linuty API is running 🥳");
});

export default app;
