import { request } from "./httpClient.js";
import { toQueryString } from "./queryString.js";

async function listRoutes(params = {}, options = {}) {
  return request(`/routes${toQueryString(params)}`, options);
}

async function getRoute(routeId, options = {}) {
  return request(`/routes/${routeId}`, options);
}

async function createRoute(payload) {
  return request("/routes", {
    method: "POST",
    body: payload
  });
}

async function updateRoute(routeId, payload) {
  return request(`/routes/${routeId}`, {
    method: "PATCH",
    body: payload
  });
}

async function listRouteStops(routeId, options = {}) {
  return request(`/routes/${routeId}/stops`, options);
}

async function createRouteStop(routeId, payload) {
  return request(`/routes/${routeId}/stops`, {
    method: "POST",
    body: payload
  });
}

async function updateRouteStop(routeId, stopId, payload) {
  return request(`/routes/${routeId}/stops/${stopId}`, {
    method: "PATCH",
    body: payload
  });
}

async function getRouteIntelligence(routeId, options = {}) {
  return request(`/routes/${routeId}/intelligence`, options);
}

async function assignOrderToStop(routeId, stopId, orderId) {
  return request(`/routes/${routeId}/stops/${stopId}/orders/${orderId}`, {
    method: "POST"
  });
}

async function unassignOrderFromStop(routeId, stopId, orderId) {
  return request(`/routes/${routeId}/stops/${stopId}/orders/${orderId}`, {
    method: "DELETE"
  });
}

export {
  assignOrderToStop,
  createRoute,
  createRouteStop,
  getRoute,
  getRouteIntelligence,
  listRouteStops,
  listRoutes,
  unassignOrderFromStop,
  updateRoute,
  updateRouteStop
};
