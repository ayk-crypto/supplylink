import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import requireVendorWritable from "../../middlewares/requireVendorWritable.js";
import requireSubscriptionAccess from "../../middlewares/requireSubscriptionAccess.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { create, getById, list, update } from "./customers.controller.js";
import {
  customerCreateBodySchema,
  customerIdParamsSchema,
  customerUpdateBodySchema,
  paginationQuerySchema
} from "./customers.schemas.js";

const customersRoutes = Router();

customersRoutes.get(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ query: paginationQuerySchema }),
  requireVendorAccess(),
  asyncHandler(list)
);

customersRoutes.post(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({ query: paginationQuerySchema, body: customerCreateBodySchema }),
  requireVendorAccess(),
  requireVendorWritable(),
  requireSubscriptionAccess("create_customer"),
  asyncHandler(create)
);

customersRoutes.get(
  "/:customerId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: customerIdParamsSchema, query: paginationQuerySchema }),
  requireVendorAccess(),
  asyncHandler(getById)
);

customersRoutes.patch(
  "/:customerId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({
    params: customerIdParamsSchema,
    query: paginationQuerySchema,
    body: customerUpdateBodySchema
  }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(update)
);

export default customersRoutes;
