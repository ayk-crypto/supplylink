import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "development";

const { default: app } = await import("./app.js");

async function withServer(run) {
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });

  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

test("not found responses expose standardized error fields without stack traces", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/missing-route`);
    const payload = await response.json();

    assert.equal(response.status, 404);
    assert.equal(payload.success, false);
    assert.equal(payload.code, "ROUTE_NOT_FOUND");
    assert.equal(typeof payload.message, "string");
    assert.equal(typeof payload.requestId, "string");
    assert.equal(payload.meta.requestId, payload.requestId);
    assert.equal(Object.prototype.hasOwnProperty.call(payload, "stack"), false);
  });
});

test("legacy db-test endpoint is no longer mounted", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/db-test`);
    assert.equal(response.status, 404);
  });
});
