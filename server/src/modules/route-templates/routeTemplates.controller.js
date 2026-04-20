import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  createRouteTemplate,
  createTemplateStop,
  deleteRouteTemplate,
  deleteTemplateStop,
  generateRoute,
  getRouteTemplateDetail,
  getRouteTemplateDirectory,
  getTemplateStops,
  updateRouteTemplate,
  updateTemplateStop
} from "./routeTemplates.service.js";

async function list(request, response) {
  const result = await getRouteTemplateDirectory(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Route templates loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function getById(request, response) {
  const result = await getRouteTemplateDetail(request.access.vendorId, request.params.templateId);

  sendSuccess(response, {
    message: "Route template loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function create(request, response) {
  const result = await createRouteTemplate(request.access.vendorId, request.body);

  sendSuccess(response, {
    statusCode: 201,
    message: "Route template created",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function update(request, response) {
  const result = await updateRouteTemplate(
    request.access.vendorId,
    request.params.templateId,
    request.body
  );

  sendSuccess(response, {
    message: "Route template updated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function remove(request, response) {
  const result = await deleteRouteTemplate(request.access.vendorId, request.params.templateId);

  sendSuccess(response, {
    message: "Route template deleted",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function listStops(request, response) {
  const result = await getTemplateStops(request.access.vendorId, request.params.templateId);

  sendSuccess(response, {
    message: "Route template stops loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      templateId: request.params.templateId
    }
  });
}

async function createStop(request, response) {
  const result = await createTemplateStop(
    request.access.vendorId,
    request.params.templateId,
    request.body
  );

  sendSuccess(response, {
    statusCode: 201,
    message: "Route template stop created",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      templateId: request.params.templateId
    }
  });
}

async function updateStop(request, response) {
  const result = await updateTemplateStop(
    request.access.vendorId,
    request.params.templateId,
    request.params.stopId,
    request.body
  );

  sendSuccess(response, {
    message: "Route template stop updated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      templateId: request.params.templateId,
      stopId: request.params.stopId
    }
  });
}

async function removeStop(request, response) {
  const result = await deleteTemplateStop(
    request.access.vendorId,
    request.params.templateId,
    request.params.stopId
  );

  sendSuccess(response, {
    message: "Route template stop deleted",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      templateId: request.params.templateId,
      stopId: request.params.stopId
    }
  });
}

async function generate(request, response) {
  const result = await generateRoute(
    request.access.vendorId,
    request.params.templateId,
    request.body
  );

  sendSuccess(response, {
    statusCode: 201,
    message: "Route generated from template",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      templateId: request.params.templateId
    }
  });
}

export {
  create,
  createStop,
  generate,
  getById,
  list,
  listStops,
  remove,
  removeStop,
  update,
  updateStop
};
