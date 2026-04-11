import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { create, getById, list, update } from "./categories.controller.js";
import {
  categoryCreateBodySchema,
  categoryIdParamsSchema,
  categoryQuerySchema,
  categoryUpdateBodySchema
} from "./catalog.schemas.js";

const categoriesRoutes = Router();

categoriesRoutes.get(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ query: categoryQuerySchema }),
  requireVendorAccess(),
  asyncHandler(list)
);

categoriesRoutes.post(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({ query: categoryQuerySchema, body: categoryCreateBodySchema }),
  requireVendorAccess(),
  asyncHandler(create)
);

categoriesRoutes.get(
  "/:categoryId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: categoryIdParamsSchema, query: categoryQuerySchema }),
  requireVendorAccess(),
  asyncHandler(getById)
);

categoriesRoutes.patch(
  "/:categoryId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({
    params: categoryIdParamsSchema,
    query: categoryQuerySchema,
    body: categoryUpdateBodySchema
  }),
  requireVendorAccess(),
  asyncHandler(update)
);

export default categoriesRoutes;
