import crypto from "crypto";

function normalizeRequestId(value) {
  if (typeof value !== "string") {
    return crypto.randomUUID();
  }

  const normalized = value.trim().slice(0, 100);
  return normalized || crypto.randomUUID();
}

const requestContext = (request, response, next) => {
  const requestId = normalizeRequestId(request.headers["x-request-id"]);

  request.context = {
    requestId,
    startedAt: Date.now()
  };

  response.setHeader("x-request-id", requestId);
  next();
};

export default requestContext;
