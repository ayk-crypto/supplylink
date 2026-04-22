import logger from "../core/logging/logger.js";

function requestLogger(request, response, next) {
  const startedAt = Date.now();
  const { requestId } = request.context;

  response.on("finish", () => {
    logger.info("http.request", {
      requestId,
      method: request.method,
      path: request.originalUrl,
      statusCode: response.statusCode,
      durationMs: Date.now() - startedAt
    });
  });

  next();
}

export default requestLogger;
