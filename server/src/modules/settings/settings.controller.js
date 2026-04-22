import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  getTenantLogo,
  getTenantSettings,
  removeTenantLogo,
  updateTenantSettings,
  uploadTenantLogo
} from "./settings.service.js";

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

async function getSettingsLogo(request, response) {
  const result = await getTenantLogo(request.access.vendorId);

  response.setHeader("Content-Type", result.company.logo.mimeType);
  response.setHeader("Content-Disposition", `attachment; filename="${result.company.logo.originalFilename}"`);
  response.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
  response.setHeader("X-Content-Type-Options", "nosniff");

  return response.sendFile(result.path);
}

async function uploadSettingsLogo(request, response) {
  const result = await uploadTenantLogo(request.access.vendorId, request.file, request.auth);

  sendSuccess(response, {
    statusCode: 201,
    message: "Workspace logo uploaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function removeSettingsLogo(request, response) {
  const result = await removeTenantLogo(request.access.vendorId, request.auth);

  sendSuccess(response, {
    message: "Workspace logo removed",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

export { getSettings, getSettingsLogo, removeSettingsLogo, updateSettings, uploadSettingsLogo };
