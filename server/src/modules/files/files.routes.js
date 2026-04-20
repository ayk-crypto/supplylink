import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import requireVendorWritable from "../../middlewares/requireVendorWritable.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { create, download, getById, list, listForEntity, remove } from "./files.controller.js";
import {
  attachmentEntityParamsSchema,
  attachmentEntityQuerySchema,
  attachmentIdParamsSchema,
  attachmentQuerySchema,
  attachmentUploadBodySchema
} from "./files.schemas.js";
import uploadSingleFile from "./files.upload.js";

const filesRoutes = Router();

filesRoutes.get(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ query: attachmentQuerySchema }),
  requireVendorAccess(),
  asyncHandler(list)
);

filesRoutes.post(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  uploadSingleFile,
  validateRequest({ query: attachmentQuerySchema, body: attachmentUploadBodySchema }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(create)
);

filesRoutes.get(
  "/entity/:entityType/:entityId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: attachmentEntityParamsSchema, query: attachmentEntityQuerySchema }),
  requireVendorAccess(),
  asyncHandler(listForEntity)
);

filesRoutes.get(
  "/:fileId/download",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: attachmentIdParamsSchema, query: attachmentEntityQuerySchema }),
  requireVendorAccess(),
  asyncHandler(download)
);

filesRoutes.get(
  "/:fileId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: attachmentIdParamsSchema, query: attachmentEntityQuerySchema }),
  requireVendorAccess(),
  asyncHandler(getById)
);

filesRoutes.delete(
  "/:fileId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({ params: attachmentIdParamsSchema, query: attachmentEntityQuerySchema }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(remove)
);

export default filesRoutes;
