import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import requireVendorWritable from "../../middlewares/requireVendorWritable.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { create, getById, list, update } from "./products.controller.js";
import {
  productCreateBodySchema,
  productIdParamsSchema,
  productQuerySchema,
  productUpdateBodySchema
} from "./catalog.schemas.js";

const productsRoutes = Router();

productsRoutes.get(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ query: productQuerySchema }),
  requireVendorAccess(),
  asyncHandler(list)
);

productsRoutes.post(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({ query: productQuerySchema, body: productCreateBodySchema }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(create)
);

productsRoutes.get(
  "/:productId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: productIdParamsSchema, query: productQuerySchema }),
  requireVendorAccess(),
  asyncHandler(getById)
);

productsRoutes.patch(
  "/:productId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({
    params: productIdParamsSchema,
    query: productQuerySchema,
    body: productUpdateBodySchema
  }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(update)
);

export default productsRoutes;
