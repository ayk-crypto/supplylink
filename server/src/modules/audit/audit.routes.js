import { Router } from "express";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import validateRequest from "../../middlewares/validateRequest.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { entityHistory, list } from "./audit.controller.js";
import { auditEntityParamsSchema, auditQuerySchema } from "./audit.schemas.js";

const auditRoutes = Router();

auditRoutes.get(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ query: auditQuerySchema }),
  requireVendorAccess(),
  asyncHandler(list)
);

auditRoutes.get(
  "/:entityType/:entityId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: auditEntityParamsSchema, query: auditQuerySchema }),
  requireVendorAccess(),
  asyncHandler(entityHistory)
);

export default auditRoutes;
