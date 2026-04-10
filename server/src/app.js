import express from "express";
import cors from "cors";
import morgan from "morgan";
import healthRoutes from "./routes/health.routes.js";
import dbRoutes from "./routes/db.routes.js";
import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();

app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

app.use("/api/health", healthRoutes);
app.use("/api/db-test", dbRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
