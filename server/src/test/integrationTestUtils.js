import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "../..");
const migrationsDir = path.join(serverRoot, "src/database/migrations");
const testUploadDir = path.join(serverRoot, ".tmp", `integration-uploads-${process.pid}`);

dotenv.config({
  path: path.join(serverRoot, ".env.test"),
  override: true
});

const DATA_TABLES = [
  "attachments",
  "notifications",
  "ledger_entries",
  "payments",
  "invoice_items",
  "invoices",
  "order_items",
  "route_template_stops",
  "route_templates",
  "orders",
  "quotation_items",
  "quotations",
  "route_stops",
  "routes",
  "stock_movements",
  "products",
  "categories",
  "vendor_settings",
  "vendor_customer_relationships",
  "subscriptions",
  "audit_logs",
  "vendor_memberships",
  "user_roles",
  "customers",
  "vendors",
  "users"
];

function getTestDatabaseUrl() {
  return process.env.TEST_DATABASE_URL || "";
}

function assertSafeTestDatabaseUrl(databaseUrl) {
  assert.ok(databaseUrl, "TEST_DATABASE_URL is required for integration tests");

  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, "").toLowerCase();

  assert.match(
    databaseName,
    /test/,
    "Refusing to run integration tests unless the database name includes 'test'"
  );
}

async function runMigrations(databaseUrl) {
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const executedResult = await pool.query("SELECT name FROM schema_migrations");
    const executed = new Set(executedResult.rows.map((row) => row.name));
    const migrationFiles = (await fs.readdir(migrationsDir))
      .filter((fileName) => fileName.endsWith(".sql"))
      .sort();

    for (const fileName of migrationFiles) {
      if (executed.has(fileName)) {
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, fileName), "utf8");
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [fileName]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

async function resetDatabase(databaseUrl) {
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(`TRUNCATE TABLE ${DATA_TABLES.join(", ")} RESTART IDENTITY CASCADE`);
  } finally {
    await pool.end();
  }
}

async function startIntegrationApp() {
  const databaseUrl = getTestDatabaseUrl();
  assertSafeTestDatabaseUrl(databaseUrl);

  process.env.NODE_ENV = "test";
  process.env.TEST_DATABASE_URL = databaseUrl;
  process.env.DATABASE_URL = "";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "integration-test-jwt-secret";
  process.env.FILE_UPLOAD_DIR = testUploadDir;
  process.env.FILE_UPLOAD_MAX_BYTES = process.env.FILE_UPLOAD_MAX_BYTES || "1048576";

  await fs.rm(testUploadDir, { recursive: true, force: true });
  await runMigrations(databaseUrl);
  await resetDatabase(databaseUrl);

  const appModule = await import("../app.js");
  const dbModule = await import("../config/db.js");
  const server = await new Promise((resolve) => {
    const runningServer = appModule.default.listen(0, "127.0.0.1", () => {
      resolve(runningServer);
    });
  });
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

  async function stop() {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    await dbModule.pool?.end();
    await fs.rm(testUploadDir, { recursive: true, force: true });
  }

  return {
    baseUrl,
    pool: dbModule.pool,
    stop
  };
}

function buildApiClient(baseUrl) {
  async function request(method, pathName, { token = null, body = undefined, headers = {}, expectedStatus = null } = {}) {
    const requestHeaders = { ...headers };
    const options = {
      method,
      headers: requestHeaders
    };

    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }

    if (body !== undefined) {
      if (body instanceof FormData) {
        options.body = body;
      } else {
        requestHeaders["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
      }
    }

    const response = await fetch(`${baseUrl}${pathName}`, options);
    const payload = await response.json().catch(() => null);

    if (expectedStatus !== null) {
      assert.equal(response.status, expectedStatus, payload?.message || JSON.stringify(payload));
    } else {
      assert.ok(response.ok, payload?.message || JSON.stringify(payload));
    }

    return {
      response,
      payload
    };
  }

  return {
    delete: (pathName, options) => request("DELETE", pathName, options),
    get: (pathName, options) => request("GET", pathName, options),
    patch: (pathName, options) => request("PATCH", pathName, options),
    post: (pathName, options) => request("POST", pathName, options)
  };
}

async function waitFor(assertion, { timeoutMs = 2000, intervalMs = 50 } = {}) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await assertion();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => {
        setTimeout(resolve, intervalMs);
      });
    }
  }

  throw lastError;
}

export { buildApiClient, getTestDatabaseUrl, startIntegrationApp, waitFor };
