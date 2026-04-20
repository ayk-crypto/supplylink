import { sendSuccess } from "../../core/http/apiResponse.js";
import { getAuditDirectory, getEntityAuditHistory } from "./audit.service.js";

async function list(request, response) {
  const result = await getAuditDirectory(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Audit events loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function entityHistory(request, response) {
  const result = await getEntityAuditHistory(
    request.access.vendorId,
    request.params.entityType,
    request.params.entityId,
    request.query
  );

  sendSuccess(response, {
    message: "Entity audit history loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      entityType: request.params.entityType,
      entityId: request.params.entityId
    }
  });
}

export { entityHistory, list };
