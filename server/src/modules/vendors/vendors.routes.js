import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
  getById,
  getMe,
  list,
  listMembersByVendorId,
  listMyMembers,
  updateById,
  updateMe
} from "./vendors.controller.js";
import {
  baseVendorUpdateBodySchema,
  paginationQuerySchema,
  superAdminVendorUpdateBodySchema,
  vendorIdParamsSchema
} from "./vendors.schemas.js";

const vendorsRoutes = Router();

vendorsRoutes.get(
  "/",
  authenticate,
  authorizeRoles("super_admin"),
  validateRequest({ query: paginationQuerySchema }),
  asyncHandler(list)
);

vendorsRoutes.get("/me", authenticate, requireVendorAccess(), asyncHandler(getMe));

vendorsRoutes.patch(
  "/me",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  requireVendorAccess(),
  validateRequest({ body: baseVendorUpdateBodySchema }),
  asyncHandler(updateMe)
);

vendorsRoutes.get(
  "/me/members",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  requireVendorAccess(),
  asyncHandler(listMyMembers)
);

vendorsRoutes.get(
  "/:vendorId",
  authenticate,
  validateRequest({ params: vendorIdParamsSchema }),
  requireVendorAccess(),
  asyncHandler(getById)
);

vendorsRoutes.patch(
  "/:vendorId",
  authenticate,
  authorizeRoles("super_admin"),
  validateRequest({
    params: vendorIdParamsSchema,
    body: superAdminVendorUpdateBodySchema
  }),
  requireVendorAccess(),
  asyncHandler(updateById)
);

vendorsRoutes.get(
  "/:vendorId/members",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({ params: vendorIdParamsSchema }),
  requireVendorAccess(),
  asyncHandler(listMembersByVendorId)
);

export default vendorsRoutes;
