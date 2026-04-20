import { Router } from "express";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import requireVendorWritable from "../../middlewares/requireVendorWritable.js";
import validateRequest from "../../middlewares/validateRequest.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { adjust, movements, productDetail, products } from "./inventory.controller.js";
import {
  inventoryAdjustBodySchema,
  inventoryProductIdParamsSchema,
  inventoryProductQuerySchema,
  stockMovementQuerySchema
} from "./inventory.schemas.js";

const inventoryRoutes = Router();

inventoryRoutes.get(
  "/products",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ query: inventoryProductQuerySchema }),
  requireVendorAccess(),
  asyncHandler(products)
);

inventoryRoutes.get(
  "/products/:productId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: inventoryProductIdParamsSchema, query: inventoryProductQuerySchema }),
  requireVendorAccess(),
  asyncHandler(productDetail)
);

inventoryRoutes.get(
  "/movements",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ query: stockMovementQuerySchema }),
  requireVendorAccess(),
  asyncHandler(movements)
);

inventoryRoutes.post(
  "/adjust",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({ query: inventoryProductQuerySchema, body: inventoryAdjustBodySchema }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(adjust)
);

export default inventoryRoutes;
