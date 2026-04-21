import assert from "node:assert/strict";
import test from "node:test";
import { renderStructuredDocumentPdf } from "./documents.pdf.js";

test("renderStructuredDocumentPdf returns a PDF buffer for quotations", async () => {
  const buffer = await renderStructuredDocumentPdf({
    documentType: "quotation",
    title: "QUOTATION QT-0001",
    sections: {
      branding: {
        company: {
          displayName: "SupplyLink Demo",
          primaryBrandColor: "#1F6FEB"
        },
        formatting: {
          currencyCode: "USD",
          decimals: 2,
          thousandsSeparator: ",",
          dateFormat: "YYYY-MM-DD"
        }
      },
      vendor: {
        displayName: "SupplyLink Demo"
      },
      customer: {
        companyName: "Acme Stores",
        fullName: "Ava Customer",
        email: "ava@example.com"
      },
      header: {
        quoteNumber: "QT-0001",
        status: "sent",
        issueDate: "2026-04-21",
        expiryDate: "2026-04-30",
        createdAt: "2026-04-21"
      },
      items: [
        {
          productName: "Starter Pack",
          sku: "SKU-0001",
          description: "Starter Pack",
          quantity: 2,
          unitPrice: 25,
          discountTotal: 0,
          taxTotal: 5,
          lineTotal: 55
        }
      ],
      totals: {
        subtotal: 50,
        discountType: null,
        discountValue: 0,
        discountTotal: 0,
        taxEnabled: true,
        taxRate: 10,
        taxTotal: 5,
        grandTotal: 55
      },
      footer: {
        notes: "Thanks for your business.",
        terms: "Net 30."
      }
    }
  });

  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.byteLength > 500);
  assert.equal(buffer.subarray(0, 5).toString("utf8"), "%PDF-");
});
