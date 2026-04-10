function OverviewStatusCard({ overview, error, isLoading }) {
  const databaseLabel = !overview.database.enabled
    ? "Not configured"
    : overview.database.connected
      ? "Connected"
      : "Configured, not reachable";

  return (
    <section className="status-card">
      <div className="status-header">
        <div>
          <p className="section-label">Backend status</p>
          <div className="status-topline">
            <span className="status-dot" />
            <h2>{overview.app.name}</h2>
          </div>
        </div>
        <span className="version-pill">{overview.app.version}</span>
      </div>

      <p className="status-message">
        {error ||
          (isLoading
            ? "Loading the API overview..."
            : "Foundation endpoints are available and ready for expansion.")}
      </p>

      <div className="status-grid">
        <article>
          <span>Environment</span>
          <strong>{overview.app.environment}</strong>
        </article>
        <article>
          <span>API base</span>
          <strong>{overview.api.basePath}</strong>
        </article>
        <article>
          <span>Database</span>
          <strong>{databaseLabel}</strong>
        </article>
        <article>
          <span>Last DB check</span>
          <strong>{overview.database.timestamp || "Pending"}</strong>
        </article>
      </div>
    </section>
  );
}

export default OverviewStatusCard;
