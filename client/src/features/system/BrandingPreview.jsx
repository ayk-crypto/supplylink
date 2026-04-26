import { useMemo } from "react";
import { formatMoneyWith, isValidHexColor } from "./settingsFormat.js";

const FALLBACK_BRAND = "#0f7b63";

const SAMPLE_ITEMS = [
  { name: "Premium widget", qty: 4, unit: 250, total: 1000 },
  { name: "Service hours (consulting)", qty: 6, unit: 120, total: 720 },
  { name: "Express delivery", qty: 1, unit: 80, total: 80 }
];

function getInitials(name) {
  const source = (name || "").trim();
  if (!source) return "S";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "S";
}

function BrandingPreview({ draft, logoObjectUrl, logoUrl }) {
  const company = draft?.company || {};
  const brandColor = isValidHexColor(company.primaryBrandColor)
    ? company.primaryBrandColor.trim()
    : FALLBACK_BRAND;
  const displayName = company.displayName || "Your Company";
  const subtitle = company.legalName || "";
  const initials = useMemo(
    () => getInitials(company.displayName || company.legalName),
    [company.displayName, company.legalName]
  );
  const logoSrc = logoUrl ? logoObjectUrl : "";

  const subtotal = SAMPLE_ITEMS.reduce((sum, row) => sum + row.total, 0);
  const taxAmount = subtotal * 0.05;
  const grandTotal = subtotal + taxAmount;
  const fmt = (value) => formatMoneyWith(draft, value);

  return (
    <aside
      aria-label="Live invoice preview"
      className="branding-preview"
      style={{ "--brand-preview": brandColor }}
    >
      <header className="branding-preview-toolbar">
        <span className="branding-preview-eyebrow">Live preview</span>
        <span className="branding-preview-hint">
          Updates as you edit branding fields
        </span>
      </header>

      <div className="branding-preview-paper">
        <div className="branding-preview-bar" />
        <section className="branding-preview-header">
          <div className="branding-preview-identity">
            <div
              className="branding-preview-logo"
              style={{ borderColor: brandColor }}
            >
              {logoSrc ? (
                <img alt="" src={logoSrc} />
              ) : (
                <span
                  className="branding-preview-logo-fallback"
                  style={{ background: brandColor }}
                >
                  {initials}
                </span>
              )}
            </div>
            <div className="branding-preview-identity-text">
              <strong>{displayName}</strong>
              {subtitle ? <span>{subtitle}</span> : null}
              {company.addressLine1 ? <span>{company.addressLine1}</span> : null}
              {company.addressLine2 ? <span>{company.addressLine2}</span> : null}
              {company.email ? <span>{company.email}</span> : null}
              {company.phone ? <span>{company.phone}</span> : null}
              {company.taxId ? <span>Tax ID: {company.taxId}</span> : null}
            </div>
          </div>
          <div
            className="branding-preview-doctype"
            style={{ color: brandColor }}
          >
            <span>Invoice</span>
            <strong>INV-1042</strong>
          </div>
        </section>

        <section className="branding-preview-meta">
          <div>
            <span>Issue date</span>
            <strong>2026-04-26</strong>
          </div>
          <div>
            <span>Due date</span>
            <strong>2026-05-26</strong>
          </div>
          <div>
            <span>Customer</span>
            <strong>Acme Buyers Co.</strong>
          </div>
        </section>

        <section className="branding-preview-table">
          <div className="branding-preview-thead">
            <span>Item</span>
            <span>Qty</span>
            <span>Unit</span>
            <span>Total</span>
          </div>
          {SAMPLE_ITEMS.map((row) => (
            <div className="branding-preview-row" key={row.name}>
              <span>{row.name}</span>
              <span>{row.qty}</span>
              <span>{fmt(row.unit)}</span>
              <span>{fmt(row.total)}</span>
            </div>
          ))}
        </section>

        <section className="branding-preview-totals">
          <div>
            <span>Subtotal</span>
            <strong>{fmt(subtotal)}</strong>
          </div>
          <div>
            <span>Tax (5%)</span>
            <strong>{fmt(taxAmount)}</strong>
          </div>
          <div
            className="branding-preview-grand"
            style={{ color: brandColor }}
          >
            <span>Balance due</span>
            <strong>{fmt(grandTotal)}</strong>
          </div>
        </section>

        {company.invoiceFooter ? (
          <section
            className="branding-preview-footer"
            style={{ borderTopColor: brandColor }}
          >
            {company.invoiceFooter}
          </section>
        ) : (
          <section className="branding-preview-footer-placeholder">
            Add a footer note to show a tagline or payment instructions here.
          </section>
        )}
      </div>
    </aside>
  );
}

export default BrandingPreview;
