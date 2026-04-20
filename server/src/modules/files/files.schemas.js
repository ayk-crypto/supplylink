import { z } from "zod";
import { SUPPORTED_ENTITY_TYPES } from "./files.constants.js";

const uuidParam = z.string().uuid();
const attachmentEntityTypeSchema = z.enum(SUPPORTED_ENTITY_TYPES);

const attachmentIdParamsSchema = z.object({
  fileId: uuidParam
});

const attachmentEntityParamsSchema = z.object({
  entityType: attachmentEntityTypeSchema,
  entityId: uuidParam
});

const attachmentUploadBodySchema = z.object({
  entityType: attachmentEntityTypeSchema,
  entityId: uuidParam,
  metadata: z.string().trim().min(2).max(10000).optional()
});

const attachmentQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    entityType: attachmentEntityTypeSchema.optional(),
    entityId: uuidParam.optional(),
    vendorId: uuidParam.optional()
  })
  .refine((value) => !value.entityId || value.entityType, {
    message: "entityType is required when entityId is provided",
    path: ["entityType"]
  });

const attachmentEntityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  vendorId: uuidParam.optional()
});

export {
  attachmentEntityParamsSchema,
  attachmentEntityQuerySchema,
  attachmentIdParamsSchema,
  attachmentQuerySchema,
  attachmentUploadBodySchema
};
