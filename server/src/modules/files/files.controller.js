import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  createAttachmentForVendor,
  deleteAttachment,
  getAttachmentDetail,
  getAttachmentDirectory,
  getAttachmentDownload,
  getAttachmentsForEntity
} from "./files.service.js";

async function list(request, response) {
  const result = await getAttachmentDirectory(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Files loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function create(request, response) {
  const result = await createAttachmentForVendor(
    request.access.vendorId,
    request.body,
    request.file,
    request.auth
  );

  sendSuccess(response, {
    statusCode: 201,
    message: "File uploaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function getById(request, response) {
  const result = await getAttachmentDetail(request.access.vendorId, request.params.fileId);

  sendSuccess(response, {
    message: "File loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function listForEntity(request, response) {
  const result = await getAttachmentsForEntity(
    request.access.vendorId,
    request.params.entityType,
    request.params.entityId,
    request.query
  );

  sendSuccess(response, {
    message: "Entity files loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      entityType: request.params.entityType,
      entityId: request.params.entityId
    }
  });
}

async function download(request, response) {
  const result = await getAttachmentDownload(request.access.vendorId, request.params.fileId);

  response.setHeader("Content-Type", result.attachment.mimeType);
  response.setHeader("Content-Length", String(result.attachment.fileSize));
  response.setHeader("Content-Disposition", `attachment; filename="${result.attachment.originalFilename}"`);
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cache-Control", "private, no-store");

  return new Promise((resolve, reject) => {
    response.download(result.path, result.attachment.originalFilename, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function remove(request, response) {
  const result = await deleteAttachment(request.access.vendorId, request.params.fileId);

  sendSuccess(response, {
    message: "File deleted",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

export { create, download, getById, list, listForEntity, remove };
