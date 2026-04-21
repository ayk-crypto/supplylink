function DocumentActionBar({
  onPreview,
  onDownload,
  onPrint,
  isBusy = false,
  busyLabel = "Preparing...",
  extras = null
}) {
  return (
    <div className="doc-action-bar" role="toolbar" aria-label="Document actions">
      <button
        className="secondary-button doc-action-bar-button"
        disabled={isBusy}
        onClick={onPreview}
        type="button"
      >
        <span aria-hidden="true">👁</span>
        {isBusy ? busyLabel : "Preview"}
      </button>
      <button
        className="secondary-button doc-action-bar-button"
        disabled={isBusy}
        onClick={onDownload}
        type="button"
      >
        <span aria-hidden="true">⤓</span>
        Download PDF
      </button>
      <button
        className="primary-button doc-action-bar-button"
        disabled={isBusy}
        onClick={onPrint}
        type="button"
      >
        <span aria-hidden="true">⎙</span>
        {isBusy ? busyLabel : "Print"}
      </button>
      {extras}
    </div>
  );
}

export default DocumentActionBar;
