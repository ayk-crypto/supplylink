import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const nodeEnv = process.env.NODE_ENV || "development";
const envFile =
  nodeEnv === "production" ? ".env.production" : ".env.development";
const envPath = path.join(rootDir, envFile);

dotenv.config({
  path: envPath,
  override: true
});

function toNumber(value, fallback) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function toBoolean(value, fallback = false) {
  if (typeof value !== "string") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

const env = {
  NODE_ENV: nodeEnv,
  APP_NAME: process.env.APP_NAME || "SupplyLink API",
  APP_VERSION: process.env.APP_VERSION || "0.1.0",
  PORT: toNumber(process.env.PORT, 4000),
  API_PREFIX: process.env.API_PREFIX || "/api",
  API_VERSION: process.env.API_VERSION || "v1",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  DATABASE_URL: process.env.DATABASE_URL || "",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  ENABLE_DB_SSL: toBoolean(process.env.ENABLE_DB_SSL, false),
  JWT_SECRET:
    process.env.JWT_SECRET ||
    (nodeEnv === "production" ? "" : "development-only-jwt-secret"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  BCRYPT_SALT_ROUNDS: toNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
  DEMO_SEED_PASSWORD: process.env.DEMO_SEED_PASSWORD || "Password123!",
  ALLOW_DEMO_SEED_IN_PRODUCTION: toBoolean(process.env.ALLOW_DEMO_SEED_IN_PRODUCTION, false),
  FILE_UPLOAD_DIR: path.resolve(rootDir, process.env.FILE_UPLOAD_DIR || "uploads"),
  FILE_UPLOAD_MAX_BYTES: toNumber(process.env.FILE_UPLOAD_MAX_BYTES, 10 * 1024 * 1024)
};

export default env;
