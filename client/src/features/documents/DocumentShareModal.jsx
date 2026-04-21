import { useEffect, useState } from "react";

function formatShareTimestamp(value) {
  if (!value) {
    return "Not yet";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString();
}

function getShareStatusLabel(share) {
  switch (share?.status) {
    case "revoked":
      return "Revoked";
    case "expired":
      return "Expired";
    case "active":
      return "Active";
    default:
      return "Not shared";
  }
}

function DocumentShareModal({
  isLoading = false,
  isMutating = false,
  onClose,
  onCopy,
  onOpen,
  onRegenerate,
  onRevoke,
  share
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleCopy() {
    try {
      await onCopy?.();
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (_err) {
      setCopied(false);
    }
  }

  return (
    <div
      className="modal-backdrop document-share-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
      role="presentation"
    >
      <div
        aria-labelledby="document-share-title"
        aria-modal="true"
        className="document-share-shell"
        role="dialog"
      >
        <div className="document-share-header">
          <div className="document-share-header-main">
            <span className="document-share-icon" aria-hidden="true">
              S
            </span>
            <div>
              <strong id="document-share-title">Share document</strong>
              <span>
                Send a secure, customer-facing link or open the live shared preview.
              </span>
            </div>
          </div>
          <button
            aria-label="Close"
            className="document-share-close"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>

        {isLoading ? (
          <div className="document-share-loading" role="status">
            <span className="document-preview-spinner" aria-hidden="true" />
            <span>Preparing secure share link...</span>
          </div>
        ) : (
          <div className="document-share-body">
            <div className="document-share-status-row">
              <div className={`document-share-status status-${share?.status || "missing"}`}>
                <span>Status</span>
                <strong>{getShareStatusLabel(share)}</strong>
              </div>
              <div className="document-share-actions">
                <button
                  className="secondary-button"
                  disabled={isMutating || !share?.isActive}
                  onClick={onRevoke}
                  type="button"
                >
                  {isMutating && share?.isActive ? "Updating..." : "Revoke link"}
                </button>
                <button
                  className="primary-button"
                  disabled={isMutating}
                  onClick={onRegenerate}
                  type="button"
                >
                  {isMutating ? "Updating..." : "Regenerate link"}
                </button>
              </div>
            </div>

            <div className="document-share-field-group">
              <label className="document-share-field" htmlFor="document-share-link">
                Secure share link
              </label>
              <div className="document-share-link-row">
                <input
                  id="document-share-link"
                  onFocus={(event) => event.target.select()}
                  readOnly
                  type="text"
                  value={share?.publicUrl || ""}
                />
                <button
                  className={`primary-button document-share-copy-button${copied ? " is-copied" : ""}`}
                  disabled={!share?.publicUrl}
                  onClick={handleCopy}
                  type="button"
                >
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>
              <small className="document-share-help">
                Anyone with this link can view a read-only copy. Revoke or regenerate it at
                any time.
              </small>
            </div>

            <div className="document-share-meta">
              <div>
                <span>Created</span>
                <strong>{formatShareTimestamp(share?.createdAt)}</strong>
              </div>
              <div>
                <span>Views</span>
                <strong>{share?.viewCount ?? 0}</strong>
              </div>
              <div>
                <span>First viewed</span>
                <strong>{formatShareTimestamp(share?.firstViewedAt)}</strong>
              </div>
              <div>
                <span>Last viewed</span>
                <strong>{formatShareTimestamp(share?.lastViewedAt)}</strong>
              </div>
              <div>
                <span>Expires</span>
                <strong>{formatShareTimestamp(share?.expiresAt)}</strong>
              </div>
              <div>
                <span>Revoked</span>
                <strong>{formatShareTimestamp(share?.revokedAt)}</strong>
              </div>
            </div>

            <div className="document-share-footer">
              <button className="secondary-button" onClick={onClose} type="button">
                Close
              </button>
              <button
                className="secondary-button"
                disabled={!share?.publicUrl || !share?.isActive}
                onClick={onOpen}
                type="button"
              >
                Open preview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentShareModal;
