import assert from "node:assert/strict";
import test from "node:test";
import createPublicShareRateLimiter from "./documents.publicRateLimit.js";

function createRequest() {
  return {
    headers: {},
    ip: "127.0.0.1",
    params: {
      token: "secure-token-1234567890"
    },
    socket: {
      remoteAddress: "127.0.0.1"
    }
  };
}

test("public share rate limiter allows requests under the cap", () => {
  const middleware = createPublicShareRateLimiter("view");
  let nextCalls = 0;

  for (let index = 0; index < 40; index += 1) {
    middleware(createRequest(), {}, (error) => {
      assert.equal(error, undefined);
      nextCalls += 1;
    });
  }

  assert.equal(nextCalls, 40);
});

test("public share rate limiter blocks requests over the cap", () => {
  const middleware = createPublicShareRateLimiter("pdf");
  let rateLimitError = null;

  for (let index = 0; index < 21; index += 1) {
    middleware(createRequest(), {}, (error) => {
      if (error) {
        rateLimitError = error;
      }
    });
  }

  assert.ok(rateLimitError);
  assert.equal(rateLimitError.statusCode, 429);
  assert.equal(rateLimitError.code, "DOCUMENT_SHARE_RATE_LIMITED");
});
