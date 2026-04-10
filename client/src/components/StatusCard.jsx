function StatusCard({ status, error }) {
  const dbLabel = status.database.enabled
    ? status.database.connected
      ? "Connected"
      : "Configured but unavailable"
    : "Not configured";

  return (
    <section className="status-card">
      <div className="status-header">
        <div>
          <p className="section-label">System status</p>
          <h2>{status.name}</h2>
        </div>
        <span className="version-pill">v{status.version}</span>
      </div>

      <p className="status-message">{error || status.message}</p>

      <div className="status-grid">
        <article>
          <span>Environment</span>
          <strong>{status.environment}</strong>
        </article>
        <article>
          <span>Database</span>
          <strong>{dbLabel}</strong>
        </article>
        <article>
          <span>Last check</span>
          <strong>{status.database.timestamp || "Pending"}</strong>
        </article>
      </div>
    </section>
  );
}

export default StatusCard;
