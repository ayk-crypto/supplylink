import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import validateRequest from "../../middlewares/validateRequest.js";
import createPublicShareRateLimiter from "./documents.publicRateLimit.js";
import { getPublicDocument, getPublicDocumentPdf } from "./documents.controller.js";
import { publicTokenParamsSchema } from "./documents.schemas.js";

const documentsRoutes = Router();

documentsRoutes.get(
  "/:token",
  createPublicShareRateLimiter("view"),
  validateRequest({ params: publicTokenParamsSchema }),
  asyncHandler(getPublicDocument)
);

documentsRoutes.get(
  "/:token/pdf",
  createPublicShareRateLimiter("pdf"),
  validateRequest({ params: publicTokenParamsSchema }),
  asyncHandler(getPublicDocumentPdf)
);

export default documentsRoutes;
