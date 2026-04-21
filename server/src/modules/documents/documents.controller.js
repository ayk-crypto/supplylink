import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  getPublicSharedDocument,
  getPublicSharedDocumentPdf
} from "./documents.share.service.js";

async function getPublicDocument(request, response) {
  const result = await getPublicSharedDocument(request.params.token);

  sendSuccess(response, {
    message: "Shared document loaded",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function getPublicDocumentPdf(request, response) {
  const result = await getPublicSharedDocumentPdf(request.params.token);

  response.setHeader("Content-Type", result.contentType);
  response.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
  response.setHeader("Cache-Control", "private, max-age=0, must-revalidate");

  return response.send(result.buffer);
}

export { getPublicDocument, getPublicDocumentPdf };
