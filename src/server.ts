import express, { Response, Request } from "express";
import cors from "cors";
import  { rootRouter } from "./routes";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get("/", (req: Request, res: Response) => {
   res.send("Linuty API is running 🥳");
});
app.use("/api", rootRouter);

export default app;
