import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import requireVendorWritable from "../../middlewares/requireVendorWritable.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
  create,
  createStop,
  generate,
  getById,
  list,
  listStops,
  remove,
  removeStop,
  update,
  updateStop
} from "./routeTemplates.controller.js";
import {
  routeTemplateCreateBodySchema,
  routeTemplateGenerateBodySchema,
  routeTemplateIdParamsSchema,
  routeTemplateQuerySchema,
  routeTemplateStopCreateBodySchema,
  routeTemplateStopParamsSchema,
  routeTemplateStopUpdateBodySchema,
  routeTemplateUpdateBodySchema
} from "./routeTemplates.schemas.js";

const routeTemplatesRoutes = Router();

routeTemplatesRoutes.get(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ query: routeTemplateQuerySchema }),
  requireVendorAccess(),
  asyncHandler(list)
);

routeTemplatesRoutes.post(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({ query: routeTemplateQuerySchema, body: routeTemplateCreateBodySchema }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(create)
);

routeTemplatesRoutes.get(
  "/:templateId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: routeTemplateIdParamsSchema, query: routeTemplateQuerySchema }),
  requireVendorAccess(),
  asyncHandler(getById)
);

routeTemplatesRoutes.patch(
  "/:templateId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({
    params: routeTemplateIdParamsSchema,
    query: routeTemplateQuerySchema,
    body: routeTemplateUpdateBodySchema
  }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(update)
);

routeTemplatesRoutes.delete(
  "/:templateId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({ params: routeTemplateIdParamsSchema, query: routeTemplateQuerySchema }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(remove)
);

routeTemplatesRoutes.get(
  "/:templateId/stops",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: routeTemplateIdParamsSchema, query: routeTemplateQuerySchema }),
  requireVendorAccess(),
  asyncHandler(listStops)
);

routeTemplatesRoutes.post(
  "/:templateId/stops",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({
    params: routeTemplateIdParamsSchema,
    query: routeTemplateQuerySchema,
    body: routeTemplateStopCreateBodySchema
  }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(createStop)
);

routeTemplatesRoutes.patch(
  "/:templateId/stops/:stopId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({
    params: routeTemplateStopParamsSchema,
    query: routeTemplateQuerySchema,
    body: routeTemplateStopUpdateBodySchema
  }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(updateStop)
);

routeTemplatesRoutes.delete(
  "/:templateId/stops/:stopId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({ params: routeTemplateStopParamsSchema, query: routeTemplateQuerySchema }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(removeStop)
);

routeTemplatesRoutes.post(
  "/:templateId/generate",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({
    params: routeTemplateIdParamsSchema,
    query: routeTemplateQuerySchema,
    body: routeTemplateGenerateBodySchema
  }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(generate)
);

export default routeTemplatesRoutes;
