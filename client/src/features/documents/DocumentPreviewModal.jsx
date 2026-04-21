import { useMemo } from "react";
import { buildDocumentHtml } from "./documentUtils.js";

function DocumentPreviewModal({ document, isLoading = false, onClose, onDownload, onPrint, settings }) {
  const html = useMemo(() => {
    if (!document) {
      return "";
    }

    return buildDocumentHtml(document, settings);
  }, [document, settings]);

  return (
    <div className="modal-backdrop document-preview-backdrop">
      <div className="document-preview-shell">
        <div className="document-preview-toolbar">
          <div>
            <strong>{document?.title || "Document preview"}</strong>
            <span>{document?.documentType ? `${document.documentType} preview` : "Preview"}</span>
          </div>
          <div className="button-row">
            <button className="secondary-button" disabled={!document || isLoading} onClick={onDownload} type="button">
              Download
            </button>
            <button className="primary-button" disabled={!document || isLoading} onClick={onPrint} type="button">
              Print
            </button>
            <button className="secondary-button" onClick={onClose} type="button">
              Close
            </button>
          </div>
        </div>
        {isLoading ? (
          <div className="document-preview-loading">Preparing document preview...</div>
        ) : (
          <iframe className="document-preview-frame" srcDoc={html} title={document?.title || "Document preview"} />
        )}
      </div>
    </div>
  );
}

export default DocumentPreviewModal;
