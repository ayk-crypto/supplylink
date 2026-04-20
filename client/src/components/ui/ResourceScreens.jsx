function PageHeader({ eyebrow, title, description, action }) {
  return (
    <section className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? <div className="page-header-action">{action}</div> : null}
    </section>
  );
}

function Toolbar({ children, onSubmit }) {
  return (
    <form className="resource-toolbar" onSubmit={onSubmit}>
      {children}
    </form>
  );
}

function EmptyState({ children }) {
  return <p className="empty-panel">{children}</p>;
}

function Field({ children, error, hint, label }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
      {error ? (
        <small className="field-error" role="alert">
          {error}
        </small>
      ) : null}
    </label>
  );
}

function FormPanel({
  children,
  error,
  isSubmitting = false,
  onCancel,
  onSubmit,
  submitLabel,
  title
}) {
  return (
    <div className="modal-backdrop">
      <form className="form-panel" onSubmit={onSubmit}>
        <div className="form-panel-heading">
          <h3>{title}</h3>
          <button aria-label="Close form" onClick={onCancel} type="button">
            Close
          </button>
        </div>
        {error ? (
          <div className="form-error" role="alert">
            <strong>Save failed</strong>
            <span>{error}</span>
          </div>
        ) : null}
        <div className="form-grid">{children}</div>
        <div className="form-actions">
          <button
            className="secondary-button"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function Pagination({ pagination, onPageChange }) {
  if (!pagination) {
    return null;
  }

  const canGoBack = pagination.page > 1;
  const canGoForward = pagination.totalPages > pagination.page;

  return (
    <div className="pagination-bar">
      <span>
        Page {pagination.page} of {pagination.totalPages || 1} / {pagination.totalItems} records
      </span>
      <div>
        <button
          className="secondary-button"
          disabled={!canGoBack}
          onClick={() => onPageChange(pagination.page - 1)}
          type="button"
        >
          Previous
        </button>
        <button
          className="secondary-button"
          disabled={!canGoForward}
          onClick={() => onPageChange(pagination.page + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export { EmptyState, Field, FormPanel, PageHeader, Pagination, Toolbar };
