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

function DocumentShareModal({
  isLoading = false,
  onClose,
  onCopy,
  onOpen,
  share
}) {
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
          <div>
            <strong id="document-share-title">Send and share document</strong>
            <span>Copy a secure customer-facing link or open the shared preview.</span>
          </div>
          <button className="secondary-button" onClick={onClose} type="button">
            Close
          </button>
        </div>

        {isLoading ? (
          <div className="document-share-loading" role="status">
            <span className="document-preview-spinner" aria-hidden="true" />
            <span>Preparing secure share link...</span>
          </div>
        ) : (
          <>
            <label className="document-share-field" htmlFor="document-share-link">
              Share link
            </label>
            <input
              id="document-share-link"
              readOnly
              type="text"
              value={share?.publicUrl || ""}
            />

            <div className="button-row document-share-actions">
              <button className="primary-button" onClick={onCopy} type="button">
                Copy link
              </button>
              <button className="secondary-button" onClick={onOpen} type="button">
                Open preview
              </button>
            </div>

            <div className="document-share-meta">
              <div>
                <span>Shared</span>
                <strong>{formatShareTimestamp(share?.sentAt)}</strong>
              </div>
              <div>
                <span>Views</span>
                <strong>{share?.viewCount ?? 0}</strong>
              </div>
              <div>
                <span>Last viewed</span>
                <strong>{formatShareTimestamp(share?.lastViewedAt)}</strong>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DocumentShareModal;
