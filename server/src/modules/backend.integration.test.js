import assert from "node:assert/strict";
import test from "node:test";
import {
  buildApiClient,
  getTestDatabaseUrl,
  startIntegrationApp,
  waitFor
} from "../test/integrationTestUtils.js";

const testDatabaseUrl = getTestDatabaseUrl();

if (!testDatabaseUrl) {
  test("DB-backed integration tests require TEST_DATABASE_URL", { skip: true }, () => {});
} else {
  test("multi-tenant backend integration flow", async (t) => {
    const app = await startIntegrationApp();
    const api = buildApiClient(app.baseUrl);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const password = "Password123!";
    const state = {};

    t.after(async () => {
      await app.stop();
    });

    async function registerVendorAdmin(label) {
      const email = `${label}.admin.${suffix}@integration.supplylink.local`;
      const slug = `${label}-vendor-${suffix}`.replace(/[^a-z0-9-]/g, "-").slice(0, 150);
      const result = await api.post("/auth/register", {
        expectedStatus: 201,
        body: {
          fullName: `${label.toUpperCase()} Vendor Admin`,
          email,
          password,
          roleCode: "vendor_admin",
          vendor: {
            legalName: `${label.toUpperCase()} Vendor LLC`,
            displayName: `${label.toUpperCase()} Vendor`,
            slug,
            contactEmail: email
          }
        }
      });

      return {
        email,
        token: result.payload.data.accessToken,
        user: result.payload.data.user,
        vendor: result.payload.data.vendor
      };
    }

    await t.test("auth register, login, and me return usable vendor context", async () => {
      state.vendorA = await registerVendorAdmin("alpha");
      state.vendorB = await registerVendorAdmin("bravo");

      const login = await api.post("/auth/login", {
        body: {
          email: state.vendorA.email,
          password,
          vendorId: state.vendorA.vendor.id
        }
      });

      assert.ok(login.payload.data.accessToken);
      state.vendorA.token = login.payload.data.accessToken;

      const me = await api.get("/auth/me", {
        token: state.vendorA.token
      });

      assert.equal(me.payload.data.email, state.vendorA.email);
      assert.equal(me.payload.data.currentVendorId, state.vendorA.vendor.id);
    });

    await t.test("transaction chain creates customer, product, quotation, order, invoice, and payments", async () => {
      const customer = await api.post("/customers", {
        token: state.vendorA.token,
        body: {
          customer: {
            fullName: "Integration Buyer",
            companyName: "Integration Buyer Co",
            email: `buyer.${suffix}@example.com`,
            phone: "+1-555-0200"
          },
          relationship: {
            accountCode: `INT-${suffix}`.slice(0, 80),
            status: "active",
            creditLimit: 1000
          }
        },
        expectedStatus: 201
      });
      state.customer = customer.payload.data.customer;

      const category = await api.post("/categories", {
        token: state.vendorA.token,
        body: {
          name: `Integration Category ${suffix}`.slice(0, 120),
          description: "Integration test category"
        },
        expectedStatus: 201
      });
      state.category = category.payload.data;

      const product = await api.post("/products", {
        token: state.vendorA.token,
        body: {
          sku: `INT-${suffix}`.slice(0, 90),
          name: "Integration Product",
          categoryId: state.category.id,
          unitPrice: 10,
          status: "active"
        },
        expectedStatus: 201
      });
      state.product = product.payload.data;

      const quotation = await api.post("/quotations", {
        token: state.vendorA.token,
        body: {
          customerId: state.customer.id,
          status: "sent",
          notes: "Integration quote",
          items: [
            {
              productId: state.product.id,
              quantity: 2,
              unitPrice: 10
            }
          ]
        },
        expectedStatus: 201
      });
      state.quotation = quotation.payload.data;
      assert.equal(Number(state.quotation.grandTotal), 20);

      const order = await api.post("/orders", {
        token: state.vendorA.token,
        body: {
          quotationId: state.quotation.id,
          status: "confirmed"
        },
        expectedStatus: 201
      });
      state.order = order.payload.data;
      assert.equal(state.order.quotationId, state.quotation.id);

      const invoice = await api.post("/invoices", {
        token: state.vendorA.token,
        body: {
          orderId: state.order.id,
          status: "issued"
        },
        expectedStatus: 201
      });
      state.invoice = invoice.payload.data;
      assert.equal(state.invoice.status, "issued");
      assert.equal(Number(state.invoice.balanceDue), 20);

      const partialPayment = await api.post("/payments", {
        token: state.vendorA.token,
        body: {
          customerId: state.customer.id,
          invoiceId: state.invoice.id,
          amount: 5,
          paymentMethod: "cash",
          referenceNumber: `PART-${suffix}`.slice(0, 100)
        },
        expectedStatus: 201
      });
      state.partialPayment = partialPayment.payload.data;
      assert.equal(Number(state.partialPayment.amount), 5);

      const partiallyPaidInvoice = await api.get(`/invoices/${state.invoice.id}`, {
        token: state.vendorA.token
      });
      assert.equal(partiallyPaidInvoice.payload.data.status, "partially_paid");
      assert.equal(Number(partiallyPaidInvoice.payload.data.balanceDue), 15);

      await api.post("/payments", {
        token: state.vendorA.token,
        body: {
          customerId: state.customer.id,
          invoiceId: state.invoice.id,
          amount: 100,
          paymentMethod: "cash",
          referenceNumber: `OVER-${suffix}`.slice(0, 100)
        },
        expectedStatus: 422
      });

      const fullPayment = await api.post("/payments", {
        token: state.vendorA.token,
        body: {
          customerId: state.customer.id,
          invoiceId: state.invoice.id,
          amount: 15,
          paymentMethod: "bank_transfer",
          referenceNumber: `FULL-${suffix}`.slice(0, 100)
        },
        expectedStatus: 201
      });
      state.fullPayment = fullPayment.payload.data;

      const paidInvoice = await api.get(`/invoices/${state.invoice.id}`, {
        token: state.vendorA.token
      });
      assert.equal(paidInvoice.payload.data.status, "paid");
      assert.equal(Number(paidInvoice.payload.data.balanceDue), 0);

      const ledger = await api.get(`/ledger/customer/${state.customer.id}`, {
        token: state.vendorA.token
      });
      assert.equal(Number(ledger.payload.data.endingBalance), 0);
      assert.ok(ledger.payload.data.items.some((entry) => entry.sourceType === "invoice"));
      assert.ok(ledger.payload.data.items.some((entry) => entry.sourceType === "payment"));
    });

    await t.test("tenant isolation blocks vendor B from vendor A resources", async () => {
      await api.get(`/customers/${state.customer.id}`, {
        token: state.vendorB.token,
        expectedStatus: 404
      });
      await api.get(`/products/${state.product.id}`, {
        token: state.vendorB.token,
        expectedStatus: 404
      });
      await api.get(`/quotations/${state.quotation.id}`, {
        token: state.vendorB.token,
        expectedStatus: 404
      });
      await api.get(`/orders/${state.order.id}`, {
        token: state.vendorB.token,
        expectedStatus: 404
      });
      await api.get(`/invoices/${state.invoice.id}`, {
        token: state.vendorB.token,
        expectedStatus: 404
      });
    });

    await t.test("file tenant isolation uses attachment vendor ownership", async () => {
      const formData = new FormData();
      formData.set("entityType", "orders");
      formData.set("entityId", state.order.id);
      formData.set("metadata", JSON.stringify({ label: "integration proof" }));
      formData.set("file", new Blob(["proof"], { type: "text/plain" }), "proof.txt");

      const upload = await api.post("/files", {
        token: state.vendorA.token,
        body: formData,
        expectedStatus: 201
      });
      state.file = upload.payload.data;

      const detail = await api.get(`/files/${state.file.id}`, {
        token: state.vendorA.token
      });
      assert.equal(detail.payload.data.id, state.file.id);

      await api.get(`/files/${state.file.id}`, {
        token: state.vendorB.token,
        expectedStatus: 404
      });
    });

    await t.test("notifications, reports, and frontend helpers expose expected shapes", async () => {
      await waitFor(async () => {
        const unread = await api.get("/notifications/unread-count", {
          token: state.vendorA.token
        });

        assert.ok(unread.payload.data.unreadCount >= 2);
        return unread;
      });

      const notifications = await api.get("/notifications?page=1&pageSize=5", {
        token: state.vendorA.token
      });
      assert.ok(notifications.payload.data.items.length >= 1);

      const notificationId = notifications.payload.data.items[0].id;
      await api.patch(`/notifications/${notificationId}/read`, {
        token: state.vendorA.token
      });
      const notificationDetail = await api.get(`/notifications/${notificationId}`, {
        token: state.vendorA.token
      });
      assert.equal(notificationDetail.payload.data.isRead, true);

      const summary = await api.get("/reports/summary", {
        token: state.vendorA.token
      });
      assert.ok(summary.payload.data.metrics.totalCustomers >= 1);
      assert.ok(Number(summary.payload.data.metrics.outstandingReceivables) >= 0);

      const dashboard = await api.get("/ui/dashboard", {
        token: state.vendorA.token
      });
      assert.equal(dashboard.payload.data.vendor.id, state.vendorA.vendor.id);
      assert.ok(Array.isArray(dashboard.payload.data.recent.orders));
      assert.ok(Array.isArray(dashboard.payload.data.notifications.latest));

      const customerLookup = await api.get("/lookups/customers?limit=5", {
        token: state.vendorA.token
      });
      assert.ok(customerLookup.payload.data.items.some((item) => item.id === state.customer.id));

      const productLookup = await api.get("/lookups/products?limit=5", {
        token: state.vendorA.token
      });
      assert.ok(productLookup.payload.data.items.some((item) => item.id === state.product.id));
    });
  });
}
