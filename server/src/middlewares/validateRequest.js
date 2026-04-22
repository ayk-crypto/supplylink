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

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function collectUnknownFields(rawValue, parsedValue, path = []) {
  if (Array.isArray(rawValue) && Array.isArray(parsedValue)) {
    return rawValue.flatMap((item, index) =>
      collectUnknownFields(item, parsedValue[index], [...path, String(index)])
    );
  }

  if (!isPlainObject(rawValue) || !isPlainObject(parsedValue)) {
    return [];
  }

  const parsedKeys = new Set(Object.keys(parsedValue));
  const unknownAtLevel = Object.keys(rawValue)
    .filter((key) => !parsedKeys.has(key))
    .map((key) => [...path, key].join("."));
  const nested = Object.keys(rawValue)
    .filter((key) => parsedKeys.has(key))
    .flatMap((key) => collectUnknownFields(rawValue[key], parsedValue[key], [...path, key]));

  return [...unknownAtLevel, ...nested];
}

function toValidationError(issues) {
  return new AppError("Validation failed", {
    statusCode: 422,
    code: "VALIDATION_ERROR",
    details: issues
  });
}

function validateRequest(schemas = {}) {
  return (request, response, next) => {
    void response;

    try {
      Object.entries(schemas).forEach(([target, schema]) => {
        if (!schema || !TARGET_MAP[target]) {
          return;
        }

        const rawValue = request[TARGET_MAP[target]];
        const parsedValue = schema.parse(rawValue);
        const unknownFields = collectUnknownFields(rawValue, parsedValue);

        if (unknownFields.length > 0) {
          throw toValidationError(
            unknownFields.map((fieldPath) => ({
              path: fieldPath,
              message: "Unknown field"
            }))
          );
        }

        setValidatedRequestTarget(request, target, parsedValue);
      });

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          toValidationError(
            error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message
            }))
          )
        );
      }

      return next(error);
    }
  };
}

export default validateRequest;
