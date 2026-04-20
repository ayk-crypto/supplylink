import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  createRoute,
  createRouteStop,
  getRouteDetail,
  getRouteDirectory,
  getRouteStops,
  updateRoute,
  updateRouteStop
} from "./routes.service.js";

async function list(request, response) {
  const result = await getRouteDirectory(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Routes loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function getById(request, response) {
  const result = await getRouteDetail(request.access.vendorId, request.params.routeId);

  sendSuccess(response, {
    message: "Route loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function create(request, response) {
  const result = await createRoute(request.access.vendorId, request.body);

  sendSuccess(response, {
    statusCode: 201,
    message: "Route created",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function update(request, response) {
  const result = await updateRoute(request.access.vendorId, request.params.routeId, request.body);

  sendSuccess(response, {
    message: "Route updated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function listStops(request, response) {
  const result = await getRouteStops(request.access.vendorId, request.params.routeId);

  sendSuccess(response, {
    message: "Route stops loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      routeId: request.params.routeId
    }
  });
}

async function createStop(request, response) {
  const result = await createRouteStop(request.access.vendorId, request.params.routeId, request.body);

  sendSuccess(response, {
    statusCode: 201,
    message: "Route stop created",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      routeId: request.params.routeId
    }
  });
}

async function updateStop(request, response) {
  const result = await updateRouteStop(
    request.access.vendorId,
    request.params.routeId,
    request.params.stopId,
    request.body
  );

  sendSuccess(response, {
    message: "Route stop updated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      routeId: request.params.routeId,
      stopId: request.params.stopId
    }
  });
}

export { create, createStop, getById, list, listStops, update, updateStop };
