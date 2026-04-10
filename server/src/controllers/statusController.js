import { checkDatabaseConnection } from "../db/pool.js";
import { env } from "../config/env.js";

export async function getStatus(request, response, next) {
  void request;

  try {
    const database = await checkDatabaseConnection();

    return response.status(200).json({
      name: "SupplyLink API",
      version: "1.0.0",
      message: "Backend is running and reachable from the frontend.",
      environment: env.nodeEnv,
      database
    });
  } catch (error) {
    return next(error);
  }
}
