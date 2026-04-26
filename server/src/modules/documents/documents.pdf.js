import PDFDocument from "pdfkit";

const PAGE_MARGIN = 46;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const BRAND_FALLBACK = "#0F7B63";
const INK = "#1F2621";
const MUTED = "#5F6A63";
const LINE = "#D7E1DA";
const PANEL = "#F5F8F6";

function toAmount(value) {
  return Number(value || 0);
}

function parseHexColor(value) {
  if (typeof value !== "string") {
    return BRAND_FALLBACK;
  }

  const normalized = value.trim().toUpperCase();

  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : BRAND_FALLBACK;
}

function padNumber(value, minimumDigits = 2) {
  return String(value).padStart(minimumDigits, "0");
}

function formatDate(value, formatting = {}) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  const year = parsed.getUTCFullYear();
  const month = padNumber(parsed.getUTCMonth() + 1);
  const day = padNumber(parsed.getUTCDate());

  switch (formatting.dateFormat) {
    case "DD/MM/YYYY":
      return `${day}/${month}/${year}`;
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "YYYY-MM-DD":
    default:
      return `${year}-${month}-${day}`;
  }
}

function formatMoney(value, formatting = {}) {
  const amount = toAmount(value);
  const decimals = Number.isInteger(formatting.decimals) ? formatting.decimals : 2;
  const thousandsSeparator = formatting.thousandsSeparator ?? ",";
  const currencyCode = formatting.currencyCode || "USD";
  const negative = amount < 0;
  const absolute = Math.abs(amount);
  const fixed = absolute.toFixed(decimals);
  const [integerPart, fractionPart] = fixed.split(".");
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
  const fraction = decimals > 0 ? `.${fractionPart}` : "";

  return `${negative ? "-" : ""}${currencyCode} ${groupedInteger}${fraction}`;
}

function collectLines(...values) {
  return values
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map((value) => String(value));
}

function ensureSpace(doc, requiredHeight) {
  if (doc.y + requiredHeight <= doc.page.height - PAGE_MARGIN) {
    return;
  }

  doc.addPage();
}

function drawTextBlock(doc, lines, options = {}) {
  const {
    x = doc.x,
    width = CONTENT_WIDTH,
    lineGap = 2,
    fontSize = 10,
    color = INK,
    font = "Helvetica",
    align = "left"
  } = options;

  lines.forEach((line, index) => {
    doc
      .font(font)
      .fontSize(fontSize)
      .fillColor(color)
      .text(line, x, doc.y, {
        width,
        align,
        lineGap
      });

    if (index < lines.length - 1) {
      doc.moveDown(0.1);
    }
  });
}

function buildSummaryRows(document) {
  const header = document.sections?.header || {};

  if (document.documentType === "invoice") {
    return [
      ["Invoice number", header.invoiceNumber || document.title || "Invoice"],
      ["Status", header.status || "draft"],
      ["Issue date", formatDate(header.issueDate, document.sections?.branding?.formatting)],
      ["Due date", formatDate(header.dueDate, document.sections?.branding?.formatting)]
    ];
  }

  return [
    ["Quote number", header.quoteNumber || document.title || "Quotation"],
    ["Status", header.status || "draft"],
    ["Issue date", formatDate(header.issueDate, document.sections?.branding?.formatting)],
    ["Expiry date", formatDate(header.expiryDate, document.sections?.branding?.formatting)]
  ];
}

function drawLogo(doc, branding, options = {}) {
  const { x, y, size = 64, logoPath } = options;
  const brandColor = parseHexColor(branding.company?.primaryBrandColor);
  const logoText = (branding.company?.displayName || "SL").slice(0, 2).toUpperCase();

  doc
    .save()
    .roundedRect(x, y, size, size, 14)
    .fillAndStroke("#FFFFFF", LINE)
    .restore();

  if (logoPath) {
    try {
      doc.image(logoPath, x + 6, y + 6, {
        fit: [size - 12, size - 12],
        align: "center",
        valign: "center"
      });
      return;
    } catch (error) {
      void error;
    }
  }

  doc
    .save()
    .roundedRect(x + 5, y + 5, size - 10, size - 10, 12)
    .fill(brandColor)
    .restore();
  doc
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(logoText, x, y + 21, {
      align: "center",
      width: size
    });
}

function drawHeader(doc, document, options = {}) {
  const branding = document.sections?.branding || {};
  const vendor = document.sections?.vendor || {};
  const summaryRows = buildSummaryRows(document);
  const brandColor = parseHexColor(branding.company?.primaryBrandColor);
  const startY = doc.y;

  drawLogo(doc, branding, {
    x: PAGE_MARGIN,
    y: startY,
    size: 64,
    logoPath: options.logoPath
  });

  const companyX = PAGE_MARGIN + 82;
  const companyLines = collectLines(
    branding.company?.displayName || vendor.displayName || vendor.legalName || "SupplyLink Workspace",
    branding.company?.legalName || vendor.legalName || "",
    branding.company?.addressLine1 || "",
    branding.company?.addressLine2 || "",
    branding.company?.email || vendor.contactEmail || "",
    branding.company?.phone || vendor.contactPhone || "",
    branding.company?.taxId ? `Tax ID: ${branding.company.taxId}` : ""
  );

  doc.font("Helvetica-Bold").fontSize(11).fillColor(brandColor).text(
    document.documentType === "invoice" ? "INVOICE" : "QUOTATION",
    companyX,
    startY + 2
  );
  doc.moveDown(0.2);

  const companyBlockY = doc.y;
  drawTextBlock(doc, companyLines, {
    x: companyX,
    width: 240,
    fontSize: 10,
    lineGap: 2,
    color: INK
  });

  const summaryX = PAGE_MARGIN + CONTENT_WIDTH - 170;
  const summaryY = startY;
  doc
    .save()
    .roundedRect(summaryX, summaryY, 170, 98, 16)
    .fillAndStroke(PANEL, LINE)
    .restore();

  let rowY = summaryY + 14;
  summaryRows.forEach(([label, value]) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(MUTED)
      .text(label.toUpperCase(), summaryX + 14, rowY, { width: 140 });
    rowY += 11;
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(INK)
      .text(String(value || "Not set"), summaryX + 14, rowY, { width: 140 });
    rowY += 17;
  });

  doc.y = Math.max(doc.y, companyBlockY + 80, summaryY + 100);
  doc
    .save()
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y)
    .lineWidth(2)
    .strokeColor(brandColor)
    .stroke()
    .restore();
  doc.moveDown(1);
}

function drawInformationCards(doc, document) {
  const customer = document.sections?.customer || {};
  const header = document.sections?.header || {};
  const totals = document.sections?.totals || {};
  const formatting = document.sections?.branding?.formatting || {};
  const leftX = PAGE_MARGIN;
  const topY = doc.y;
  const cardWidth = (CONTENT_WIDTH - 18) / 2;
  const cardHeight = 88;

  ensureSpace(doc, cardHeight + 18);

  doc
    .save()
    .roundedRect(leftX, topY, cardWidth, cardHeight, 16)
    .fillAndStroke(PANEL, LINE)
    .restore();
  doc
    .save()
    .roundedRect(leftX + cardWidth + 18, topY, cardWidth, cardHeight, 16)
    .fillAndStroke(PANEL, LINE)
    .restore();

  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text("PREPARED FOR", leftX + 14, topY + 14);
  const customerLines = collectLines(
    customer.companyName || customer.fullName || "Customer",
    customer.companyName && customer.fullName ? customer.fullName : "",
    customer.email || "",
    customer.phone || "",
    customer.accountCode ? `Account: ${customer.accountCode}` : ""
  );
  doc.y = topY + 28;
  drawTextBlock(doc, customerLines, {
    x: leftX + 14,
    width: cardWidth - 28,
    fontSize: 10,
    lineGap: 2
  });

  const rightX = leftX + cardWidth + 18;
  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text("DOCUMENT DETAILS", rightX + 14, topY + 14);
  const detailsLines = collectLines(
    `Created: ${formatDate(header.createdAt, formatting)}`,
    header.updatedAt ? `Updated: ${formatDate(header.updatedAt, formatting)}` : "",
    header.order?.orderNumber ? `Linked order: ${header.order.orderNumber}` : "",
    document.documentType === "invoice"
      ? `Balance due: ${formatMoney(totals.balanceDue, formatting)}`
      : ""
  );
  doc.y = topY + 28;
  drawTextBlock(doc, detailsLines, {
    x: rightX + 14,
    width: cardWidth - 28,
    fontSize: 10,
    lineGap: 2
  });

  doc.y = topY + cardHeight + 18;
}

function drawItemsTable(doc, document) {
  const items = document.sections?.items || [];
  const formatting = document.sections?.branding?.formatting || {};
  const columns = [
    { key: "item", label: "Item", width: 188, align: "left" },
    { key: "quantity", label: "Qty", width: 42, align: "right" },
    { key: "unitPrice", label: "Unit price", width: 74, align: "right" },
    { key: "discountTotal", label: "Discount", width: 68, align: "right" },
    { key: "taxTotal", label: "Tax", width: 58, align: "right" },
    { key: "lineTotal", label: "Total", width: 78, align: "right" }
  ];
  const tableX = PAGE_MARGIN;

  ensureSpace(doc, 64);

  doc.font("Helvetica-Bold").fontSize(12).fillColor(INK).text("Line items", PAGE_MARGIN, doc.y);
  doc.moveDown(0.6);

  const headerY = doc.y;
  doc
    .save()
    .roundedRect(tableX, headerY, CONTENT_WIDTH, 24, 10)
    .fillAndStroke("#F1F6F3", LINE)
    .restore();

  let cursorX = tableX + 10;
  columns.forEach((column) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(MUTED)
      .text(column.label.toUpperCase(), cursorX, headerY + 8, {
        width: column.width - 12,
        align: column.align
      });
    cursorX += column.width;
  });

  doc.y = headerY + 30;

  if (!items.length) {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(MUTED)
      .text("No line items available.", PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.moveDown(1);
    return;
  }

  items.forEach((item) => {
    const rowTop = doc.y;
    const itemTitle = item.productName || item.description || item.sku || "Line item";
    const itemSubtitle = collectLines([item.sku, item.description].filter(Boolean).join(" - "))[0] || "";
    const textHeight = doc.heightOfString(itemTitle, {
      width: columns[0].width - 18,
      align: "left"
    });
    const subtitleHeight = itemSubtitle
      ? doc.heightOfString(itemSubtitle, {
          width: columns[0].width - 18,
          align: "left"
        })
      : 0;
    const rowHeight = Math.max(36, textHeight + subtitleHeight + 16);

    ensureSpace(doc, rowHeight + 8);

    const actualTop = doc.y;
    doc
      .save()
      .roundedRect(tableX, actualTop, CONTENT_WIDTH, rowHeight, 10)
      .fillAndStroke("#FFFFFF", LINE)
      .restore();

    let x = tableX + 10;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text(itemTitle, x, actualTop + 8, {
      width: columns[0].width - 18
    });
    if (itemSubtitle) {
      doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(itemSubtitle, x, doc.y + 2, {
        width: columns[0].width - 18
      });
    }
    x += columns[0].width;

    const valueY = actualTop + 10;
    const valueColumns = [
      { value: String(item.quantity ?? ""), width: columns[1].width },
      { value: formatMoney(item.unitPrice, formatting), width: columns[2].width },
      { value: formatMoney(item.discountTotal, formatting), width: columns[3].width },
      { value: formatMoney(item.taxTotal, formatting), width: columns[4].width },
      { value: formatMoney(item.lineTotal, formatting), width: columns[5].width }
    ];

    valueColumns.forEach((column) => {
      doc.font("Helvetica").fontSize(9).fillColor(INK).text(column.value, x, valueY, {
        width: column.width - 12,
        align: "right"
      });
      x += column.width;
    });

    doc.y = actualTop + rowHeight + 8;
    void rowTop;
  });
}

function buildTotalsRows(document) {
  const totals = document.sections?.totals || {};

  return [
    ["Subtotal", totals.subtotal],
    toAmount(totals.discountTotal) > 0
      ? [
          totals.discountType === "percent"
            ? `Discount (${toAmount(totals.discountValue)}%)`
            : "Discount",
          -Math.abs(toAmount(totals.discountTotal))
        ]
      : null,
    totals.taxEnabled
      ? [`Tax (${toAmount(totals.taxRate)}%)`, totals.taxTotal]
      : null,
    ["Total", totals.grandTotal, "grand"],
    document.documentType === "invoice" ? ["Paid", toAmount(totals.grandTotal) - toAmount(totals.balanceDue)] : null,
    document.documentType === "invoice" ? ["Balance due", totals.balanceDue, "accent"] : null
  ].filter(Boolean);
}

function drawNotesAndTotals(doc, document) {
  const formatting = document.sections?.branding?.formatting || {};
  const footer = document.sections?.footer || {};
  const notesText = footer.notes || "No notes provided.";
  const termsText = footer.terms || "";
  const leftX = PAGE_MARGIN;
  const topY = doc.y;
  const leftWidth = CONTENT_WIDTH * 0.58;
  const rightWidth = CONTENT_WIDTH - leftWidth - 18;
  const rows = buildTotalsRows(document);
  const notesHeight = Math.max(
    118,
    54 +
      doc.heightOfString(notesText, { width: leftWidth - 28 }) +
      (termsText ? 26 + doc.heightOfString(termsText, { width: leftWidth - 28 }) : 0)
  );
  const totalsHeight = Math.max(118, 18 + rows.length * 24);
  const blockHeight = Math.max(notesHeight, totalsHeight);

  ensureSpace(doc, blockHeight + 12);

  doc
    .save()
    .roundedRect(leftX, topY, leftWidth, blockHeight, 16)
    .fillAndStroke(PANEL, LINE)
    .restore();
  doc
    .save()
    .roundedRect(leftX + leftWidth + 18, topY, rightWidth, blockHeight, 16)
    .fillAndStroke(PANEL, LINE)
    .restore();

  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text("NOTES", leftX + 14, topY + 14);
  doc.font("Helvetica").fontSize(10).fillColor(INK).text(notesText, leftX + 14, topY + 28, {
    width: leftWidth - 28,
    lineGap: 2
  });

  if (termsText) {
    const termsY = topY + 42 + doc.heightOfString(notesText, {
      width: leftWidth - 28,
      lineGap: 2
    });
    doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text("TERMS", leftX + 14, termsY);
    doc.font("Helvetica").fontSize(10).fillColor(INK).text(termsText, leftX + 14, termsY + 14, {
      width: leftWidth - 28,
      lineGap: 2
    });
  }

  const totalsX = leftX + leftWidth + 18 + 14;
  let rowY = topY + 16;
  rows.forEach(([label, value, tone]) => {
    const isEmphasis = tone === "grand" || tone === "accent";
    const color = tone === "accent" ? parseHexColor(document.sections?.branding?.company?.primaryBrandColor) : INK;

    doc
      .save()
      .moveTo(leftX + leftWidth + 18 + 14, rowY + 18)
      .lineTo(leftX + leftWidth + 18 + rightWidth - 14, rowY + 18)
      .strokeColor(LINE)
      .strokeOpacity(1)
      .lineWidth(1)
      .stroke()
      .restore();
    doc.font(isEmphasis ? "Helvetica-Bold" : "Helvetica").fontSize(isEmphasis ? 10 : 9).fillColor(color).text(label, totalsX, rowY, {
      width: 96
    });
    doc
      .font(isEmphasis ? "Helvetica-Bold" : "Helvetica")
      .fontSize(isEmphasis ? 10 : 9)
      .fillColor(color)
      .text(formatMoney(value, formatting), totalsX + 96, rowY, {
        align: "right",
        width: rightWidth - 42 - 96
      });
    rowY += 24;
  });

  doc.y = topY + blockHeight + 16;
}

function drawBrandFooter(doc, document) {
  const footer = document.sections?.footer || {};
  const text = (footer.invoiceFooter || "").trim();

  if (!text) {
    return;
  }

  const brandColor = parseHexColor(
    document.sections?.branding?.company?.primaryBrandColor
  );
  const width = CONTENT_WIDTH;
  const x = PAGE_MARGIN;
  const padX = 14;
  const padY = 12;
  const innerWidth = width - padX * 2;
  const textHeight = doc.heightOfString(text, {
    width: innerWidth,
    lineGap: 2,
    align: "center"
  });
  const blockHeight = textHeight + padY * 2 + 4;

  ensureSpace(doc, blockHeight + 8);
  const topY = doc.y;

  doc
    .save()
    .roundedRect(x, topY, width, blockHeight, 14)
    .fillAndStroke(PANEL, LINE)
    .restore();

  doc
    .save()
    .moveTo(x, topY)
    .lineTo(x + width, topY)
    .strokeColor(brandColor)
    .lineWidth(2)
    .stroke()
    .restore();

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(INK)
    .text(text, x + padX, topY + padY + 2, {
      width: innerWidth,
      align: "center",
      lineGap: 2
    });

  doc.y = topY + blockHeight + 12;
}

function renderStructuredDocumentPdf(document, options = {}) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({
      size: "A4",
      margin: PAGE_MARGIN,
      info: {
        Title: document.title,
        Author: document.sections?.vendor?.displayName || "SupplyLink",
        Subject: document.documentType,
        Creator: "SupplyLink"
      }
    });
    const chunks = [];

    pdf.on("data", (chunk) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    drawHeader(pdf, document, options);
    drawInformationCards(pdf, document);
    drawItemsTable(pdf, document);
    drawNotesAndTotals(pdf, document);
    drawBrandFooter(pdf, document);

    pdf
      .font("Helvetica")
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        `Generated by SupplyLink on ${formatDate(new Date().toISOString(), document.sections?.branding?.formatting)}`,
        PAGE_MARGIN,
        pdf.page.height - PAGE_MARGIN + 8,
        {
          width: CONTENT_WIDTH,
          align: "right"
        }
      );

    pdf.end();
  });
}

export { renderStructuredDocumentPdf };
