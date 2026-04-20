import { Router } from "express";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import requireVendorWritable from "../../middlewares/requireVendorWritable.js";
import validateRequest from "../../middlewares/validateRequest.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { getSettings, updateSettings } from "./settings.controller.js";
import { settingsQuerySchema, settingsUpdateBodySchema } from "./settings.schemas.js";

const settingsRoutes = Router();

settingsRoutes.get(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ query: settingsQuerySchema }),
  requireVendorAccess(),
  asyncHandler(getSettings)
);

settingsRoutes.patch(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({ query: settingsQuerySchema, body: settingsUpdateBodySchema }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(updateSettings)
);

export default settingsRoutes;
