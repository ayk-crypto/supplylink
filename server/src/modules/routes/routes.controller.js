import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  assignOrderToRouteStop,
  createRoute,
  createRouteStop,
  getRouteDetail,
  getRouteDirectory,
  getRouteIntelligence,
  getRouteStops,
  unassignOrderFromRouteStop,
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

async function getIntelligence(request, response) {
  const result = await getRouteIntelligence(request.access.vendorId, request.params.routeId);

  sendSuccess(response, {
    message: "Route intelligence loaded",
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

async function assignStopOrder(request, response) {
  const result = await assignOrderToRouteStop(
    request.access.vendorId,
    request.params.routeId,
    request.params.stopId,
    request.params.orderId
  );

  sendSuccess(response, {
    message: "Order assigned to route stop",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      routeId: request.params.routeId,
      stopId: request.params.stopId,
      orderId: request.params.orderId
    }
  });
}

async function unassignStopOrder(request, response) {
  const result = await unassignOrderFromRouteStop(
    request.access.vendorId,
    request.params.routeId,
    request.params.stopId,
    request.params.orderId
  );

  sendSuccess(response, {
    message: "Order unassigned from route stop",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      routeId: request.params.routeId,
      stopId: request.params.stopId,
      orderId: request.params.orderId
    }
  });
}

export {
  assignStopOrder,
  create,
  createStop,
  getById,
  getIntelligence,
  list,
  listStops,
  unassignStopOrder,
  update,
  updateStop
};
