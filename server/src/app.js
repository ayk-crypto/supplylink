import express from "express";
import cors from "cors";
import helmet from "helmet";
import env from "./config/env.js";
import { sendSuccess } from "./core/http/apiResponse.js";
import asyncHandler from "./utils/asyncHandler.js";
import requestContext from "./middlewares/requestContext.js";
import requestLogger from "./middlewares/requestLogger.js";
import tenantContext from "./middlewares/tenantContext.js";
import v1Routes from "./api/v1/routes/index.js";
import healthRoutes from "./routes/health.routes.js";
import { buildSystemOverview } from "./modules/system/system.service.js";
import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";
import createApiRateLimiter from "./middlewares/apiRateLimiter.js";
import AppError from "./core/errors/AppError.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(requestContext);
app.use(requestLogger);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(express.json());
app.use(
  cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = Array.isArray(env.CORS_ALLOWED_ORIGINS)
  ? env.CORS_ALLOWED_ORIGINS
  : String(env.CORS_ALLOWED_ORIGINS || "")
      .split(",")
      .map(o => o.trim());

    if (allowedOrigins.some(o => origin.startsWith(o))) {
      return callback(null, true);
    }

    console.log("Blocked CORS origin:", origin); // debug

    return callback(
      new AppError("Origin is not allowed by CORS policy", {
        statusCode: 403,
        code: "CORS_ORIGIN_NOT_ALLOWED"
      })
    );
  },
  credentials: true
})
);
app.use(
  `${env.API_PREFIX}/${env.API_VERSION}`,
  createApiRateLimiter({
    windowMs: env.API_RATE_LIMIT_WINDOW_MS,
    max: env.API_RATE_LIMIT_MAX
  })
);
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
