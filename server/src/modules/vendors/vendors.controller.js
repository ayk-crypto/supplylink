import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  getAccessibleVendorProfile,
  getVendorDirectory,
  getVendorMembers,
  updateAccessibleVendorProfile
} from "./vendors.service.js";

async function list(request, response) {
  const result = await getVendorDirectory(request.query);

  sendSuccess(response, {
    message: "Vendor directory loaded",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function getMe(request, response) {
  const vendor = await getAccessibleVendorProfile(request.access.vendorId);

  sendSuccess(response, {
    message: "Current vendor profile loaded",
    data: vendor,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function getById(request, response) {
  const vendor = await getAccessibleVendorProfile(request.access.vendorId);

  sendSuccess(response, {
    message: "Vendor profile loaded",
    data: vendor,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function updateMe(request, response) {
  const vendor = await updateAccessibleVendorProfile(
    request.access.vendorId,
    request.body,
    request.auth
  );

  sendSuccess(response, {
    message: "Vendor profile updated",
    data: vendor,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function updateById(request, response) {
  const vendor = await updateAccessibleVendorProfile(
    request.access.vendorId,
    request.body,
    request.auth
  );

  sendSuccess(response, {
    message: "Vendor profile updated",
    data: vendor,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function listMyMembers(request, response) {
  const result = await getVendorMembers(request.access.vendorId);

  sendSuccess(response, {
    message: "Vendor members loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function listMembersByVendorId(request, response) {
  const result = await getVendorMembers(request.access.vendorId);

  sendSuccess(response, {
    message: "Vendor members loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

export { getById, getMe, list, listMembersByVendorId, listMyMembers, updateById, updateMe };
