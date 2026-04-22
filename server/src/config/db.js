import pg from "pg";
import env from "./env.js";

const { Pool } = pg;

function createPool() {
  if (!env.RUNTIME_DATABASE_URL) {
    return null;
  }

  const databaseUrl = new URL(env.RUNTIME_DATABASE_URL);
  const useSsl =
    env.ENABLE_DB_SSL ||
    databaseUrl.hostname.endsWith(".neon.tech") ||
    databaseUrl.searchParams.get("sslmode") === "require";

  if (useSsl) {
    databaseUrl.searchParams.delete("sslmode");
  }

  return new Pool({
    connectionString: databaseUrl.toString(),
    ssl: useSsl
      ? {
          rejectUnauthorized: false
        }
      : false
  });
}

const pool = createPool();

async function query(text, params = []) {
  if (!pool) {
    throw new Error("Database pool is not configured");
  }

  return pool.query(text, params);
}

async function withTransaction(callback) {
  if (!pool) {
    throw new Error("Database pool is not configured");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export { pool, query, withTransaction };
export default pool;
