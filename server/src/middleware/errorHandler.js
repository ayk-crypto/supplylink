export function notFoundHandler(request, response) {
  return response.status(404).json({
    message: `Route not found: ${request.method} ${request.originalUrl}`
  });
}

export function errorHandler(error, request, response, next) {
  void request;
  void next;

  const statusCode = error.statusCode || 500;

  if (process.env.NODE_ENV !== "test") {
    console.error(error);
  }

  return response.status(statusCode).json({
    message: error.message || "Internal server error"
  });
}
