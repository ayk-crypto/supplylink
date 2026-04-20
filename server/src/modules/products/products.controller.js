import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  createProduct,
  getProductDetail,
  getProductDirectory,
  updateProduct
} from "./catalog.service.js";

async function list(request, response) {
  const result = await getProductDirectory(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Products loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function getById(request, response) {
  const result = await getProductDetail(request.access.vendorId, request.params.productId);

  sendSuccess(response, {
    message: "Product loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function create(request, response) {
  const result = await createProduct(request.access.vendorId, request.body);

  sendSuccess(response, {
    statusCode: 201,
    message: "Product created",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function update(request, response) {
  const result = await updateProduct(
    request.access.vendorId,
    request.params.productId,
    request.body
  );

  sendSuccess(response, {
    message: "Product updated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

export { create, getById, list, update };
