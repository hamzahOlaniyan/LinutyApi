import express, { Response, Request } from "express";
import route from "./routes/profileRoutes";

const app = express();
app.use(express.json());

app.use("/profiles", route);

app.get("/", (req: Request, res: Response) => {
   res.send("Linuty API is running 🥳");
});

export default app;
