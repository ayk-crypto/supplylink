function FoundationHero() {
  return (
    <section className="hero">
      <div className="eyebrow">SupplyLink Foundation</div>
      <h1>Multi-tenant SaaS groundwork for vendors, customers, invoices, ledger, and routes.</h1>
      <p className="hero-copy">
        This first step keeps the app lean while establishing the pieces we need
        for scale: versioned APIs, vendor-aware tenancy, modular domains,
        database migrations, and shared conventions for future web and mobile
        clients.
      </p>
      <div className="hero-badges">
        <span className="hero-badge">Express API</span>
        <span className="hero-badge">React Client</span>
        <span className="hero-badge">PostgreSQL Schema Base</span>
        <span className="hero-badge">Tenant-Aware Design</span>
      </div>
    </section>
  );
}

export default FoundationHero;
