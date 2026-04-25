import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const nodeEnv = process.env.NODE_ENV || "development";
const ENV_FILES = {
  development: ".env.development",
  staging: ".env.staging",
  production: ".env.production",
  test: ".env.test"
};
const envFile = ENV_FILES[nodeEnv] || ENV_FILES.development;
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

function toList(value, fallback = []) {
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveRuntimeDatabaseUrl() {
  return nodeEnv === "test"
    ? process.env.TEST_DATABASE_URL || ""
    : process.env.DATABASE_URL || "";
}

const env = {
  NODE_ENV: nodeEnv,
  APP_NAME: process.env.APP_NAME || "SupplyLink API",
  APP_VERSION: process.env.APP_VERSION || "0.1.0",
  PORT: toNumber(process.env.PORT, 4000),
  API_PREFIX: process.env.API_PREFIX || "/api",
  API_VERSION: process.env.API_VERSION || "v1",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  CORS_ALLOWED_ORIGINS: toList(process.env.CORS_ALLOWED_ORIGINS, [
    process.env.CLIENT_URL || "http://localhost:5173"
  ]),
  DATABASE_URL: process.env.DATABASE_URL || "",
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || "",
  RUNTIME_DATABASE_URL: resolveRuntimeDatabaseUrl(),
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  ENABLE_DB_SSL: toBoolean(process.env.ENABLE_DB_SSL, false),
  JWT_SECRET:
    process.env.JWT_SECRET ||
    (nodeEnv === "production" ? "" : "development-only-jwt-secret"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  BCRYPT_SALT_ROUNDS: toNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
  EMAIL_SMTP_HOST: process.env.EMAIL_SMTP_HOST || "",
  EMAIL_SMTP_PORT: toNumber(process.env.EMAIL_SMTP_PORT, 587),
  EMAIL_SMTP_SECURE: toBoolean(process.env.EMAIL_SMTP_SECURE, false),
  EMAIL_SMTP_USER: process.env.EMAIL_SMTP_USER || "",
  EMAIL_SMTP_PASS: process.env.EMAIL_SMTP_PASS || "",
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || "",
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || "SupplyLink",
  EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO || "",
  DEMO_SEED_PASSWORD: process.env.DEMO_SEED_PASSWORD || "Password123!",
  ALLOW_DEMO_SEED_IN_PRODUCTION: toBoolean(process.env.ALLOW_DEMO_SEED_IN_PRODUCTION, false),
  FILE_UPLOAD_DIR: path.resolve(rootDir, process.env.FILE_UPLOAD_DIR || "uploads"),
  FILE_UPLOAD_MAX_BYTES: toNumber(process.env.FILE_UPLOAD_MAX_BYTES, 10 * 1024 * 1024),
  API_RATE_LIMIT_WINDOW_MS: toNumber(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  API_RATE_LIMIT_MAX: toNumber(process.env.API_RATE_LIMIT_MAX, 300),
  ENFORCE_STOCK_AVAILABILITY: toBoolean(process.env.ENFORCE_STOCK_AVAILABILITY, false)
};

function getRequiredEnvVars(currentEnv = env.NODE_ENV) {
  const required = ["JWT_SECRET"];

  if (currentEnv === "test") {
    required.push("TEST_DATABASE_URL");
  } else {
    required.push("DATABASE_URL");
  }

  return required;
}

function assertRequiredEnvVars(currentEnv = env.NODE_ENV) {
  const missing = getRequiredEnvVars(currentEnv).filter((name) => {
    if (name === "DATABASE_URL") {
      return !env.DATABASE_URL;
    }

    if (name === "TEST_DATABASE_URL") {
      return !env.TEST_DATABASE_URL;
    }

    return !process.env[name];
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export { assertRequiredEnvVars };
export default env;
