import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import validateRequest from "./validateRequest.js";

function runMiddleware(middleware, request) {
  return new Promise((resolve) => {
    middleware(request, {}, (error) => {
      resolve(error || null);
    });
  });
}

test("validateRequest supports getter-only query objects", async () => {
  const request = {};

  Object.defineProperty(request, "query", {
    configurable: true,
    enumerable: true,
    get() {
      return {
        limit: "5",
        search: "buyer"
      };
    }
  });

  const error = await runMiddleware(
    validateRequest({
      query: z.object({
        limit: z.coerce.number().int().min(1),
        search: z.string().trim()
      })
    }),
    request
  );

  assert.equal(error, null);
  assert.deepEqual(request.query, {
    limit: 5,
    search: "buyer"
  });
});

test("validateRequest preserves body and params replacement", async () => {
  const request = {
    body: { count: "2" },
    params: { itemId: "abc" }
  };
  const error = await runMiddleware(
    validateRequest({
      body: z.object({ count: z.coerce.number().int() }),
      params: z.object({ itemId: z.string().min(1) })
    }),
    request
  );

  assert.equal(error, null);
  assert.deepEqual(request.body, { count: 2 });
  assert.deepEqual(request.params, { itemId: "abc" });
});

test("validateRequest rejects unknown nested fields", async () => {
  const request = {
    body: {
      profile: {
        name: "Buyer",
        unexpected: true
      }
    }
  };
  const error = await runMiddleware(
    validateRequest({
      body: z.object({
        profile: z.object({
          name: z.string()
        })
      })
    }),
    request
  );

  assert.equal(error.code, "VALIDATION_ERROR");
  assert.deepEqual(error.details, [
    {
      path: "profile.unexpected",
      message: "Unknown field"
    }
  ]);
});
