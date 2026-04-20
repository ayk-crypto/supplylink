function ModuleGrid({ modules }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Modules</p>
          <h2>Scalable backend surface</h2>
        </div>
      </div>

      <div className="module-grid">
        {modules.map((moduleItem) => (
          <article key={moduleItem.key} className="module-card">
            <span className="chip-label">{moduleItem.scope}</span>
            <h3>{moduleItem.key}</h3>
            <p>{moduleItem.description}</p>
            <div className="module-meta">
              <span>{moduleItem.path}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ModuleGrid;
