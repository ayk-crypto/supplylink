import { formatDateWith, formatMoneyWith } from "../system/settingsFormat.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getDocumentBranding(document, settings) {
  const branding = document?.sections?.branding || {};
  const company = branding.company || {};

  return {
    brandColor: company.primaryBrandColor || settings?.company?.primaryBrandColor || "#0f7b63",
    logoUrl: company.logoUrl || settings?.company?.logoUrl || settings?.company?.logo?.url || "",
    company
  };
}

function formatDocumentMoney(settings, value) {
  return formatMoneyWith(settings, Number(value || 0));
}

function formatDocumentDate(settings, value, fallback = "Not set") {
  return value ? formatDateWith(settings, value) : fallback;
}

function buildDocumentFilename(docPayload) {
  const type = docPayload?.documentType || "document";
  const header = docPayload?.sections?.header || {};
  const number = header.invoiceNumber || header.quoteNumber || docPayload?.title || type;
  return `${String(number).replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-")}-${type}.html`.toLowerCase();
}

function buildDocumentHtml(docPayload, settings) {
  const sections = docPayload?.sections || {};
  const vendor = sections.vendor || {};
  const customer = sections.customer || {};
  const header = sections.header || {};
  const items = sections.items || [];
  const totals = sections.totals || {};
  const footer = sections.footer || {};
  const { brandColor, logoUrl, company } = getDocumentBranding(docPayload, settings);
  const docTypeLabel = docPayload?.documentType === "invoice" ? "Invoice" : "Quotation";
  const secondaryDateLabel =
    docPayload?.documentType === "invoice" ? "Due date" : "Expiry date";
  const secondaryDateValue =
    docPayload?.documentType === "invoice" ? header.dueDate : header.expiryDate;
  const numberLabel = docPayload?.documentType === "invoice" ? "Invoice number" : "Quote number";
  const numberValue = header.invoiceNumber || header.quoteNumber || docPayload?.title || "Document";
  const paidAmount =
    docPayload?.documentType === "invoice"
      ? Math.max(Number(totals.grandTotal || 0) - Number(totals.balanceDue || 0), 0)
      : 0;

  const totalsRows = [
    { label: "Subtotal", value: totals.subtotal },
    Number(totals.discountTotal || 0) > 0
      ? { label: "Discount", value: -Math.abs(Number(totals.discountTotal || 0)) }
      : null,
    Number(totals.taxTotal || 0) > 0 ? { label: "Tax", value: totals.taxTotal } : null,
    { label: "Total", value: totals.grandTotal, emphasis: true },
    docPayload?.documentType === "invoice" ? { label: "Paid", value: paidAmount } : null,
    docPayload?.documentType === "invoice"
      ? { label: "Balance due", value: totals.balanceDue, emphasis: true, accent: true }
      : null
  ].filter(Boolean);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(docPayload?.title || docTypeLabel)}</title>
    <style>
      :root {
        --brand: ${escapeHtml(brandColor)};
        --ink: #1f2621;
        --muted: #5f6a63;
        --line: #d7e1da;
        --panel: #f5f8f6;
        --paper: #ffffff;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background:
          radial-gradient(circle at top left, rgba(15,123,99,0.08), transparent 36%),
          linear-gradient(180deg, #eef4f0 0%, #f8fbf9 100%);
        color: var(--ink);
        font-family: "Segoe UI", "Aptos", "Helvetica Neue", Arial, sans-serif;
        padding: 28px;
      }
      .page {
        width: min(960px, 100%);
        margin: 0 auto;
        background: var(--paper);
        border: 1px solid rgba(31, 38, 33, 0.08);
        box-shadow: 0 22px 50px rgba(31, 38, 33, 0.08);
      }
      .toolbar {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 18px 20px 0;
      }
      .toolbar button {
        border: 1px solid var(--line);
        background: var(--paper);
        color: var(--ink);
        border-radius: 999px;
        padding: 9px 14px;
        font-weight: 700;
      }
      .shell {
        padding: 28px 32px 32px;
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
        gap: 24px;
        padding-bottom: 24px;
        border-bottom: 3px solid var(--brand);
      }
      .identity {
        display: flex;
        gap: 16px;
        align-items: flex-start;
      }
      .logo {
        width: 84px;
        height: 84px;
        border-radius: 18px;
        border: 1px solid rgba(31, 38, 33, 0.08);
        background: linear-gradient(135deg, rgba(15,123,99,0.12), rgba(15,123,99,0.02));
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;
      }
      .logo img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .logo-fallback {
        font-size: 1.4rem;
        font-weight: 800;
        color: var(--brand);
      }
      .doc-kicker {
        margin: 0 0 8px;
        color: var(--brand);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 0.73rem;
        font-weight: 800;
      }
      h1 {
        margin: 0 0 10px;
        font-size: 2.2rem;
        line-height: 1.02;
      }
      .summary-card {
        background: linear-gradient(180deg, rgba(15,123,99,0.08), rgba(15,123,99,0.02));
        border: 1px solid rgba(15,123,99,0.12);
        border-radius: 22px;
        padding: 20px;
        display: grid;
        gap: 12px;
        align-content: start;
      }
      .summary-card strong {
        font-size: 1rem;
      }
      .meta-grid,
      .party-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px 24px;
        margin-top: 24px;
      }
      .meta-card,
      .party-card,
      .totals-card,
      .notes-card {
        border: 1px solid var(--line);
        border-radius: 18px;
        background: var(--panel);
        padding: 18px;
      }
      .label {
        display: block;
        margin-bottom: 6px;
        color: var(--muted);
        font-size: 0.74rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 800;
      }
      .value {
        font-size: 0.98rem;
        font-weight: 700;
      }
      .subtle {
        color: var(--muted);
      }
      .table-wrap {
        margin-top: 24px;
        border: 1px solid var(--line);
        border-radius: 22px;
        overflow: hidden;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      thead {
        background: #f1f6f3;
      }
      th, td {
        padding: 14px 16px;
        text-align: left;
        vertical-align: top;
        border-bottom: 1px solid var(--line);
      }
      th {
        color: var(--muted);
        font-size: 0.74rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      tbody tr:last-child td {
        border-bottom: none;
      }
      .item-title {
        font-weight: 700;
      }
      .item-subtitle {
        display: block;
        margin-top: 4px;
        color: var(--muted);
        font-size: 0.86rem;
      }
      .bottom-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(300px, 0.8fr);
        gap: 22px;
        margin-top: 24px;
      }
      .totals-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 10px 0;
        border-bottom: 1px solid rgba(95,106,99,0.12);
      }
      .totals-row:last-child {
        border-bottom: none;
      }
      .totals-row.emphasis strong {
        font-size: 1.08rem;
      }
      .totals-row.accent strong,
      .totals-row.accent span {
        color: var(--brand);
      }
      .footer-note {
        white-space: pre-wrap;
        line-height: 1.55;
      }
      @media print {
        body { padding: 0; background: white; }
        .page { width: 100%; border: 0; box-shadow: none; }
        .toolbar { display: none; }
        .shell { padding: 20mm 16mm; }
      }
      @media (max-width: 720px) {
        body { padding: 12px; }
        .hero, .meta-grid, .party-grid, .bottom-grid {
          grid-template-columns: 1fr;
        }
        .shell { padding: 20px; }
        .toolbar { justify-content: stretch; flex-wrap: wrap; }
        .toolbar button { flex: 1 1 0; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="toolbar">
        <button onclick="window.print()">Print</button>
      </div>
      <div class="shell">
        <section class="hero">
          <div>
            <p class="doc-kicker">${escapeHtml(docTypeLabel)}</p>
            <h1>${escapeHtml(numberValue)}</h1>
            <div class="identity">
              <div class="logo">
                ${
                  logoUrl
                    ? `<img alt="" src="${escapeHtml(logoUrl)}" />`
                    : `<span class="logo-fallback">${escapeHtml(
                        (company.displayName || vendor.displayName || "S").slice(0, 2).toUpperCase()
                      )}</span>`
                }
              </div>
              <div>
                <div class="value">${escapeHtml(company.displayName || vendor.displayName || vendor.legalName || "SupplyLink Workspace")}</div>
                <div class="subtle">${escapeHtml(company.legalName || vendor.legalName || "")}</div>
                <div class="subtle">${escapeHtml(company.addressLine1 || "")}</div>
                <div class="subtle">${escapeHtml(company.addressLine2 || "")}</div>
                <div class="subtle">${escapeHtml(company.email || vendor.contactEmail || "")}</div>
                <div class="subtle">${escapeHtml(company.phone || vendor.contactPhone || "")}</div>
                ${
                  company.taxId
                    ? `<div class="subtle">Tax ID: ${escapeHtml(company.taxId)}</div>`
                    : ""
                }
              </div>
            </div>
          </div>
          <aside class="summary-card">
            <div>
              <span class="label">${escapeHtml(numberLabel)}</span>
              <strong>${escapeHtml(numberValue)}</strong>
            </div>
            <div>
              <span class="label">Status</span>
              <strong>${escapeHtml(header.status || "draft")}</strong>
            </div>
            <div>
              <span class="label">Issue date</span>
              <strong>${escapeHtml(formatDocumentDate(settings, header.issueDate))}</strong>
            </div>
            <div>
              <span class="label">${escapeHtml(secondaryDateLabel)}</span>
              <strong>${escapeHtml(formatDocumentDate(settings, secondaryDateValue))}</strong>
            </div>
          </aside>
        </section>

        <section class="party-grid">
          <article class="party-card">
            <span class="label">Prepared for</span>
            <div class="value">${escapeHtml(customer.companyName || customer.fullName || "Customer")}</div>
            ${customer.companyName && customer.fullName ? `<div class="subtle">${escapeHtml(customer.fullName)}</div>` : ""}
            <div class="subtle">${escapeHtml(customer.email || "")}</div>
            <div class="subtle">${escapeHtml(customer.phone || "")}</div>
            ${customer.accountCode ? `<div class="subtle">Account: ${escapeHtml(customer.accountCode)}</div>` : ""}
          </article>
          <article class="meta-card">
            <span class="label">Document details</span>
            <div class="subtle">Created: ${escapeHtml(formatDocumentDate(settings, header.createdAt, "Not available"))}</div>
            ${
              header.updatedAt
                ? `<div class="subtle">Updated: ${escapeHtml(formatDocumentDate(settings, header.updatedAt, "Not available"))}</div>`
                : ""
            }
            ${
              header.order?.orderNumber
                ? `<div class="subtle">Linked order: ${escapeHtml(header.order.orderNumber)}</div>`
                : ""
            }
            ${
              docPayload?.documentType === "invoice"
                ? `<div class="subtle">Balance due: ${escapeHtml(formatDocumentMoney(settings, totals.balanceDue))}</div>`
                : ""
            }
          </article>
        </section>

        <section class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Discount</th>
                <th>Tax</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${
                items.length
                  ? items
                      .map(
                        (item) => `<tr>
                  <td>
                    <span class="item-title">${escapeHtml(item.productName || item.description || item.sku || "Line item")}</span>
                    <span class="item-subtitle">${escapeHtml(
                      [item.sku, item.description].filter(Boolean).join(" • ")
                    )}</span>
                  </td>
                  <td>${escapeHtml(item.quantity)}</td>
                  <td>${escapeHtml(formatDocumentMoney(settings, item.unitPrice))}</td>
                  <td>${escapeHtml(formatDocumentMoney(settings, item.discountTotal))}</td>
                  <td>${escapeHtml(formatDocumentMoney(settings, item.taxTotal))}</td>
                  <td>${escapeHtml(formatDocumentMoney(settings, item.lineTotal))}</td>
                </tr>`
                      )
                      .join("")
                  : `<tr><td colspan="6">No line items available.</td></tr>`
              }
            </tbody>
          </table>
        </section>

        <section class="bottom-grid">
          <article class="notes-card">
            <span class="label">Notes</span>
            <div class="footer-note">${escapeHtml(footer.notes || "No notes provided.")}</div>
            ${
              footer.terms
                ? `<span class="label" style="margin-top:18px;">Terms</span><div class="footer-note">${escapeHtml(
                    footer.terms
                  )}</div>`
                : ""
            }
          </article>
          <aside class="totals-card">
            ${totalsRows
              .map(
                (row) => `<div class="totals-row ${row.emphasis ? "emphasis" : ""} ${row.accent ? "accent" : ""}">
                <span>${escapeHtml(row.label)}</span>
                <strong>${escapeHtml(formatDocumentMoney(settings, row.value))}</strong>
              </div>`
              )
              .join("")}
          </aside>
        </section>
      </div>
    </div>
  </body>
</html>`;
}

function openDocumentPrintWindow(docPayload, settings) {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    throw new Error("Allow popups for this site to open the printable document view.");
  }

  printWindow.document.open();
  printWindow.document.write(buildDocumentHtml(docPayload, settings));
  printWindow.document.close();
  return printWindow;
}

function downloadDocumentHtml(docPayload, settings) {
  const html = buildDocumentHtml(docPayload, settings);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = buildDocumentFilename(docPayload);
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export {
  buildDocumentFilename,
  buildDocumentHtml,
  downloadDocumentHtml,
  getDocumentBranding,
  openDocumentPrintWindow
};
