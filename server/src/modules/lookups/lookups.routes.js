import { Router } from "express";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import validateRequest from "../../middlewares/validateRequest.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { categories, customers, options, products, vendors } from "./lookups.controller.js";
import {
  lookupQuerySchema,
  productLookupQuerySchema,
  vendorLookupQuerySchema
} from "./lookups.schemas.js";

const lookupsRoutes = Router();
const vendorLookupAccess = [
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff")
];

lookupsRoutes.get(
  "/customers",
  ...vendorLookupAccess,
  validateRequest({ query: lookupQuerySchema }),
  requireVendorAccess(),
  asyncHandler(customers)
);

lookupsRoutes.get(
  "/products",
  ...vendorLookupAccess,
  validateRequest({ query: productLookupQuerySchema }),
  requireVendorAccess(),
  asyncHandler(products)
);

lookupsRoutes.get(
  "/categories",
  ...vendorLookupAccess,
  validateRequest({ query: lookupQuerySchema }),
  requireVendorAccess(),
  asyncHandler(categories)
);

lookupsRoutes.get(
  "/vendors",
  authenticate,
  authorizeRoles("super_admin"),
  validateRequest({ query: vendorLookupQuerySchema }),
  asyncHandler(vendors)
);

lookupsRoutes.get(
  "/options",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  asyncHandler(options)
);

export default lookupsRoutes;
