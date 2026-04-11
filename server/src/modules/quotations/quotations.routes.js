import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { create, getById, list, update } from "./quotations.controller.js";
import {
  quotationCreateBodySchema,
  quotationIdParamsSchema,
  quotationQuerySchema,
  quotationUpdateBodySchema
} from "./quotations.schemas.js";

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
  asyncHandler(create)
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
  asyncHandler(update)
);

export default quotationsRoutes;
