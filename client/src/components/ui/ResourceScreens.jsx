function PageHeader({ eyebrow, title, description, action, meta = null }) {
  return (
    <section className="page-header">
      <div className="page-header-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        {meta ? <div className="page-header-meta">{meta}</div> : null}
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

function EmptyState({ children, action = null, title = "Nothing to show yet" }) {
  return (
    <div className="empty-panel" role="status">
      <span className="empty-panel-icon" aria-hidden="true">
        <svg fill="none" height="22" viewBox="0 0 24 24" width="22" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 7.5L12 4l8 3.5v9L12 20l-8-3.5v-9z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
          <path d="M4 7.5L12 11l8-3.5" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
          <path d="M12 11v9" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
        </svg>
      </span>
      <div className="empty-panel-copy">
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
      {action ? <div className="empty-panel-action">{action}</div> : null}
    </div>
  );
}

function LoadingState({ children = "Loading..." }) {
  return (
    <p aria-live="polite" className="surface-message loading">
      <span className="surface-message-spinner" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

function ErrorState({ message, onRetry, retryLabel = "Try again" }) {
  if (!message) return null;
  return (
    <div className="error-state surface-message error" role="alert">
      <span className="surface-message-mark" aria-hidden="true">
        !
      </span>
      <div className="surface-message-copy">
        <strong>Something needs attention</strong>
        <span>{message}</span>
      </div>
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

function SectionHeader({ title, action, hint, meta = null }) {
  return (
    <div className="panel-heading section-heading">
      <div>
        <h3>{title}</h3>
        {hint ? <span>{hint}</span> : null}
        {meta ? <div className="section-heading-meta">{meta}</div> : null}
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
          <div>
            <h3>{title}</h3>
            <p>Review the details below and save when you are ready.</p>
          </div>
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

  const totalPages = pagination.totalPages || 1;
  const totalItems = pagination.totalItems ?? 0;
  const canGoBack = pagination.page > 1;
  const canGoForward = totalPages > pagination.page;

  return (
    <div className="pagination-bar">
      <span className="pagination-summary">
        <strong>
          Page {pagination.page} <span className="pagination-summary-divider">of</span> {totalPages}
        </strong>
        <span className="pagination-summary-meta">
          {totalItems.toLocaleString()} {totalItems === 1 ? "record" : "records"}
        </span>
      </span>
      <div className="pagination-actions">
        <button
          aria-label="Previous page"
          className="secondary-button compact"
          disabled={!canGoBack}
          onClick={() => onPageChange(pagination.page - 1)}
          type="button"
        >
          ← Previous
        </button>
        <button
          aria-label="Next page"
          className="secondary-button compact"
          disabled={!canGoForward}
          onClick={() => onPageChange(pagination.page + 1)}
          type="button"
        >
          Next →
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
