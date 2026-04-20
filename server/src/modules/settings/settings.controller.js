import { sendSuccess } from "../../core/http/apiResponse.js";
import { getTenantSettings, updateTenantSettings } from "./settings.service.js";

async function getSettings(request, response) {
  const result = await getTenantSettings(request.access.vendorId);

  sendSuccess(response, {
    message: "Settings loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function updateSettings(request, response) {
  const result = await updateTenantSettings(request.access.vendorId, request.body, request.auth);

  sendSuccess(response, {
    message: "Settings updated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

export { getSettings, updateSettings };
