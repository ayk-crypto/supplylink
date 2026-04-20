function FoundationMetrics({ overview }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Architecture</p>
          <h2>Core patterns in place</h2>
        </div>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <span>Registered modules</span>
          <strong>{overview.modules.length}</strong>
        </article>
        <article className="metric-card">
          <span>Platform roles</span>
          <strong>{overview.roles.platform.length}</strong>
        </article>
        <article className="metric-card">
          <span>Vendor roles</span>
          <strong>{overview.roles.vendor.length}</strong>
        </article>
        <article className="metric-card">
          <span>Tenancy scopes</span>
          <strong>{overview.tenancy.scopes.join(", ") || "Pending"}</strong>
        </article>
      </div>
    </section>
  );
}

export default FoundationMetrics;
