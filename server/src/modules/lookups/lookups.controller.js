import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  getCategoryLookup,
  getCustomerLookup,
  getLookupOptions,
  getProductLookup,
  getVendorLookup
} from "./lookups.service.js";

async function customers(request, response) {
  const result = await getCustomerLookup(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Customer lookup loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function products(request, response) {
  const result = await getProductLookup(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Product lookup loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function categories(request, response) {
  const result = await getCategoryLookup(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Category lookup loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function vendors(request, response) {
  const result = await getVendorLookup(request.query);

  sendSuccess(response, {
    message: "Vendor lookup loaded",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function options(request, response) {
  sendSuccess(response, {
    message: "Lookup options loaded",
    data: {
      groups: getLookupOptions()
    },
    meta: {
      requestId: request.context.requestId
    }
  });
}

export { categories, customers, options, products, vendors };
