import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { getHealth, getModuleIndex, getReadiness, getSystemOverview } from "./system.controller.js";
import { healthQuerySchema } from "./system.schemas.js";

const router = Router();

router.get("/health", validateRequest({ query: healthQuerySchema }), asyncHandler(getHealth));
router.get("/readiness", asyncHandler(getReadiness));
router.get("/overview", asyncHandler(getSystemOverview));
router.get("/modules", asyncHandler(getModuleIndex));

export default router;
