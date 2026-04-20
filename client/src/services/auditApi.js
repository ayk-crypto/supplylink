import { request } from "./httpClient.js";
import { toQueryString } from "./queryString.js";

async function listAuditEvents(params = {}, options = {}) {
  return request(`/audit${toQueryString(params)}`, options);
}

async function getEntityAuditHistory(entityType, entityId, params = {}, options = {}) {
  return request(
    `/audit/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}${toQueryString(params)}`,
    options
  );
}

export { getEntityAuditHistory, listAuditEvents };
