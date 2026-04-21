import AppError from "../../core/errors/AppError.js";

const WINDOW_MS = 60 * 1000;
const LIMITS = {
  view: 40,
  pdf: 20
};
const buckets = new Map();

function getClientKey(request, scope) {
  const forwardedFor = request.headers["x-forwarded-for"];
  const ip =
    (typeof forwardedFor === "string" ? forwardedFor.split(",")[0].trim() : null) ||
    request.ip ||
    request.socket?.remoteAddress ||
    "unknown";

  return `${scope}:${request.params.token}:${ip}`;
}

function cleanupBucket(now) {
  for (const [key, value] of buckets.entries()) {
    if (value.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function createPublicShareRateLimiter(scope = "view") {
  const maxRequests = LIMITS[scope] || LIMITS.view;

  return function publicShareRateLimiter(request, response, next) {
    void response;
    const now = Date.now();
    cleanupBucket(now);

    const key = getClientKey(request, scope);
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + WINDOW_MS
      });
      return next();
    }

    if (existing.count >= maxRequests) {
      return next(
        new AppError("Too many attempts for this shared document link", {
          statusCode: 429,
          code: "DOCUMENT_SHARE_RATE_LIMITED",
          details: [
            {
              path: "token",
              message: "Please wait a minute before trying this shared link again"
            }
          ]
        })
      );
    }

    existing.count += 1;
    buckets.set(key, existing);
    return next();
  };
}

export default createPublicShareRateLimiter;
