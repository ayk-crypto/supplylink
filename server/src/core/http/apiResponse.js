function sendSuccess(
  response,
  { statusCode = 200, message = "Request successful", data = null, meta = {} } = {}
) {
  return response.status(statusCode).json({
    success: true,
    message,
    data,
    meta
  });
}

function sendError(
  response,
  {
    statusCode = 500,
    message = "Request failed",
    code = "REQUEST_FAILED",
    errors = [],
    meta = {},
    requestId = meta.requestId ?? null
  } = {}
) {
  return response.status(statusCode).json({
    success: false,
    code,
    message,
    requestId,
    error: {
      code,
      details: errors
    },
    meta
  });
}

export { sendError, sendSuccess };
