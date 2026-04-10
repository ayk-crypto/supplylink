import jwt from "jsonwebtoken";
import env from "../config/env.js";
import AppError from "../core/errors/AppError.js";
import { buildAuthContext } from "../modules/auth/auth.service.js";

function extractBearerToken(headerValue = "") {
  if (!headerValue.startsWith("Bearer ")) {
    return null;
  }

  return headerValue.slice("Bearer ".length).trim();
}

async function authenticate(request, response, next) {
  void response;

  const token = extractBearerToken(request.headers.authorization);

  if (!token) {
    return next(
      new AppError("Authentication required", {
        statusCode: 401,
        code: "AUTHENTICATION_REQUIRED"
      })
    );
  }

  if (!env.JWT_SECRET) {
    return next(
      new AppError("JWT secret is not configured", {
        statusCode: 500,
        code: "JWT_NOT_CONFIGURED"
      })
    );
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    const authContext = await buildAuthContext(payload.sub, {
      currentVendorId: payload.currentVendorId || null
    });

    request.auth = authContext;

    if (!request.tenant.vendorId && authContext.currentVendorId) {
      request.tenant.vendorId = authContext.currentVendorId;
      request.tenant.tenantId = authContext.currentVendorId;
      request.tenant.scope = "vendor";
    }

    return next();
  } catch (error) {
    return next(
      new AppError("Invalid or expired access token", {
        statusCode: 401,
        code: "INVALID_ACCESS_TOKEN",
        details: error instanceof Error ? [{ message: error.message }] : []
      })
    );
  }
}

export default authenticate;
