import AppError from "../../core/errors/AppError.js";
import {
  createAttachment,
  deleteAttachmentForVendor,
  findAttachmentForVendor,
  findTargetForVendor,
  listAttachmentsForVendor
} from "./files.repository.js";
import { deleteLocalFile, getLocalFilePath, saveLocalFile } from "./files.storage.js";
import { ALLOWED_MIME_TYPES, SUPPORTED_ENTITY_TYPES } from "./files.constants.js";

function mapAttachment(row) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    uploadedByUserId: row.uploaded_by_user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    originalFilename: row.original_filename,
    storageBackend: row.storage_backend,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    metadata: row.metadata || {},
    createdAt: row.created_at,
    links: {
      download: `/api/v1/files/${row.id}/download`
    }
  };
}

function assertSupportedEntityType(entityType) {
  if (!SUPPORTED_ENTITY_TYPES.includes(entityType)) {
    throw new AppError("Unsupported attachment entity type", {
      statusCode: 422,
      code: "UNSUPPORTED_ATTACHMENT_ENTITY_TYPE",
      details: [
        {
          path: "entityType",
          message: `Supported entity types: ${SUPPORTED_ENTITY_TYPES.join(", ")}`
        }
      ]
    });
  }
}

async function assertTargetExistsForVendor(vendorId, entityType, entityId) {
  assertSupportedEntityType(entityType);

  const target = await findTargetForVendor(vendorId, entityType, entityId);

  if (!target) {
    throw new AppError("Attachment target was not found for this vendor", {
      statusCode: 404,
      code: "ATTACHMENT_TARGET_NOT_FOUND",
      details: [
        {
          path: "entityId",
          message: `No ${entityType} record was found for this vendor and id`
        }
      ]
    });
  }
}

function parseMetadata(rawMetadata) {
  if (!rawMetadata) {
    return {};
  }

  if (typeof rawMetadata === "object") {
    return rawMetadata;
  }

  try {
    const parsed = JSON.parse(rawMetadata);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("metadata must be a JSON object");
    }

    return parsed;
  } catch (error) {
    throw new AppError("metadata must be a valid JSON object", {
      statusCode: 422,
      code: "INVALID_ATTACHMENT_METADATA",
      details: [
        {
          path: "metadata",
          message: error.message
        }
      ]
    });
  }
}

function assertAllowedFile(file) {
  if (!file) {
    throw new AppError("A file is required", {
      statusCode: 422,
      code: "FILE_REQUIRED",
      details: [{ path: "file", message: "Attach a multipart file field named file" }]
    });
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new AppError("Unsupported file type", {
      statusCode: 422,
      code: "UNSUPPORTED_FILE_TYPE",
      details: [
        {
          path: "file",
          message: `Allowed mime types: ${ALLOWED_MIME_TYPES.join(", ")}`
        }
      ]
    });
  }
}

async function createAttachmentForVendor(vendorId, payload, file, authContext) {
  assertAllowedFile(file);
  await assertTargetExistsForVendor(vendorId, payload.entityType, payload.entityId);

  const metadata = parseMetadata(payload.metadata);
  const storedFile = await saveLocalFile({
    vendorId,
    originalFilename: file.originalname,
    buffer: file.buffer
  });

  try {
    const row = await createAttachment({
      vendor_id: vendorId,
      uploaded_by_user_id: authContext.userId,
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      original_filename: file.originalname,
      stored_filename: storedFile.storedFilename,
      storage_key: storedFile.storageKey,
      storage_backend: storedFile.storageBackend,
      mime_type: file.mimetype,
      file_size: file.size,
      metadata
    });

    return mapAttachment(row);
  } catch (error) {
    await deleteLocalFile(storedFile.storageKey);
    throw error;
  }
}

async function getAttachmentDirectory(vendorId, query) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const offset = (page - 1) * pageSize;

  if (query.entityType) {
    assertSupportedEntityType(query.entityType);
  }

  if (query.entityType && query.entityId) {
    await assertTargetExistsForVendor(vendorId, query.entityType, query.entityId);
  }

  const result = await listAttachmentsForVendor({
    vendorId,
    entityType: query.entityType || null,
    entityId: query.entityId || null,
    limit: pageSize,
    offset
  });

  return {
    items: result.rows.map(mapAttachment),
    pagination: {
      page,
      pageSize,
      totalItems: result.total,
      totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize)
    },
    filters: {
      entityType: query.entityType || null,
      entityId: query.entityId || null
    }
  };
}

async function getAttachmentDetail(vendorId, attachmentId) {
  const row = await findAttachmentForVendor(vendorId, attachmentId);

  if (!row) {
    throw new AppError("File not found for this vendor", {
      statusCode: 404,
      code: "FILE_NOT_FOUND"
    });
  }

  return mapAttachment(row);
}

async function getAttachmentsForEntity(vendorId, entityType, entityId, query) {
  await assertTargetExistsForVendor(vendorId, entityType, entityId);

  return getAttachmentDirectory(vendorId, {
    ...query,
    entityType,
    entityId
  });
}

async function getAttachmentDownload(vendorId, attachmentId) {
  const row = await findAttachmentForVendor(vendorId, attachmentId);

  if (!row) {
    throw new AppError("File not found for this vendor", {
      statusCode: 404,
      code: "FILE_NOT_FOUND"
    });
  }

  if (row.storage_backend !== "local") {
    throw new AppError("This file storage backend is not supported by local download", {
      statusCode: 501,
      code: "UNSUPPORTED_STORAGE_BACKEND"
    });
  }

  return {
    attachment: mapAttachment(row),
    path: getLocalFilePath(row.storage_key)
  };
}

async function deleteAttachment(vendorId, attachmentId) {
  const row = await deleteAttachmentForVendor(vendorId, attachmentId);

  if (!row) {
    throw new AppError("File not found for this vendor", {
      statusCode: 404,
      code: "FILE_NOT_FOUND"
    });
  }

  if (row.storage_backend === "local") {
    await deleteLocalFile(row.storage_key);
  }

  return mapAttachment(row);
}

export {
  createAttachmentForVendor,
  deleteAttachment,
  getAttachmentDetail,
  getAttachmentDirectory,
  getAttachmentDownload,
  getAttachmentsForEntity
};
