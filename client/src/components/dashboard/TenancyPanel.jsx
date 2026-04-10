function TenancyPanel({ tenancy }) {
  const headerEntries = Object.entries(tenancy.headers || {});

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Tenancy Model</p>
          <h2>Isolation by relationship, not duplication</h2>
        </div>
      </div>

      <ul className="tenant-notes">
        <li>{tenancy.principle}</li>
        <li>Tenant context is prepared through request headers for future auth middleware.</li>
        <li>
          Supported tenant headers:{" "}
          {headerEntries.map(([, value]) => value).join(", ") || "None registered"}
        </li>
      </ul>
    </section>
  );
}

export default TenancyPanel;
