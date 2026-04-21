import test from "node:test";
import assert from "node:assert/strict";
import AppError from "../../core/errors/AppError.js";
import {
  assertEmailConfiguration,
  buildEmailHtml,
  getDefaultMessageBody,
  getDefaultSubject,
  sendDocumentEmailWithTransport
} from "./documents.email.service.js";

function createSampleDocument(documentType = "quotation") {
  return {
    title: `${documentType === "quotation" ? "QUOTATION" : "INVOICE"} DOC-1001`,
    sections: {
      header:
        documentType === "quotation"
          ? {
              quoteNumber: "Q-1001",
              expiryDate: "2026-05-01"
            }
          : {
              invoiceNumber: "I-1001",
              dueDate: "2026-05-15"
            },
      vendor: {
        id: "vendor-1",
        displayName: "Acme Supplies",
        contactEmail: "accounts@acme.test"
      },
      branding: {
        company: {
          displayName: "Acme Supplies",
          email: "sales@acme.test",
          primaryBrandColor: "#114b3a"
        },
        formatting: {
          currencyCode: "USD",
          decimals: 2
        }
      },
      customer: {
        id: "customer-1",
        companyName: "Northwind Foods",
        email: "buyer@northwind.test"
      },
      totals:
        documentType === "quotation"
          ? {
              grandTotal: 245.5
            }
          : {
              grandTotal: 245.5,
              balanceDue: 120.25
            }
    }
  };
}

test("document email config validation rejects missing required settings", () => {
  assert.throws(
    () =>
      assertEmailConfiguration({
        host: "",
        fromAddress: "",
        user: "mailer-user",
        pass: "",
        port: 587,
        secure: false
      }),
    (error) =>
      error instanceof AppError &&
      error.code === "EMAIL_NOT_CONFIGURED" &&
      error.details.some((detail) => detail.path === "EMAIL_SMTP_HOST") &&
      error.details.some((detail) => detail.path === "EMAIL_FROM_ADDRESS")
  );
});

test("document email defaults include vendor, document number, and share link", () => {
  const document = createSampleDocument("quotation");
  const share = { publicUrl: "https://example.test/share/secure-token" };
  const subject = getDefaultSubject({ document, documentType: "quotation" });
  const message = getDefaultMessageBody({ document, documentType: "quotation", share });
  const html = buildEmailHtml({
    document,
    documentType: "quotation",
    messageBody: message,
    share
  });

  assert.match(subject, /Quotation Q-1001 from Acme Supplies/);
  assert.match(message, /Northwind Foods/);
  assert.match(message, /https:\/\/example\.test\/share\/secure-token/);
  assert.match(html, /Acme Supplies/);
  assert.match(html, /Open secure document/);
});

test("document email sender uses custom payload and records send metadata", async () => {
  const transportCalls = [];
  const auditCalls = [];
  const notifyCalls = [];

  const result = await sendDocumentEmailWithTransport({
    actor: { userId: "user-1" },
    document: createSampleDocument("invoice"),
    documentId: "invoice-1",
    documentType: "invoice",
    payload: {
      recipientEmail: "ap@northwind.test",
      subject: "Invoice I-1001 ready",
      messageBody: "Please see the attached invoice."
    },
    pdf: {
      buffer: Buffer.from("pdf-bytes"),
      filename: "invoice-i-1001.pdf",
      contentType: "application/pdf"
    },
    recordAudit: async (payload) => {
      auditCalls.push(payload);
    },
    notifyUsers: async (payload) => {
      notifyCalls.push(payload);
    },
    share: {
      publicUrl: "https://example.test/share/invoice-token"
    },
    transport: {
      sendMail: async (payload) => {
        transportCalls.push(payload);
        return {
          accepted: ["ap@northwind.test"],
          rejected: [],
          messageId: "<message-id@example.test>",
          response: "250 queued"
        };
      }
    }
  });

  assert.equal(transportCalls.length, 1);
  assert.equal(transportCalls[0].to, "ap@northwind.test");
  assert.equal(transportCalls[0].subject, "Invoice I-1001 ready");
  assert.equal(transportCalls[0].attachments[0].filename, "invoice-i-1001.pdf");
  assert.equal(auditCalls.length, 1);
  assert.equal(auditCalls[0].eventType, "invoice.emailed");
  assert.equal(notifyCalls.length, 1);
  assert.equal(notifyCalls[0].eventCode, "invoice.emailed");
  assert.equal(result.recipientEmail, "ap@northwind.test");
  assert.equal(result.share.publicUrl, "https://example.test/share/invoice-token");
});
