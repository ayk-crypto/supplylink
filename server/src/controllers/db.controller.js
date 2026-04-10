import pool from "../config/db.js";
import env from "../config/env.js";

const getDatabaseTest = async (request, response) => {
  void request;

  if (!env.DATABASE_URL) {
    const error = new Error("DATABASE_URL is missing");
    error.statusCode = 500;
    throw error;
  }

  if (!pool) {
    const error = new Error("Database pool is not available");
    error.statusCode = 500;
    throw error;
  }

  try {
    const result = await pool.query("SELECT NOW()");

    response.status(200).json({
      success: true,
      message: "Database connected successfully",
      data: {
        time: result.rows[0].now
      }
    });
  } catch {
    const error = new Error("Database connection failed");
    error.statusCode = 500;
    throw error;
  }
};

export { getDatabaseTest };
