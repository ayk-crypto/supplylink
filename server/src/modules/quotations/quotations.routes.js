import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import requireVendorWritable from "../../middlewares/requireVendorWritable.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
  accept,
  convertToOrder,
  create,
  email,
  expire,
  getById,
  list,
  pdf,
  print,
  regenerateShare,
  reject,
  revokeShare,
  send,
  share,
  update
} from "./quotations.controller.js";
import {
  quotationCreateBodySchema,
  quotationIdParamsSchema,
  quotationQuerySchema,
  quotationUpdateBodySchema
} from "./quotations.schemas.js";
import { documentEmailBodySchema } from "../documents/documents.schemas.js";

const quotationsRoutes = Router();

quotationsRoutes.get(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ query: quotationQuerySchema }),
  requireVendorAccess(),
  asyncHandler(list)
);

quotationsRoutes.post(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({ query: quotationQuerySchema, body: quotationCreateBodySchema }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(create)
);

function quotationAction(handler) {
  return [
    authenticate,
    authorizeRoles("super_admin", "vendor_admin"),
    validateRequest({ params: quotationIdParamsSchema, query: quotationQuerySchema }),
    requireVendorAccess(),
    requireVendorWritable(),
    asyncHandler(handler)
  ];
}

function quotationShareAction(handler) {
  return [
    authenticate,
    authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
    validateRequest({ params: quotationIdParamsSchema, query: quotationQuerySchema }),
    requireVendorAccess(),
    asyncHandler(handler)
  ];
}

quotationsRoutes.post("/:quotationId/send", ...quotationAction(send));
quotationsRoutes.post("/:quotationId/share/revoke", ...quotationShareAction(revokeShare));
quotationsRoutes.post("/:quotationId/share/regenerate", ...quotationShareAction(regenerateShare));
quotationsRoutes.post(
  "/:quotationId/email",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({
    params: quotationIdParamsSchema,
    query: quotationQuerySchema,
    body: documentEmailBodySchema
  }),
  requireVendorAccess(),
  asyncHandler(email)
);
quotationsRoutes.post("/:quotationId/share", ...quotationShareAction(share));
quotationsRoutes.post("/:quotationId/accept", ...quotationAction(accept));
quotationsRoutes.post("/:quotationId/reject", ...quotationAction(reject));
quotationsRoutes.post("/:quotationId/expire", ...quotationAction(expire));
quotationsRoutes.post("/:quotationId/convert-to-order", ...quotationAction(convertToOrder));

quotationsRoutes.get(
  "/:quotationId/pdf",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: quotationIdParamsSchema, query: quotationQuerySchema }),
  requireVendorAccess(),
  asyncHandler(pdf)
);

quotationsRoutes.get(
  "/:quotationId/print",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: quotationIdParamsSchema, query: quotationQuerySchema }),
  requireVendorAccess(),
  asyncHandler(print)
);

quotationsRoutes.get(
  "/:quotationId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: quotationIdParamsSchema, query: quotationQuerySchema }),
  requireVendorAccess(),
  asyncHandler(getById)
);

quotationsRoutes.patch(
  "/:quotationId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({
    params: quotationIdParamsSchema,
    query: quotationQuerySchema,
    body: quotationUpdateBodySchema
  }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(update)
);

export default quotationsRoutes;
