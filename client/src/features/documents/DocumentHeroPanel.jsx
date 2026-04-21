import StatusPill from "../../components/ui/StatusPill.jsx";

function DocumentHeroPanel({
  eyebrow,
  number,
  description,
  statusKind,
  status,
  highlight,
  meta = []
}) {
  return (
    <section className="doc-hero">
      <div className="doc-hero-bar" aria-hidden="true" />
      <div className="doc-hero-body">
        <div className="doc-hero-headline">
          <div>
            <p className="doc-hero-eyebrow">{eyebrow}</p>
            <h1 className="doc-hero-number">{number || "—"}</h1>
            {description ? <p className="doc-hero-description">{description}</p> : null}
          </div>
          {status ? (
            <div className="doc-hero-status">
              <StatusPill kind={statusKind} status={status} />
            </div>
          ) : null}
        </div>
        {highlight ? (
          <div className={`doc-hero-highlight tone-${highlight.tone || "neutral"}`}>
            <span>{highlight.label}</span>
            <strong>{highlight.value}</strong>
            {highlight.note ? <small>{highlight.note}</small> : null}
          </div>
        ) : null}
        {meta.length ? (
          <dl className="doc-hero-meta">
            {meta
              .filter((entry) => entry && entry.label)
              .map((entry) => (
                <div className="doc-hero-meta-item" key={entry.label}>
                  <dt>{entry.label}</dt>
                  <dd>{entry.value || "—"}</dd>
                </div>
              ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}

export default DocumentHeroPanel;
