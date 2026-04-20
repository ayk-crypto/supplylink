import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  adjustInventory,
  getInventoryProductDetail,
  getInventoryProductDirectory,
  getStockMovementDirectory
} from "./inventory.service.js";

async function products(request, response) {
  const result = await getInventoryProductDirectory(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Inventory products loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function productDetail(request, response) {
  const result = await getInventoryProductDetail(request.access.vendorId, request.params.productId);

  sendSuccess(response, {
    message: "Inventory product loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function movements(request, response) {
  const result = await getStockMovementDirectory(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Stock movements loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function adjust(request, response) {
  const result = await adjustInventory(request.access.vendorId, request.body, request.auth);

  sendSuccess(response, {
    statusCode: 201,
    message: "Inventory adjusted",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

export { adjust, movements, productDetail, products };
