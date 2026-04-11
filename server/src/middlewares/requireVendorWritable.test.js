import assert from "node:assert/strict";
import test from "node:test";
import requireVendorWritable from "./requireVendorWritable.js";

function runMiddleware(middleware, request) {
  return new Promise((resolve) => {
    middleware(request, {}, (error) => {
      resolve(error || null);
    });
  });
}

test("requireVendorWritable allows active vendors", async () => {
  const middleware = requireVendorWritable({
    findVendorStatus: async () => ({ id: "vendor-1", status: "active" })
  });
  const error = await runMiddleware(middleware, {
    auth: { isSuperAdmin: false },
    access: { vendorId: "vendor-1" }
  });

  assert.equal(error, null);
});

test("requireVendorWritable blocks suspended vendors", async () => {
  const middleware = requireVendorWritable({
    findVendorStatus: async () => ({ id: "vendor-1", status: "suspended" })
  });
  const error = await runMiddleware(middleware, {
    auth: { isSuperAdmin: false },
    access: { vendorId: "vendor-1" }
  });

  assert.equal(error.statusCode, 403);
  assert.equal(error.code, "VENDOR_WRITE_BLOCKED");
});

test("requireVendorWritable bypasses status checks for super admins", async () => {
  let lookupCalled = false;
  const middleware = requireVendorWritable({
    findVendorStatus: async () => {
      lookupCalled = true;
      return { id: "vendor-1", status: "archived" };
    }
  });
  const error = await runMiddleware(middleware, {
    auth: { isSuperAdmin: true },
    access: { vendorId: "vendor-1" }
  });

  assert.equal(error, null);
  assert.equal(lookupCalled, false);
});

test("requireVendorWritable requires vendor access context", async () => {
  const middleware = requireVendorWritable({
    findVendorStatus: async () => ({ id: "vendor-1", status: "active" })
  });
  const error = await runMiddleware(middleware, {
    auth: { isSuperAdmin: false },
    access: {}
  });

  assert.equal(error.statusCode, 500);
  assert.equal(error.code, "VENDOR_ACCESS_CONTEXT_MISSING");
});
