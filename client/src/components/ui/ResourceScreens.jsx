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

function LoadingState({ children = "Loading…" }) {
  return (
    <p aria-live="polite" className="surface-message loading">
      <span>{children}</span>
    </p>
  );
}

function ErrorState({ message, onRetry, retryLabel = "Try again" }) {
  if (!message) return null;
  return (
    <div className="error-state surface-message error" role="alert">
      <span>{message}</span>
      {typeof onRetry === "function" ? (
        <button className="link-button" onClick={onRetry} type="button">
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

function LoadingSkeleton({ rows = 3, label = "Loading content" }) {
  const items = Array.from({ length: Math.max(1, rows) });
  return (
    <div aria-busy="true" aria-label={label} className="loading-skeleton">
      {items.map((_, index) => (
        <span className="skeleton-row" key={index} />
      ))}
    </div>
  );
}

function TableScroll({ children }) {
  return <div className="table-scroll">{children}</div>;
}

function SectionHeader({ title, action, hint }) {
  return (
    <div className="panel-heading section-heading">
      <div>
        <h3>{title}</h3>
        {hint ? <span>{hint}</span> : null}
      </div>
      {action ? <div className="section-heading-action">{action}</div> : null}
    </div>
  );
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

export {
  EmptyState,
  ErrorState,
  Field,
  FormPanel,
  LoadingSkeleton,
  LoadingState,
  PageHeader,
  Pagination,
  SectionHeader,
  TableScroll,
  Toolbar
};
