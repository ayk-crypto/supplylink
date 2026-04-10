import pg from "pg";
import env from "./env.js";

const { Pool } = pg;

function createPool() {
  if (!env.DATABASE_URL) {
    return null;
  }

  const databaseUrl = new URL(env.DATABASE_URL);
  const useSsl =
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

export default pool;
