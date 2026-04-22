import rateLimit from "express-rate-limit";
import { sendError } from "../core/http/apiResponse.js";

function createApiRateLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (request, response) => {
      sendError(response, {
        statusCode: 429,
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
        requestId: request.context?.requestId || null
      });
    }
  });
}

export default createApiRateLimiter;
