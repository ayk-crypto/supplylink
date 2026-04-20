import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import AppError from "../../core/errors/AppError.js";
import env from "../../config/env.js";
import { pool, withTransaction } from "../../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../migrations");

async function ensureMigrationTable() {
  await withTransaction(async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  });
}

async function getExecutedMigrations() {
  const result = await pool.query("SELECT name FROM schema_migrations ORDER BY name ASC");
  return new Set(result.rows.map((row) => row.name));
}

async function run() {
  if (!env.DATABASE_URL || !pool) {
    throw new AppError("DATABASE_URL is required to run migrations", {
      statusCode: 500,
      code: "DATABASE_NOT_CONFIGURED"
    });
  }

  await ensureMigrationTable();

  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  const executed = await getExecutedMigrations();

  for (const fileName of migrationFiles) {
    if (executed.has(fileName)) {
      continue;
    }

    const filePath = path.join(migrationsDir, fileName);
    const sql = await fs.readFile(filePath, "utf8");

    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [fileName]);
    });

    console.log(`Applied migration: ${fileName}`);
  }

  console.log("Migrations complete");
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (pool) {
      await pool.end();
    }
  });
