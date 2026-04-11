import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  createCategory,
  getCategoryDetail,
  getCategoryDirectory,
  updateCategory
} from "./catalog.service.js";

async function list(request, response) {
  const result = await getCategoryDirectory(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Categories loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function getById(request, response) {
  const result = await getCategoryDetail(request.access.vendorId, request.params.categoryId);

  sendSuccess(response, {
    message: "Category loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function create(request, response) {
  const result = await createCategory(request.access.vendorId, request.body);

  sendSuccess(response, {
    statusCode: 201,
    message: "Category created",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function update(request, response) {
  const result = await updateCategory(
    request.access.vendorId,
    request.params.categoryId,
    request.body
  );

  sendSuccess(response, {
    message: "Category updated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

export { create, getById, list, update };
