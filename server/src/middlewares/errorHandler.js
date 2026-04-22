import { sendError } from "../core/http/apiResponse.js";
import logger from "../core/logging/logger.js";

function mapDatabaseError(error) {
  if (error.code === "23505") {
    return {
      statusCode: 409,
      message: "A record with this value already exists",
      code: "DB_CONSTRAINT_VIOLATION"
    };
  }

  if (error.code === "23503") {
    return {
      statusCode: 422,
      message: "A referenced record does not exist",
      code: "DB_CONSTRAINT_VIOLATION"
    };
  }

  if (error.code === "23502" || error.code === "23514") {
    return {
      statusCode: 422,
      message: "The request could not be saved because one or more values are invalid",
      code: "DB_CONSTRAINT_VIOLATION"
    };
  }

  return null;
}

const errorHandler = (error, request, response, next) => {
  void next;

  const mappedDatabaseError = mapDatabaseError(error);
  const statusCode = mappedDatabaseError?.statusCode || error.statusCode || error.status || 500;
  const code = mappedDatabaseError?.code || error.code || "INTERNAL_SERVER_ERROR";
  const message =
    statusCode >= 500
      ? "Internal server error"
      : mappedDatabaseError?.message || error.message || "Request failed";
  const requestId = request.context?.requestId || null;

  logger.error("http.error", {
    requestId,
    method: request.method,
    path: request.originalUrl,
    statusCode,
    code,
    message: error.message,
    stack: statusCode >= 500 ? error.stack : undefined
  });

  sendError(response, {
    statusCode,
    message,
    code,
    errors: error.details || [],
    requestId,
    meta: {
      requestId
    }
  });
};

export default errorHandler;
