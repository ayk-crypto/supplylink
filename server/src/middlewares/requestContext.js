import crypto from "crypto";

const requestContext = (request, response, next) => {
  const requestId = request.headers["x-request-id"] || crypto.randomUUID();

  request.context = {
    requestId,
    startedAt: Date.now()
  };

  response.setHeader("x-request-id", requestId);
  next();
};

export default requestContext;
