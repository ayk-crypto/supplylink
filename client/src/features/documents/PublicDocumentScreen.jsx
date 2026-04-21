import { useEffect, useMemo, useState } from "react";
import {
  downloadSharedDocumentPdf,
  getSharedDocument
} from "../../services/documentShareApi.js";
import { getApiErrorMessage } from "../master-data/resourceUtils.js";
import {
  downloadBlobFile,
  getDownloadFilename,
  openDocumentPrintWindow,
  buildDocumentHtml
} from "./documentUtils.js";

function getPublicShareErrorState(requestError) {
  const code = requestError?.payload?.code;

  switch (code) {
    case "DOCUMENT_SHARE_REVOKED":
      return {
        title: "This secure link was revoked",
        message: "The sender disabled this share link. Ask them for a fresh link."
      };
    case "DOCUMENT_SHARE_EXPIRED":
      return {
        title: "This secure link has expired",
        message: "The sender can regenerate a new secure link for this document."
      };
    case "DOCUMENT_SHARE_RATE_LIMITED":
      return {
        title: "Too many attempts",
        message: "Please wait a minute, then try opening this secure link again."
      };
    case "DOCUMENT_SHARE_NOT_FOUND":
      return {
        title: "This secure link is invalid",
        message: "Double-check the URL or ask the sender to copy the latest link again."
      };
    default:
      return {
        title: "This shared document is unavailable",
        message: getApiErrorMessage(requestError, "Shared document could not be loaded.")
      };
  }
}

function PublicDocumentScreen({ token }) {
  const [documentPayload, setDocumentPayload] = useState(null);
  const [share, setShare] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadDocument() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getSharedDocument(token, { signal: controller.signal });

        if (!active) {
          return;
        }

        setDocumentPayload(response.data.document);
        setShare(response.data.share);
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        setError(getPublicShareErrorState(requestError));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadDocument();

    return () => {
      active = false;
      controller.abort();
    };
  }, [token]);

  const previewHtml = useMemo(() => {
    if (!documentPayload) {
      return "";
    }

    return buildDocumentHtml(documentPayload, {});
  }, [documentPayload]);

  async function handleDownload() {
    setIsDownloading(true);

    try {
      const response = await downloadSharedDocumentPdf(token);
      downloadBlobFile(
        response.data,
        getDownloadFilename(response.headers?.contentDisposition, "document.pdf")
      );
    } catch (requestError) {
      setError({
        title: "PDF unavailable",
        message: getApiErrorMessage(requestError, "PDF could not be downloaded.")
      });
    } finally {
      setIsDownloading(false);
    }
  }

  function handlePrint() {
    if (!documentPayload) {
      return;
    }

    openDocumentPrintWindow(documentPayload, {});
  }

  if (isLoading) {
    return (
      <main className="public-document-page">
        <section className="public-document-loading">
          <span className="document-preview-spinner" aria-hidden="true" />
          <span>Loading shared document...</span>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="public-document-page">
        <section className="public-document-empty">
          <strong>{error.title}</strong>
          <p>{error.message}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="public-document-page">
      <section className="public-document-toolbar">
        <div>
          <strong>{documentPayload?.title || "Shared document"}</strong>
          <span>
            {documentPayload?.documentType
              ? `${documentPayload.documentType} document`
              : "Read-only shared view"}
          </span>
        </div>
        <div className="button-row">
          <button
            className="secondary-button"
            disabled={isDownloading}
            onClick={handleDownload}
            type="button"
          >
            {isDownloading ? "Preparing PDF..." : "Download PDF"}
          </button>
          <button className="primary-button" onClick={handlePrint} type="button">
            Print
          </button>
        </div>
      </section>

      <section className="public-document-frame-wrap">
        <iframe
          className="public-document-frame"
          srcDoc={previewHtml}
          title={documentPayload?.title || "Shared document"}
        />
      </section>

      {share ? (
        <section className="public-document-footnote">
          <span>Shared securely by SupplyLink workspace</span>
          <span>Views: {share.viewCount ?? 0}</span>
        </section>
      ) : null}
    </main>
  );
}

export default PublicDocumentScreen;
