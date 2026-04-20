import { Router } from "express";
import { sendSuccess } from "../core/http/apiResponse.js";

function createPlaceholderModule(moduleConfig) {
  const router = Router();

  router.get("/", (request, response) => {
    sendSuccess(response, {
      message: `${moduleConfig.label} module foundation is ready for expansion`,
      data: moduleConfig,
      meta: {
        requestId: request.context?.requestId || null,
        tenantScope: request.tenant?.scope || "platform"
      }
    });
  });

  return router;
}

export default createPlaceholderModule;
