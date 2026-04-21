import nodemailer from "nodemailer";
import env from "../../config/env.js";
import AppError from "../../core/errors/AppError.js";
import { recordAuditEvent } from "../audit/audit.service.js";
import { notifyVendorUsers, runNotificationTask } from "../notifications/notifications.service.js";
import { getInvoiceDetail } from "../invoices/invoices.service.js";
import { getQuotationDetail } from "../quotations/quotations.service.js";
import { ensureDocumentShare } from "./documents.share.service.js";
import { buildInvoicePdfDocument, buildQuotationPdfDocument } from "./documents.service.js";

const DEFAULT_BRAND_COLOR = "#1f5447";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeText(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function toBooleanValue(value) {
  return Boolean(value);
}

function getEmailConfiguration() {
  return {
    host: env.EMAIL_SMTP_HOST,
    port: env.EMAIL_SMTP_PORT,
    secure: env.EMAIL_SMTP_SECURE,
    user: env.EMAIL_SMTP_USER,
    pass: env.EMAIL_SMTP_PASS,
    fromAddress: env.EMAIL_FROM_ADDRESS,
    fromName: env.EMAIL_FROM_NAME,
    replyTo: env.EMAIL_REPLY_TO
  };
}

function assertEmailConfiguration(config = getEmailConfiguration()) {
  const missing = [];

  if (!config.host) {
    missing.push("EMAIL_SMTP_HOST");
  }

  if (!config.fromAddress) {
    missing.push("EMAIL_FROM_ADDRESS");
  }

  if (toBooleanValue(config.user) !== toBooleanValue(config.pass)) {
    missing.push("EMAIL_SMTP_USER/EMAIL_SMTP_PASS");
  }

  if (missing.length > 0) {
    throw new AppError("Email sending is not configured for this environment", {
      statusCode: 503,
      code: "EMAIL_NOT_CONFIGURED",
      details: missing.map((name) => ({
        path: name,
        message: `${name} must be configured to send document emails`
      }))
    });
  }
}

function createEmailTransport(config = getEmailConfiguration()) {
  assertEmailConfiguration(config);

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth:
      config.user && config.pass
        ? {
            user: config.user,
            pass: config.pass
          }
        : undefined
  });
}

function getDocumentTypeLabel(documentType) {
  return documentType === "quotation" ? "Quotation" : "Invoice";
}

function getDocumentNumber(document) {
  return (
    document?.sections?.header?.invoiceNumber ||
    document?.sections?.header?.quoteNumber ||
    document?.title ||
    "Document"
  );
}

function getVendorName(document) {
  return (
    document?.sections?.branding?.company?.displayName ||
    document?.sections?.branding?.company?.legalName ||
    document?.sections?.vendor?.displayName ||
    document?.sections?.vendor?.legalName ||
    "SupplyLink"
  );
}

function getCustomerName(document) {
  return (
    document?.sections?.customer?.companyName ||
    document?.sections?.customer?.fullName ||
    "Customer"
  );
}

function getCustomerEmail(document) {
  return document?.sections?.customer?.email || "";
}

function getBrandColor(document) {
  const color = document?.sections?.branding?.company?.primaryBrandColor;
  return /^#[0-9a-fA-F]{6}$/.test(String(color || "").trim())
    ? String(color).trim()
    : DEFAULT_BRAND_COLOR;
}

function formatDocumentMoney(document, value) {
  const formatting = document?.sections?.branding?.formatting || {};
  const currencyCode = formatting.currencyCode || "USD";
  const decimals = Number.isFinite(Number(formatting.decimals)) ? Number(formatting.decimals) : 2;
  const safeValue = Number(value || 0);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(safeValue);
  } catch {
    return `${currencyCode} ${safeValue.toFixed(decimals)}`;
  }
}

function formatDocumentDate(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toISOString().slice(0, 10);
}

function getDefaultSubject({ document, documentType }) {
  const label = getDocumentTypeLabel(documentType);
  return `${label} ${getDocumentNumber(document)} from ${getVendorName(document)}`;
}

function getDefaultMessageBody({ document, documentType, share }) {
  const label = getDocumentTypeLabel(documentType);
  const customerName = getCustomerName(document);
  const vendorName = getVendorName(document);
  const totals = document?.sections?.totals || {};
  const header = document?.sections?.header || {};
  const totalLabel =
    documentType === "invoice" && Number(totals.balanceDue || 0) > 0 ? "balance due" : "total";
  const totalValue =
    documentType === "invoice" && Number(totals.balanceDue || 0) > 0
      ? formatDocumentMoney(document, totals.balanceDue)
      : formatDocumentMoney(document, totals.grandTotal);
  const dateLine =
    documentType === "quotation"
      ? header.expiryDate
        ? `Expiry date: ${formatDocumentDate(header.expiryDate)}`
        : ""
      : header.dueDate
        ? `Due date: ${formatDocumentDate(header.dueDate)}`
        : "";

  return [
    `Hello ${customerName},`,
    "",
    `Please find your ${label.toLowerCase()} ${getDocumentNumber(document)} from ${vendorName} attached as a PDF.`,
    `${totalLabel.charAt(0).toUpperCase() + totalLabel.slice(1)}: ${totalValue}`,
    dateLine,
    share?.publicUrl ? `Secure online view: ${share.publicUrl}` : "",
    "",
    "If you have any questions, please reply to this email.",
    "",
    `Regards,`,
    vendorName
  ]
    .filter(Boolean)
    .join("\n");
}

function buildEmailHtml({ document, documentType, messageBody, share }) {
  const label = getDocumentTypeLabel(documentType);
  const brandColor = getBrandColor(document);
  const vendorName = getVendorName(document);
  const customerName = getCustomerName(document);
  const totals = document?.sections?.totals || {};
  const totalValue =
    documentType === "invoice" && Number(totals.balanceDue || 0) > 0
      ? formatDocumentMoney(document, totals.balanceDue)
      : formatDocumentMoney(document, totals.grandTotal);
  const totalLabel =
    documentType === "invoice" && Number(totals.balanceDue || 0) > 0 ? "Balance due" : "Total";
  const messageHtml = escapeHtml(messageBody).replaceAll("\n", "<br />");

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f3f6f4;font-family:Arial,sans-serif;color:#17382f;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:680px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid rgba(18,44,32,0.08);">
            <tr>
              <td style="padding:28px 32px;background:${brandColor};color:#ffffff;">
                <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.88;">${escapeHtml(
                  vendorName
                )}</div>
                <h1 style="margin:12px 0 6px;font-size:28px;line-height:1.2;">${escapeHtml(
                  label
                )} ${escapeHtml(getDocumentNumber(document))}</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.88);">Prepared for ${escapeHtml(
                  customerName
                )}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">${messageHtml}</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;background:#f6f8f6;border-radius:16px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#62766e;">${escapeHtml(
                        totalLabel
                      )}</div>
                      <div style="margin-top:8px;font-size:24px;font-weight:700;color:#17382f;">${escapeHtml(
                        totalValue
                      )}</div>
                    </td>
                  </tr>
                </table>
                ${
                  share?.publicUrl
                    ? `<p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#4b665c;">You can also open the secure online version here:</p>
                <p style="margin:0 0 24px;">
                  <a href="${escapeHtml(
                    share.publicUrl
                  )}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:${brandColor};color:#ffffff;text-decoration:none;font-weight:600;">Open secure document</a>
                </p>`
                    : ""
                }
                <p style="margin:0;font-size:13px;line-height:1.7;color:#62766e;">A PDF copy of this ${label.toLowerCase()} is attached for convenience.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildEmailText({ messageBody, share }) {
  return [escapeText(messageBody), share?.publicUrl ? `\nSecure online view: ${share.publicUrl}` : ""]
    .filter(Boolean)
    .join("\n");
}

function buildReplyToAddress(document) {
  return (
    env.EMAIL_REPLY_TO ||
    document?.sections?.branding?.company?.email ||
    document?.sections?.vendor?.contactEmail ||
    undefined
  );
}

function mapEmailResult({ recipientEmail, subject, share, info }) {
  return {
    recipientEmail,
    subject,
    share,
    delivery: {
      accepted: Array.isArray(info?.accepted) ? info.accepted : [],
      rejected: Array.isArray(info?.rejected) ? info.rejected : [],
      messageId: info?.messageId || null,
      response: info?.response || null
    },
    sentAt: new Date().toISOString()
  };
}

async function sendDocumentEmailWithTransport({
  actor = {},
  document,
  documentId,
  documentType,
  notifyUsers = notifyVendorUsers,
  pdf,
  payload = {},
  recordAudit = recordAuditEvent,
  share,
  transport
}) {
  const recipientEmail = escapeText(payload.recipientEmail || getCustomerEmail(document));

  if (!recipientEmail) {
    throw new AppError("Customer email is missing for this document", {
      statusCode: 422,
      code: "DOCUMENT_RECIPIENT_EMAIL_REQUIRED",
      details: [
        {
          path: "recipientEmail",
          message: "Provide a recipient email or add one to the customer record first"
        }
      ]
    });
  }

  const subject = escapeText(payload.subject || getDefaultSubject({ document, documentType }));
  const messageBody = escapeText(
    payload.messageBody || getDefaultMessageBody({ document, documentType, share })
  );
  const label = getDocumentTypeLabel(documentType);
  const vendorName = getVendorName(document);
  const replyTo = buildReplyToAddress(document);

  try {
    const info = await transport.sendMail({
      from: `"${vendorName || env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM_ADDRESS}>`,
      to: recipientEmail,
      replyTo,
      subject,
      text: buildEmailText({ messageBody, share }),
      html: buildEmailHtml({ document, documentType, messageBody, share }),
      attachments: [
        {
          filename: pdf.filename,
          content: pdf.buffer,
          contentType: pdf.contentType
        }
      ]
    });

    await recordAudit({
      vendorId: document.sections?.vendor?.id,
      actor,
      entityType: documentType,
      entityId: documentId,
      eventType: `${documentType}.emailed`,
      eventLabel: `${label} ${getDocumentNumber(document)} was emailed to ${recipientEmail}.`,
      metadata: {
        recipientEmail,
        subject,
        publicUrl: share?.publicUrl || null,
        messageId: info?.messageId || null
      }
    });

    runNotificationTask(
      notifyUsers({
        vendorId: document.sections?.vendor?.id,
        eventCode: `${documentType}.emailed`,
        title: `${label} emailed`,
        message: `${label} ${getDocumentNumber(document)} was emailed to ${recipientEmail}.`,
        relatedEntityType: documentType,
        relatedEntityId: documentId,
        metadata: {
          recipientEmail,
          subject,
          shareUrl: share?.publicUrl || null
        }
      })
    );

    return mapEmailResult({ recipientEmail, subject, share, info });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Document email could not be delivered", {
      statusCode: 502,
      code: "DOCUMENT_EMAIL_DELIVERY_FAILED",
      details: error?.message
        ? [
            {
              path: "email",
              message: error.message
            }
          ]
        : []
    });
  }
}

async function sendDocumentEmail({ actor = {}, documentId, documentType, payload = {} }) {
  const transport = createEmailTransport();
  const vendorId = actor.currentVendorId;

  if (!vendorId) {
    throw new AppError("Vendor context is required to send document email", {
      statusCode: 403,
      code: "VENDOR_CONTEXT_REQUIRED"
    });
  }

  const [share, pdf] = await Promise.all([
    ensureDocumentShare(vendorId, documentType, documentId, actor),
    documentType === "quotation"
      ? buildQuotationPdfDocument(vendorId, documentId)
      : buildInvoicePdfDocument(vendorId, documentId)
  ]);

  return sendDocumentEmailWithTransport({
    actor,
    document: pdf.document,
    documentId,
    documentType,
    pdf,
    payload,
    share,
    transport
  });
}

async function sendQuotationEmail(vendorId, quotationId, payload, actor = {}) {
  void vendorId;
  await getQuotationDetail(actor.currentVendorId || vendorId, quotationId);
  return sendDocumentEmail({
    actor: {
      ...actor,
      currentVendorId: actor.currentVendorId || vendorId
    },
    documentType: "quotation",
    documentId: quotationId,
    payload
  });
}

async function sendInvoiceEmail(vendorId, invoiceId, payload, actor = {}) {
  void vendorId;
  await getInvoiceDetail(actor.currentVendorId || vendorId, invoiceId);
  return sendDocumentEmail({
    actor: {
      ...actor,
      currentVendorId: actor.currentVendorId || vendorId
    },
    documentType: "invoice",
    documentId: invoiceId,
    payload
  });
}

export {
  assertEmailConfiguration,
  buildEmailHtml,
  createEmailTransport,
  getDefaultMessageBody,
  getDefaultSubject,
  sendDocumentEmailWithTransport,
  sendInvoiceEmail,
  sendQuotationEmail
};
