import { sendSuccess } from "../../core/http/apiResponse.js";
import { buildSystemOverview, MODULES } from "./system.service.js";

async function getHealth(request, response) {
  const overview = await buildSystemOverview();

  sendSuccess(response, {
    message: "SupplyLink API health check completed",
    data: {
      name: overview.app.name,
      version: overview.app.version,
      environment: overview.app.environment,
      database: overview.database
    },
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function getSystemOverview(request, response) {
  const overview = await buildSystemOverview();

  sendSuccess(response, {
    message: "SupplyLink foundation overview loaded",
    data: overview,
    meta: {
      requestId: request.context.requestId,
      tenantScope: request.tenant.scope
    }
  });
}

async function getModuleIndex(request, response) {
  sendSuccess(response, {
    message: "SupplyLink modules registered",
    data: MODULES,
    meta: {
      requestId: request.context.requestId,
      tenantScope: request.tenant.scope
    }
  });
}

export { getHealth, getModuleIndex, getSystemOverview };
