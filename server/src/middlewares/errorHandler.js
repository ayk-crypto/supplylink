import env from "../config/env.js";
import { sendError } from "../core/http/apiResponse.js";

const errorHandler = (error, request, response, next) => {
  void next;

  let statusCode = error.statusCode || error.status || 500;
  let message = error.message || "Internal server error";
  let code = error.code || "INTERNAL_SERVER_ERROR";

  if (error.code === "23505") {
    statusCode = 409;
    message = "A record with this value already exists";
    code = "UNIQUE_CONSTRAINT_VIOLATION";
  }

  if (error.code === "23503") {
    statusCode = 422;
    message = "A referenced record does not exist";
    code = "FOREIGN_KEY_VIOLATION";
  }

  if (statusCode >= 500) {
    console.error(error);
  }

  sendError(response, {
    statusCode,
    message,
    code,
    errors: error.details || [],
    meta: {
      requestId: request.context?.requestId || null,
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV
    }
  });
};

export default errorHandler;
