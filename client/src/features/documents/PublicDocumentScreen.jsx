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

function PublicDocumentScreen({ token }) {
  const [documentPayload, setDocumentPayload] = useState(null);
  const [share, setShare] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadDocument() {
      setIsLoading(true);
      setError("");

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

        setError(getApiErrorMessage(requestError, "Shared document could not be loaded."));
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
      setError(getApiErrorMessage(requestError, "PDF could not be downloaded."));
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
          <strong>This shared document is unavailable</strong>
          <p>{error}</p>
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
