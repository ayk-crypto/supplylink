import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl:
    env.nodeEnv === "production"
      ? {
          rejectUnauthorized: false
        }
      : false
});

export async function checkDatabaseConnection() {
  const client = await pool.connect();

  try {
    const result = await client.query("SELECT NOW() AS now");

    return {
      connected: true,
      timestamp: result.rows[0].now
    };
  } finally {
    client.release();
  }
}
