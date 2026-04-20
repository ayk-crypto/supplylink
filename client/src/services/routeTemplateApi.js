import { request } from "./httpClient.js";
import { toQueryString } from "./queryString.js";

async function listRouteTemplates(params = {}, options = {}) {
  return request(`/route-templates${toQueryString(params)}`, options);
}

async function getRouteTemplate(templateId, options = {}) {
  return request(`/route-templates/${templateId}`, options);
}

async function createRouteTemplate(payload) {
  return request("/route-templates", {
    method: "POST",
    body: payload
  });
}

async function updateRouteTemplate(templateId, payload) {
  return request(`/route-templates/${templateId}`, {
    method: "PATCH",
    body: payload
  });
}

async function deleteRouteTemplate(templateId) {
  return request(`/route-templates/${templateId}`, {
    method: "DELETE"
  });
}

async function listRouteTemplateStops(templateId, options = {}) {
  return request(`/route-templates/${templateId}/stops`, options);
}

async function createRouteTemplateStop(templateId, payload) {
  return request(`/route-templates/${templateId}/stops`, {
    method: "POST",
    body: payload
  });
}

async function updateRouteTemplateStop(templateId, stopId, payload) {
  return request(`/route-templates/${templateId}/stops/${stopId}`, {
    method: "PATCH",
    body: payload
  });
}

async function deleteRouteTemplateStop(templateId, stopId) {
  return request(`/route-templates/${templateId}/stops/${stopId}`, {
    method: "DELETE"
  });
}

async function generateRouteFromTemplate(templateId, payload) {
  return request(`/route-templates/${templateId}/generate`, {
    method: "POST",
    body: payload
  });
}

export {
  createRouteTemplate,
  createRouteTemplateStop,
  deleteRouteTemplate,
  deleteRouteTemplateStop,
  generateRouteFromTemplate,
  getRouteTemplate,
  listRouteTemplateStops,
  listRouteTemplates,
  updateRouteTemplate,
  updateRouteTemplateStop
};
