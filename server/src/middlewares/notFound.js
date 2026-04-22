import { sendError } from "../core/http/apiResponse.js";

const notFound = (request, response, next) => {
  void next;

  sendError(response, {
    statusCode: 404,
    message: `Route not found: ${request.method} ${request.originalUrl}`,
    code: "ROUTE_NOT_FOUND",
    requestId: request.context?.requestId || null,
    meta: {
      requestId: request.context?.requestId || null
    }
  });
};

export default notFound;
