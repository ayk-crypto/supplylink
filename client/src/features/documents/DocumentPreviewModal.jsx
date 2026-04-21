import { useEffect, useMemo, useRef } from "react";
import { buildDocumentHtml } from "./documentUtils.js";

function DocumentPreviewModal({ document, isLoading = false, onClose, onDownload, onPrint, settings }) {
  const html = useMemo(() => {
    if (!document) {
      return "";
    }

    return buildDocumentHtml(document, settings);
  }, [document, settings]);

  const closeButtonRef = useRef(null);

  useEffect(() => {
    const doc = typeof window !== "undefined" ? window.document : null;
    const previouslyFocused =
      doc && doc.activeElement instanceof HTMLElement ? doc.activeElement : null;

    closeButtonRef.current?.focus();

    function handleKey(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop document-preview-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
      role="presentation"
    >
      <div
        aria-labelledby="document-preview-title"
        aria-modal="true"
        className="document-preview-shell"
        role="dialog"
      >
        <div className="document-preview-toolbar">
          <div className="document-preview-toolbar-meta">
            <strong id="document-preview-title">
              {document?.title || "Document preview"}
            </strong>
            <span>
              {document?.documentType
                ? `${document.documentType} preview`
                : "Preview"}
            </span>
          </div>
          <div className="button-row">
            <button
              className="secondary-button"
              disabled={!document || isLoading}
              onClick={onDownload}
              type="button"
            >
              Download PDF
            </button>
            <button
              className="primary-button"
              disabled={!document || isLoading}
              onClick={onPrint}
              type="button"
            >
              Print
            </button>
            <button
              aria-label="Close preview"
              className="secondary-button"
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
            >
              Close
            </button>
          </div>
        </div>
        {isLoading || !document ? (
          <div className="document-preview-loading" role="status">
            <span className="document-preview-spinner" aria-hidden="true" />
            <span>Preparing document preview…</span>
          </div>
        ) : (
          <iframe
            className="document-preview-frame"
            srcDoc={html}
            title={document?.title || "Document preview"}
          />
        )}
      </div>
    </div>
  );
}

export default DocumentPreviewModal;
