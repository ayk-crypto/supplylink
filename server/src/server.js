import app from "./app.js";
import env from "./config/env.js";
import { pool } from "./config/db.js";

function assertRuntimeConfiguration() {
  const missing = [];

  if (!env.DATABASE_URL) {
    missing.push("DATABASE_URL/NEON_DATABASE_URL");
  }

  if (!env.JWT_SECRET) {
    missing.push("JWT_SECRET");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required runtime configuration: ${missing.join(", ")}`);
  }
}

if (env.NODE_ENV === "production") {
  assertRuntimeConfiguration();
}

const server = app.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
});

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully...`);

  if (pool) {
    await pool.end();
  }

  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  shutdown("SIGINT").catch((error) => {
    console.error(error);
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((error) => {
    console.error(error);
    process.exit(1);
  });
});
