import express from "express";
import cors from "cors";
import morgan from "morgan";
import env from "./config/env.js";
import { sendSuccess } from "./core/http/apiResponse.js";
import asyncHandler from "./utils/asyncHandler.js";
import requestContext from "./middlewares/requestContext.js";
import tenantContext from "./middlewares/tenantContext.js";
import v1Routes from "./api/v1/routes/index.js";
import healthRoutes from "./routes/health.routes.js";
import dbRoutes from "./routes/db.routes.js";
import { buildSystemOverview } from "./modules/system/system.service.js";
import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true
  })
);
app.use(morgan("dev"));
app.use(requestContext);
app.use(tenantContext);

app.get("/", (request, response) => {
  sendSuccess(response, {
    message: "SupplyLink API is running",
    data: {
      name: env.APP_NAME,
      version: env.APP_VERSION,
      api: `${env.API_PREFIX}/${env.API_VERSION}`
    },
    meta: {
      requestId: request.context.requestId
    }
  });
});

app.use(`${env.API_PREFIX}/${env.API_VERSION}`, v1Routes);
app.use("/api/health", healthRoutes);
app.use("/api/db-test", dbRoutes);
app.get(
  "/api/status",
  asyncHandler(async (request, response) => {
    const overview = await buildSystemOverview();

    sendSuccess(response, {
      message: "SupplyLink legacy status endpoint",
      data: {
        name: overview.app.name,
        version: overview.app.version,
        environment: overview.app.environment,
        database: overview.database
      },
      meta: {
        requestId: request.context.requestId
      }
    });
  })
);

app.use(notFound);
app.use(errorHandler);

export default app;
