import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import requireVendorWritable from "../../middlewares/requireVendorWritable.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { create, getById, list, update } from "./payments.controller.js";
import {
  paymentCreateBodySchema,
  paymentIdParamsSchema,
  paymentQuerySchema,
  paymentUpdateBodySchema
} from "./ledger.schemas.js";

const paymentsRoutes = Router();

paymentsRoutes.get(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ query: paymentQuerySchema }),
  requireVendorAccess(),
  asyncHandler(list)
);

paymentsRoutes.post(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({ query: paymentQuerySchema, body: paymentCreateBodySchema }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(create)
);

paymentsRoutes.get(
  "/:paymentId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: paymentIdParamsSchema, query: paymentQuerySchema }),
  requireVendorAccess(),
  asyncHandler(getById)
);

paymentsRoutes.patch(
  "/:paymentId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({
    params: paymentIdParamsSchema,
    query: paymentQuerySchema,
    body: paymentUpdateBodySchema
  }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(update)
);

export default paymentsRoutes;
