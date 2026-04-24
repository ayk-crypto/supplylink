import app from "./app.js";
import env, { assertRequiredEnvVars } from "./config/env.js";
import { pool } from "./config/db.js";
import logger from "./core/logging/logger.js";


assertRequiredEnvVars();

const server = app.listen(env.PORT, () => {
  logger.info("server.started", {
    port: env.PORT,
    environment: env.NODE_ENV
  });
});

async function shutdown(signal) {
  logger.info("server.shutdown.started", { signal });

  if (pool) {
    await pool.end();
  }

  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  shutdown("SIGINT").catch((error) => {
    logger.error("server.shutdown.failed", {
      signal: "SIGINT",
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((error) => {
    logger.error("server.shutdown.failed", {
      signal: "SIGTERM",
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  });
});
