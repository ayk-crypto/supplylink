import { TENANCY_HEADERS, TENANCY_SCOPES } from "../core/constants/tenancy.js";

const tenantContext = (request, response, next) => {
  void response;

  const vendorId = request.headers[TENANCY_HEADERS.vendorId] || null;
  const tenantId = request.headers[TENANCY_HEADERS.tenantId] || vendorId;
  const actorId = request.headers[TENANCY_HEADERS.actorId] || null;

  request.tenant = {
    vendorId,
    tenantId,
    actorId,
    scope: vendorId ? TENANCY_SCOPES.vendor : TENANCY_SCOPES.platform
  };

  next();
};

export default tenantContext;
