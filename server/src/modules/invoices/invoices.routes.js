import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import requireVendorWritable from "../../middlewares/requireVendorWritable.js";
import requireSubscriptionAccess from "../../middlewares/requireSubscriptionAccess.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
  create,
  email,
  getById,
  issue,
  list,
  pdf,
  print,
  regenerateShare,
  revokeShare,
  share,
  update,
  voidInvoice
} from "./invoices.controller.js";
import {
  invoiceCreateBodySchema,
  invoiceIdParamsSchema,
  invoiceQuerySchema,
  invoiceUpdateBodySchema
} from "./invoices.schemas.js";
import { documentEmailBodySchema } from "../documents/documents.schemas.js";
import { emptyBodySchema } from "../../core/http/emptySchema.js";

const invoicesRoutes = Router();

invoicesRoutes.get(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ query: invoiceQuerySchema }),
  requireVendorAccess(),
  asyncHandler(list)
);

invoicesRoutes.post(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({ query: invoiceQuerySchema, body: invoiceCreateBodySchema }),
  requireVendorAccess(),
  requireVendorWritable(),
  requireSubscriptionAccess("create_invoice"),
  asyncHandler(create)
);

function invoiceAction(handler) {
  return [
    authenticate,
    authorizeRoles("super_admin", "vendor_admin"),
    validateRequest({
      params: invoiceIdParamsSchema,
      query: invoiceQuerySchema,
      body: emptyBodySchema
    }),
    requireVendorAccess(),
    requireVendorWritable(),
    asyncHandler(handler)
  ];
}

function invoiceShareAction(handler) {
  return [
    authenticate,
    authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
    validateRequest({
      params: invoiceIdParamsSchema,
      query: invoiceQuerySchema,
      body: emptyBodySchema
    }),
    requireVendorAccess(),
    asyncHandler(handler)
  ];
}

invoicesRoutes.post("/:invoiceId/issue", ...invoiceAction(issue));
invoicesRoutes.post(
  "/:invoiceId/email",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({
    params: invoiceIdParamsSchema,
    query: invoiceQuerySchema,
    body: documentEmailBodySchema
  }),
  requireVendorAccess(),
  asyncHandler(email)
);
invoicesRoutes.post("/:invoiceId/share", ...invoiceShareAction(share));
invoicesRoutes.post("/:invoiceId/share/revoke", ...invoiceShareAction(revokeShare));
invoicesRoutes.post(
  "/:invoiceId/share/regenerate",
  ...invoiceShareAction(regenerateShare)
);
invoicesRoutes.post("/:invoiceId/void", ...invoiceAction(voidInvoice));

invoicesRoutes.get(
  "/:invoiceId/pdf",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: invoiceIdParamsSchema, query: invoiceQuerySchema }),
  requireVendorAccess(),
  asyncHandler(pdf)
);

invoicesRoutes.get(
  "/:invoiceId/print",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: invoiceIdParamsSchema, query: invoiceQuerySchema }),
  requireVendorAccess(),
  asyncHandler(print)
);

invoicesRoutes.get(
  "/:invoiceId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: invoiceIdParamsSchema, query: invoiceQuerySchema }),
  requireVendorAccess(),
  asyncHandler(getById)
);

invoicesRoutes.patch(
  "/:invoiceId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({
    params: invoiceIdParamsSchema,
    query: invoiceQuerySchema,
    body: invoiceUpdateBodySchema
  }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(update)
);

export default invoicesRoutes;
