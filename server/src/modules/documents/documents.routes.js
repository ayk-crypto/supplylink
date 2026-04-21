import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { getPublicDocument, getPublicDocumentPdf } from "./documents.controller.js";
import { publicTokenParamsSchema } from "./documents.schemas.js";

const documentsRoutes = Router();

documentsRoutes.get(
  "/:token",
  validateRequest({ params: publicTokenParamsSchema }),
  asyncHandler(getPublicDocument)
);

documentsRoutes.get(
  "/:token/pdf",
  validateRequest({ params: publicTokenParamsSchema }),
  asyncHandler(getPublicDocumentPdf)
);

export default documentsRoutes;
