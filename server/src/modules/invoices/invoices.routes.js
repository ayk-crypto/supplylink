import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import requireVendorWritable from "../../middlewares/requireVendorWritable.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { create, getById, list, print, update } from "./invoices.controller.js";
import {
  invoiceCreateBodySchema,
  invoiceIdParamsSchema,
  invoiceQuerySchema,
  invoiceUpdateBodySchema
} from "./invoices.schemas.js";

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
  asyncHandler(create)
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
