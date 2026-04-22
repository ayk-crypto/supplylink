import { sendSuccess } from "../../core/http/apiResponse.js";
import logger from "../../core/logging/logger.js";
import { getCurrentUserProfile, loginUser, registerUser } from "./auth.service.js";

async function register(request, response) {
  const result = await registerUser(request.body, request.auth || null);
  logger.info("auth.register", {
    requestId: request.context.requestId,
    userId: result.user.id,
    roleCodes: result.user.roleCodes,
    vendorId: result.vendor?.id || null
  });

  sendSuccess(response, {
    statusCode: 201,
    message: "User registered successfully",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function login(request, response) {
  const result = await loginUser(request.body);
  logger.info("auth.login", {
    requestId: request.context.requestId,
    userId: result.user.id,
    vendorId: result.user.currentVendorId || null
  });

  sendSuccess(response, {
    message: "Login successful",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function me(request, response) {
  const user = await getCurrentUserProfile(request.auth.userId);

  sendSuccess(response, {
    message: "Authenticated user profile loaded",
    data: {
      ...user,
      currentVendorId: request.auth.currentVendorId || user.currentVendorId || null
    },
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function logout(request, response) {
  sendSuccess(response, {
    message: "Logout successful on the API side",
    data: {
      mode: "stateless",
      note: "Discard the access token client-side."
    },
    meta: {
      requestId: request.context.requestId
    }
  });
}

export { login, logout, me, register };
