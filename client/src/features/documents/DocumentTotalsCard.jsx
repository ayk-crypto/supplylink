function DocumentTotalsCard({ rows = [], grand, footer = [] }) {
  return (
    <aside className="doc-totals">
      <header className="doc-totals-header">Summary</header>
      <dl className="doc-totals-list">
        {rows
          .filter((row) => row && row.label)
          .map((row) => (
            <div className={`doc-totals-row tone-${row.tone || "neutral"}`} key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
      </dl>
      {grand ? (
        <div className="doc-totals-grand">
          <span>{grand.label || "Total"}</span>
          <strong>{grand.value}</strong>
        </div>
      ) : null}
      {footer.length ? (
        <dl className="doc-totals-footer">
          {footer
            .filter((row) => row && row.label)
            .map((row) => (
              <div className={`doc-totals-row tone-${row.tone || "neutral"}`} key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
        </dl>
      ) : null}
    </aside>
  );
}

export default DocumentTotalsCard;
