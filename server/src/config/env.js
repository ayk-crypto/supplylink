import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "../../..");
const nodeEnv = process.env.NODE_ENV || "development";
const envFilePath = path.resolve(appRoot, `.env.${nodeEnv}`);

// Load the environment file that matches the current runtime mode.
dotenv.config({ path: envFilePath });

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getPort() {
  const value = getRequiredEnv("PORT");
  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }

  return port;
}

export const env = {
  nodeEnv,
  envFilePath,
  port: getPort(),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  databaseUrl: getRequiredEnv("DATABASE_URL")
};
