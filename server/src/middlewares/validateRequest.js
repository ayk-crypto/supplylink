import { ZodError } from "zod";
import AppError from "../core/errors/AppError.js";

const TARGET_MAP = {
  body: "body",
  params: "params",
  query: "query",
  headers: "headers"
};

function setValidatedRequestTarget(request, target, value) {
  const requestKey = TARGET_MAP[target];

  if (target === "query") {
    Object.defineProperty(request, requestKey, {
      configurable: true,
      enumerable: true,
      value,
      writable: true
    });
    return;
  }

  request[requestKey] = value;
}

function validateRequest(schemas = {}) {
  return (request, response, next) => {
    void response;

    try {
      Object.entries(schemas).forEach(([target, schema]) => {
        if (!schema || !TARGET_MAP[target]) {
          return;
        }

        setValidatedRequestTarget(
          request,
          target,
          schema.parse(request[TARGET_MAP[target]])
        );
      });

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          new AppError("Validation failed", {
            statusCode: 422,
            code: "VALIDATION_ERROR",
            details: error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message
            }))
          })
        );
      }

      return next(error);
    }
  };
}

export default validateRequest;
