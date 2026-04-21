import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import bcrypt from "bcryptjs";
import {
  buildApiClient,
  getTestDatabaseUrl,
  startIntegrationApp,
  waitFor
} from "../test/integrationTestUtils.js";
import { getLocalFilePath } from "./files/files.storage.js";

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

    async function createVendorStaff(vendor, label) {
      const email = `${label}.staff.${suffix}@integration.supplylink.local`;
      const passwordHash = await bcrypt.hash(password, 4);
      const userResult = await app.pool.query(
        `INSERT INTO users (full_name, email, password_hash, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING id`,
        [`${label.toUpperCase()} Vendor Staff`, email, passwordHash]
      );
      const roleResult = await app.pool.query("SELECT id FROM roles WHERE code = 'vendor_staff'");

      await app.pool.query(
        `INSERT INTO user_roles (user_id, role_id, vendor_id)
         VALUES ($1, $2, $3)`,
        [userResult.rows[0].id, roleResult.rows[0].id, vendor.id]
      );
      await app.pool.query(
        `INSERT INTO vendor_memberships (user_id, vendor_id, status, joined_at)
         VALUES ($1, $2, 'active', NOW())`,
        [userResult.rows[0].id, vendor.id]
      );

      const login = await api.post("/auth/login", {
        body: {
          email,
          password,
          vendorId: vendor.id
        }
      });

      return {
        email,
        token: login.payload.data.accessToken,
        user: login.payload.data.user
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

      state.vendorAStaff = await createVendorStaff(state.vendorA.vendor, "alpha");
    });

    await t.test("tenant settings default, update, validation, isolation, roles, and audit", async () => {
      const defaults = await api.get("/settings", {
        token: state.vendorA.token
      });

      assert.equal(defaults.payload.data.vendorId, state.vendorA.vendor.id);
      assert.equal(defaults.payload.data.settings.company.displayName, state.vendorA.vendor.displayName);
      assert.equal(defaults.payload.data.settings.company.legalName, state.vendorA.vendor.legalName);
      assert.equal(defaults.payload.data.settings.company.primaryBrandColor, "");
      assert.equal(defaults.payload.data.settings.company.logoUrl, "");
      assert.equal(defaults.payload.data.settings.company.logo, null);
      assert.equal(defaults.payload.data.settings.currency.code, "USD");
      assert.equal(defaults.payload.data.settings.invoice.nextNumber, 1);
      assert.equal(defaults.payload.data.isDefault, true);

      const staffDefaults = await api.get("/settings", {
        token: state.vendorAStaff.token
      });
      assert.equal(staffDefaults.payload.data.vendorId, state.vendorA.vendor.id);

      await api.patch("/settings", {
        token: state.vendorAStaff.token,
        body: {
          invoice: {
            prefix: "STAFF"
          }
        },
        expectedStatus: 403
      });

      await api.get(`/settings?vendorId=${state.vendorA.vendor.id}`, {
        token: state.vendorB.token,
        expectedStatus: 403
      });

      await api.patch("/settings", {
        token: state.vendorA.token,
        body: {
          company: {
            email: "not-an-email"
          }
        },
        expectedStatus: 400
      });
      await api.patch("/settings", {
        token: state.vendorA.token,
        body: {
          company: {
            primaryBrandColor: "blue"
          }
        },
        expectedStatus: 400
      });
      await api.patch("/settings", {
        token: state.vendorA.token,
        body: {
          invoice: {
            nextNumber: 0,
            padding: 99
          }
        },
        expectedStatus: 400
      });

      const updated = await api.patch("/settings", {
        token: state.vendorA.token,
        body: {
          company: {
            displayName: "Alpha Trading",
            email: "settings-alpha@example.com",
            taxId: "TAX-ALPHA",
            primaryBrandColor: "#1f6feb"
          },
          invoice: {
            prefix: "ALP",
            suffix: "FY26",
            nextNumber: 42,
            padding: 6,
            defaultDueDays: 45,
            defaultNotes: "Thank you for your business."
          },
          currency: {
            code: "eur",
            decimals: 2,
            thousandsSeparator: "."
          },
          preferences: {
            dateFormat: "DD/MM/YYYY",
            defaultPageSize: 50,
            notificationsBadgeEnabled: false,
            confirmDestructiveActions: true
          }
        }
      });

      assert.equal(updated.payload.data.settings.company.displayName, "Alpha Trading");
      assert.equal(updated.payload.data.settings.company.primaryBrandColor, "#1F6FEB");
      assert.equal(updated.payload.data.settings.invoice.prefix, "ALP");
      assert.equal(updated.payload.data.settings.invoice.nextNumber, 42);
      assert.equal(updated.payload.data.settings.currency.code, "EUR");
      assert.equal(updated.payload.data.settings.preferences.notificationsBadgeEnabled, false);
      assert.equal(updated.payload.data.isDefault, false);

      const reloaded = await api.get("/settings", {
        token: state.vendorA.token
      });
      assert.equal(reloaded.payload.data.settings.company.displayName, "Alpha Trading");
      assert.equal(reloaded.payload.data.settings.company.primaryBrandColor, "#1F6FEB");
      assert.equal(reloaded.payload.data.settings.currency.code, "EUR");

      const vendorBDefaults = await api.get("/settings", {
        token: state.vendorB.token
      });
      assert.equal(vendorBDefaults.payload.data.settings.company.displayName, state.vendorB.vendor.displayName);
      assert.notEqual(vendorBDefaults.payload.data.settings.company.displayName, "Alpha Trading");

      const audit = await api.get("/audit?eventType=settings.updated", {
        token: state.vendorA.token
      });
      assert.ok(
        audit.payload.data.items.some(
          (event) =>
            event.entityType === "settings" &&
            event.entityId === state.vendorA.vendor.id &&
            event.metadata.changedSections.includes("company") &&
            event.metadata.changedSections.includes("invoice")
        )
      );
    });

    await t.test("workspace branding logo upload, replacement, delete, validation, and isolation work", async () => {
      const initial = await api.get("/settings", {
        token: state.vendorA.token
      });
      assert.equal(initial.payload.data.settings.company.logo, null);

      const invalidTypeForm = new FormData();
      invalidTypeForm.set("file", new Blob(["bad"], { type: "text/plain" }), "bad.txt");
      await api.post("/settings/logo", {
        token: state.vendorA.token,
        body: invalidTypeForm,
        expectedStatus: 422
      });

      const tooLargeForm = new FormData();
      tooLargeForm.set(
        "file",
        new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], { type: "image/png" }),
        "huge.png"
      );
      await api.post("/settings/logo", {
        token: state.vendorA.token,
        body: tooLargeForm,
        expectedStatus: 413
      });

      const firstLogoForm = new FormData();
      firstLogoForm.set(
        "file",
        new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" }),
        "logo-one.png"
      );
      const firstUpload = await api.post("/settings/logo", {
        token: state.vendorA.token,
        body: firstLogoForm,
        expectedStatus: 201
      });
      assert.equal(firstUpload.payload.data.settings.company.logoUrl, "/api/v1/settings/logo");
      assert.equal(firstUpload.payload.data.settings.company.logo.originalFilename, "logo-one.png");
      assert.equal(firstUpload.payload.data.settings.company.logo.mimeType, "image/png");
      assert.equal(firstUpload.payload.data.settings.company.logo.downloadUrl, "/api/v1/settings/logo");

      const firstStoredSettings = await app.pool.query(
        "SELECT settings FROM vendor_settings WHERE vendor_id = $1",
        [state.vendorA.vendor.id]
      );
      const firstStorageKey = firstStoredSettings.rows[0].settings.company.logoStorage.storageKey;
      await fs.access(getLocalFilePath(firstStorageKey));

      const logoDownload = await fetch(`${app.baseUrl}/settings/logo`, {
        headers: {
          Authorization: `Bearer ${state.vendorA.token}`
        }
      });
      assert.equal(logoDownload.status, 200);
      assert.equal(logoDownload.headers.get("content-type"), "image/png");

      await api.get("/settings/logo", {
        token: state.vendorB.token,
        expectedStatus: 404
      });

      const replaceLogoForm = new FormData();
      replaceLogoForm.set(
        "file",
        new Blob([new Uint8Array([255, 216, 255, 224])], { type: "image/jpeg" }),
        "logo-two.jpg"
      );
      const replaced = await api.post("/settings/logo", {
        token: state.vendorA.token,
        body: replaceLogoForm,
        expectedStatus: 201
      });
      assert.equal(replaced.payload.data.settings.company.logo.originalFilename, "logo-two.jpg");
      assert.equal(replaced.payload.data.settings.company.logo.mimeType, "image/jpeg");

      const replacedStoredSettings = await app.pool.query(
        "SELECT settings FROM vendor_settings WHERE vendor_id = $1",
        [state.vendorA.vendor.id]
      );
      const secondStorageKey = replacedStoredSettings.rows[0].settings.company.logoStorage.storageKey;
      assert.notEqual(secondStorageKey, firstStorageKey);
      await assert.rejects(() => fs.access(getLocalFilePath(firstStorageKey)));
      await fs.access(getLocalFilePath(secondStorageKey));

      const staffReplaceForm = new FormData();
      staffReplaceForm.set(
        "file",
        new Blob([new Uint8Array([255, 216, 255, 224])], { type: "image/jpeg" }),
        "logo-two.jpg"
      );
      await api.post("/settings/logo", {
        token: state.vendorAStaff.token,
        body: staffReplaceForm,
        expectedStatus: 403
      });

      const removed = await api.delete("/settings/logo", {
        token: state.vendorA.token
      });
      assert.equal(removed.payload.data.settings.company.logo, null);
      assert.equal(removed.payload.data.settings.company.logoUrl, "");
      await assert.rejects(() => fs.access(getLocalFilePath(secondStorageKey)));

      await api.get("/settings/logo", {
        token: state.vendorA.token,
        expectedStatus: 404
      });
      await api.delete("/settings/logo", {
        token: state.vendorA.token,
        expectedStatus: 404
      });
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
      assert.equal(Number(state.product.stockQuantity), 0);

      const stockedProduct = await api.post("/inventory/adjust", {
        token: state.vendorA.token,
        body: {
          productId: state.product.id,
          type: "inbound",
          quantity: 50,
          notes: "Initial integration stock"
        },
        expectedStatus: 201
      });
      assert.equal(Number(stockedProduct.payload.data.stockQuantity), 50);

      const thresholdProduct = await api.patch(`/products/${state.product.id}`, {
        token: state.vendorA.token,
        body: {
          lowStockThreshold: 50
        }
      });
      assert.equal(Number(thresholdProduct.payload.data.lowStockThreshold), 50);
      assert.equal(thresholdProduct.payload.data.isLowStock, true);

      const negativeStockProduct = await api.post("/products", {
        token: state.vendorA.token,
        body: {
          sku: `NEG-${suffix}`.slice(0, 90),
          name: "Negative Stock Product",
          categoryId: state.category.id,
          unitPrice: 5,
          status: "active"
        },
        expectedStatus: 201
      });
      state.negativeStockProduct = negativeStockProduct.payload.data;
      const negativeStockAdjustment = await api.post("/inventory/adjust", {
        token: state.vendorA.token,
        body: {
          productId: state.negativeStockProduct.id,
          type: "outbound",
          quantity: 7,
          notes: "Negative stock signal"
        },
        expectedStatus: 201
      });
      assert.equal(Number(negativeStockAdjustment.payload.data.stockQuantity), -7);

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

      const acceptedQuotation = await api.post(`/quotations/${state.quotation.id}/accept`, {
        token: state.vendorA.token
      });
      state.quotation = acceptedQuotation.payload.data;
      assert.equal(state.quotation.status, "accepted");

      const order = await api.post(`/quotations/${state.quotation.id}/convert-to-order`, {
        token: state.vendorA.token,
        expectedStatus: 201
      });
      state.order = order.payload.data;
      assert.equal(state.order.quotationId, state.quotation.id);
      assert.equal(state.order.status, "confirmed");

      const productAfterOrder = await api.get(`/inventory/products/${state.product.id}`, {
        token: state.vendorA.token
      });
      assert.equal(Number(productAfterOrder.payload.data.stockQuantity), 48);
      assert.equal(Number(productAfterOrder.payload.data.lowStockThreshold), 50);
      assert.equal(productAfterOrder.payload.data.isLowStock, true);

      const adjustedProduct = await api.post("/inventory/adjust", {
        token: state.vendorA.token,
        body: {
          productId: state.product.id,
          quantity: -3,
          notes: "Manual shrinkage adjustment"
        },
        expectedStatus: 201
      });
      assert.equal(Number(adjustedProduct.payload.data.stockQuantity), 45);

      const stockMovements = await api.get(`/inventory/movements?productId=${state.product.id}`, {
        token: state.vendorA.token
      });
      assert.ok(stockMovements.payload.data.items.some((item) => item.type === "inbound"));
      assert.ok(stockMovements.payload.data.items.some((item) => item.type === "outbound"));
      assert.ok(stockMovements.payload.data.items.some((item) => item.type === "adjustment"));

      const invoice = await api.post(`/orders/${state.order.id}/create-invoice`, {
        token: state.vendorA.token,
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

      const envModule = await import("../config/env.js");
      const previousStockEnforcement = envModule.default.ENFORCE_STOCK_AVAILABILITY;
      envModule.default.ENFORCE_STOCK_AVAILABILITY = true;

      try {
        await api.post("/orders", {
          token: state.vendorA.token,
          body: {
            customerId: state.customer.id,
            status: "confirmed",
            items: [
              {
                productId: state.product.id,
                quantity: 10000,
                unitPrice: 10
              }
            ]
          },
          expectedStatus: 409
        });
      } finally {
        envModule.default.ENFORCE_STOCK_AVAILABILITY = previousStockEnforcement;
      }
    });

    await t.test("route templates support CRUD, stops, vendor isolation, and generation", async () => {
      const template = await api.post("/route-templates", {
        token: state.vendorA.token,
        body: {
          name: "North Weekly Route",
          notes: "Reusable north-side plan",
          vehicleLabel: "Van 7",
          recurrenceType: "weekly",
          recurrenceDays: [1, 3],
          isActive: true
        },
        expectedStatus: 201
      });
      state.routeTemplate = template.payload.data;
      assert.equal(state.routeTemplate.name, "North Weekly Route");
      assert.deepEqual(state.routeTemplate.recurrenceDays, [1, 3]);
      assert.equal(state.routeTemplate.stopCount, 0);

      const listed = await api.get("/route-templates?search=North&isActive=true", {
        token: state.vendorA.token
      });
      assert.ok(listed.payload.data.items.some((item) => item.id === state.routeTemplate.id));

      const detail = await api.get(`/route-templates/${state.routeTemplate.id}`, {
        token: state.vendorA.token
      });
      assert.equal(detail.payload.data.id, state.routeTemplate.id);
      assert.deepEqual(detail.payload.data.stops, []);

      const updated = await api.patch(`/route-templates/${state.routeTemplate.id}`, {
        token: state.vendorA.token,
        body: {
          notes: "Updated recurring plan",
          vehicleLabel: "Truck 2",
          recurrenceDays: [2, 4]
        }
      });
      assert.equal(updated.payload.data.notes, "Updated recurring plan");
      assert.equal(updated.payload.data.vehicleLabel, "Truck 2");
      assert.deepEqual(updated.payload.data.recurrenceDays, [2, 4]);

      await api.post("/route-templates", {
        token: state.vendorA.token,
        body: {
          name: "Invalid duplicate weekdays",
          recurrenceDays: [1, 1]
        },
        expectedStatus: 400
      });

      await api.get(`/route-templates/${state.routeTemplate.id}`, {
        token: state.vendorB.token,
        expectedStatus: 404
      });

      const firstStop = await api.post(`/route-templates/${state.routeTemplate.id}/stops`, {
        token: state.vendorA.token,
        body: {
          customerId: state.customer.id,
          sequenceNumber: 1,
          notes: "First reusable stop"
        },
        expectedStatus: 201
      });
      state.routeTemplateStop = firstStop.payload.data;
      assert.equal(state.routeTemplateStop.sequenceNumber, 1);
      assert.equal(state.routeTemplateStop.customerId, state.customer.id);

      await api.post(`/route-templates/${state.routeTemplate.id}/stops`, {
        token: state.vendorA.token,
        body: {
          customerId: state.customer.id,
          sequenceNumber: 1
        },
        expectedStatus: 409
      });

      const secondStop = await api.post(`/route-templates/${state.routeTemplate.id}/stops`, {
        token: state.vendorA.token,
        body: {
          customerId: state.customer.id,
          sequenceNumber: 2,
          notes: "Second reusable stop"
        },
        expectedStatus: 201
      });

      const updatedStop = await api.patch(
        `/route-templates/${state.routeTemplate.id}/stops/${secondStop.payload.data.id}`,
        {
          token: state.vendorA.token,
          body: {
            sequenceNumber: 3,
            notes: "Second reusable stop moved"
          }
        }
      );
      assert.equal(updatedStop.payload.data.sequenceNumber, 3);
      assert.equal(updatedStop.payload.data.notes, "Second reusable stop moved");

      const stops = await api.get(`/route-templates/${state.routeTemplate.id}/stops`, {
        token: state.vendorA.token
      });
      assert.deepEqual(
        stops.payload.data.items.map((stop) => stop.sequenceNumber),
        [1, 3]
      );

      const vendorBTemplate = await api.post("/route-templates", {
        token: state.vendorB.token,
        body: {
          name: "Bravo Weekly Route",
          recurrenceDays: [5]
        },
        expectedStatus: 201
      });
      await api.post(`/route-templates/${vendorBTemplate.payload.data.id}/stops`, {
        token: state.vendorB.token,
        body: {
          customerId: state.customer.id,
          sequenceNumber: 1
        },
        expectedStatus: 422
      });

      const generated = await api.post(`/route-templates/${state.routeTemplate.id}/generate`, {
        token: state.vendorA.token,
        body: {
          routeDate: "2026-05-04",
          status: "draft",
          vehicleLabel: "Truck override",
          notes: "Generated from weekly plan"
        },
        expectedStatus: 201
      });
      state.generatedRoute = generated.payload.data;
      assert.equal(state.generatedRoute.routeDate, "2026-05-04");
      assert.equal(state.generatedRoute.status, "draft");
      assert.equal(state.generatedRoute.vehicleLabel, "Truck override");
      assert.equal(state.generatedRoute.sourceRouteTemplateId, state.routeTemplate.id);
      assert.deepEqual(
        state.generatedRoute.stops.map((stop) => stop.sequenceNumber),
        [1, 3]
      );
      assert.equal(state.generatedRoute.stops[0].notes, "First reusable stop");

      const generatedDetail = await api.get(`/routes/${state.generatedRoute.id}`, {
        token: state.vendorA.token
      });
      assert.equal(generatedDetail.payload.data.sourceRouteTemplateId, state.routeTemplate.id);
      assert.deepEqual(
        generatedDetail.payload.data.stops.map((stop) => stop.sequenceNumber),
        [1, 3]
      );

      const editedGeneratedRoute = await api.patch(`/routes/${state.generatedRoute.id}`, {
        token: state.vendorA.token,
        body: {
          status: "planned",
          notes: "Generated route remains editable"
        }
      });
      assert.equal(editedGeneratedRoute.payload.data.status, "planned");
      assert.equal(editedGeneratedRoute.payload.data.notes, "Generated route remains editable");

      await api.patch(`/route-templates/${state.routeTemplate.id}`, {
        token: state.vendorA.token,
        body: {
          name: "North Weekly Route Edited Later"
        }
      });
      const generatedAfterTemplateEdit = await api.get(`/routes/${state.generatedRoute.id}`, {
        token: state.vendorA.token
      });
      assert.notEqual(generatedAfterTemplateEdit.payload.data.name, "North Weekly Route Edited Later");

      const manualRoute = await api.post("/routes", {
        token: state.vendorA.token,
        body: {
          name: "Manual Compatibility Route",
          routeDate: "2026-05-05",
          status: "planned"
        },
        expectedStatus: 201
      });
      assert.equal(manualRoute.payload.data.sourceRouteTemplateId, null);
      const manualStop = await api.post(`/routes/${manualRoute.payload.data.id}/stops`, {
        token: state.vendorA.token,
        body: {
          customerId: state.customer.id,
          sequenceNumber: 1
        },
        expectedStatus: 201
      });
      assert.equal(manualStop.payload.data.sequenceNumber, 1);

      const disposableTemplate = await api.post("/route-templates", {
        token: state.vendorA.token,
        body: {
          name: "Disposable Template",
          recurrenceDays: [6]
        },
        expectedStatus: 201
      });
      const disposableStop = await api.post(
        `/route-templates/${disposableTemplate.payload.data.id}/stops`,
        {
          token: state.vendorA.token,
          body: {
            customerId: state.customer.id,
            sequenceNumber: 1
          },
          expectedStatus: 201
        }
      );
      await api.delete(
        `/route-templates/${disposableTemplate.payload.data.id}/stops/${disposableStop.payload.data.id}`,
        {
          token: state.vendorA.token
        }
      );
      const disposableStops = await api.get(
        `/route-templates/${disposableTemplate.payload.data.id}/stops`,
        {
          token: state.vendorA.token
        }
      );
      assert.equal(disposableStops.payload.data.items.length, 0);
      await api.delete(`/route-templates/${disposableTemplate.payload.data.id}`, {
        token: state.vendorA.token
      });
      await api.get(`/route-templates/${disposableTemplate.payload.data.id}`, {
        token: state.vendorA.token,
        expectedStatus: 404
      });
    });

    await t.test("transaction lifecycle actions enforce valid transitions", async () => {
      const draftQuotation = await api.post("/quotations", {
        token: state.vendorA.token,
        body: {
          customerId: state.customer.id,
          notes: "Lifecycle quote",
          items: [
            {
              productId: state.product.id,
              quantity: 1,
              unitPrice: 10
            }
          ]
        },
        expectedStatus: 201
      });
      const quotationId = draftQuotation.payload.data.id;

      await api.patch(`/quotations/${quotationId}`, {
        token: state.vendorA.token,
        body: { status: "accepted" },
        expectedStatus: 400
      });
      await api.post(`/quotations/${quotationId}/accept`, {
        token: state.vendorA.token,
        expectedStatus: 409
      });
      const sentQuotation = await api.post(`/quotations/${quotationId}/send`, {
        token: state.vendorA.token
      });
      assert.equal(sentQuotation.payload.data.status, "sent");
      await api.patch(`/quotations/${quotationId}`, {
        token: state.vendorA.token,
        body: { issueDate: "2026-04-20" },
        expectedStatus: 409
      });
      const editableSentQuotation = await api.patch(`/quotations/${quotationId}`, {
        token: state.vendorA.token,
        body: { expiryDate: "2026-05-20", notes: "Still editable while sent" }
      });
      assert.equal(editableSentQuotation.payload.data.notes, "Still editable while sent");
      const acceptedQuotation = await api.post(`/quotations/${quotationId}/accept`, {
        token: state.vendorA.token
      });
      assert.equal(acceptedQuotation.payload.data.status, "accepted");

      for (const action of ["reject", "expire"]) {
        const transitionQuotation = await api.post("/quotations", {
          token: state.vendorA.token,
          body: {
            customerId: state.customer.id,
            notes: `Lifecycle quote to ${action}`,
            items: [
              {
                productId: state.product.id,
                quantity: 1,
                unitPrice: 10
              }
            ]
          },
          expectedStatus: 201
        });
        const transitionQuotationId = transitionQuotation.payload.data.id;
        await api.post(`/quotations/${transitionQuotationId}/send`, {
          token: state.vendorA.token
        });
        const result = await api.post(`/quotations/${transitionQuotationId}/${action}`, {
          token: state.vendorA.token
        });
        assert.equal(result.payload.data.status, action === "reject" ? "rejected" : "expired");
      }

      const draftOrder = await api.post("/orders", {
        token: state.vendorA.token,
        body: {
          customerId: state.customer.id,
          items: [
            {
              productId: state.product.id,
              quantity: 1,
              unitPrice: 10
            }
          ]
        },
        expectedStatus: 201
      });
      const orderId = draftOrder.payload.data.id;

      await api.patch(`/orders/${orderId}`, {
        token: state.vendorA.token,
        body: { status: "delivered" },
        expectedStatus: 400
      });
      await api.post(`/orders/${orderId}/deliver`, {
        token: state.vendorA.token,
        expectedStatus: 409
      });
      assert.equal((await api.post(`/orders/${orderId}/confirm`, { token: state.vendorA.token })).payload.data.status, "confirmed");
      const movementForConfirmedOrder = await api.get(`/inventory/movements?referenceType=order&referenceId=${orderId}`, {
        token: state.vendorA.token
      });
      assert.ok(movementForConfirmedOrder.payload.data.items.length >= 1);
      await api.patch(`/orders/${orderId}`, {
        token: state.vendorA.token,
        body: { orderDate: "2026-04-20" },
        expectedStatus: 409
      });
      const editableConfirmedOrder = await api.patch(`/orders/${orderId}`, {
        token: state.vendorA.token,
        body: { deliveryDate: "2026-04-25", notes: "Confirmed order delivery note" }
      });
      assert.equal(editableConfirmedOrder.payload.data.notes, "Confirmed order delivery note");
      assert.equal((await api.post(`/orders/${orderId}/pack`, { token: state.vendorA.token })).payload.data.status, "packed");
      assert.equal((await api.post(`/orders/${orderId}/dispatch`, { token: state.vendorA.token })).payload.data.status, "dispatched");
      assert.equal((await api.post(`/orders/${orderId}/deliver`, { token: state.vendorA.token })).payload.data.status, "delivered");

      const cancellableOrder = await api.post("/orders", {
        token: state.vendorA.token,
        body: {
          customerId: state.customer.id,
          items: [
            {
              productId: state.product.id,
              quantity: 1,
              unitPrice: 10
            }
          ]
        },
        expectedStatus: 201
      });
      const cancelledOrder = await api.post(`/orders/${cancellableOrder.payload.data.id}/cancel`, {
        token: state.vendorA.token
      });
      assert.equal(cancelledOrder.payload.data.status, "cancelled");

      const confirmedCancellableOrder = await api.post("/orders", {
        token: state.vendorA.token,
        body: {
          customerId: state.customer.id,
          status: "confirmed",
          items: [
            {
              productId: state.product.id,
              quantity: 4,
              unitPrice: 10
            }
          ]
        },
        expectedStatus: 201
      });
      const stockBeforeCancellation = await api.get(`/inventory/products/${state.product.id}`, {
        token: state.vendorA.token
      });
      await api.post(`/orders/${confirmedCancellableOrder.payload.data.id}/cancel`, {
        token: state.vendorA.token
      });
      const stockAfterCancellation = await api.get(`/inventory/products/${state.product.id}`, {
        token: state.vendorA.token
      });
      assert.equal(
        Number(stockAfterCancellation.payload.data.stockQuantity),
        Number(stockBeforeCancellation.payload.data.stockQuantity) + 4
      );
      await api.post(`/orders/${confirmedCancellableOrder.payload.data.id}/cancel`, {
        token: state.vendorA.token,
        expectedStatus: 409
      });
      const stockAfterDuplicateCancellation = await api.get(`/inventory/products/${state.product.id}`, {
        token: state.vendorA.token
      });
      assert.equal(
        Number(stockAfterDuplicateCancellation.payload.data.stockQuantity),
        Number(stockAfterCancellation.payload.data.stockQuantity)
      );
      const cancellationMovements = await api.get(
        `/inventory/movements?referenceType=order_cancellation&referenceId=${confirmedCancellableOrder.payload.data.id}`,
        {
          token: state.vendorA.token
        }
      );
      assert.equal(cancellationMovements.payload.data.items.length, 1);

      const draftInvoice = await api.post("/invoices", {
        token: state.vendorA.token,
        body: {
          customerId: state.customer.id,
          items: [
            {
              productId: state.product.id,
              quantity: 1,
              unitPrice: 10
            }
          ]
        },
        expectedStatus: 201
      });
      const invoiceId = draftInvoice.payload.data.id;

      await api.patch(`/invoices/${invoiceId}`, {
        token: state.vendorA.token,
        body: { status: "paid" },
        expectedStatus: 400
      });
      const issuedInvoice = await api.post(`/invoices/${invoiceId}/issue`, {
        token: state.vendorA.token
      });
      assert.equal(issuedInvoice.payload.data.status, "issued");
      assert.equal(Number(issuedInvoice.payload.data.balanceDue), 10);
      await api.patch(`/invoices/${invoiceId}`, {
        token: state.vendorA.token,
        body: { issueDate: "2026-04-20" },
        expectedStatus: 409
      });
      const editableIssuedInvoice = await api.patch(`/invoices/${invoiceId}`, {
        token: state.vendorA.token,
        body: { dueDate: "2026-05-20", notes: "Issued invoice payment note" }
      });
      assert.equal(editableIssuedInvoice.payload.data.notes, "Issued invoice payment note");
      const voidInvoice = await api.post(`/invoices/${invoiceId}/void`, {
        token: state.vendorA.token
      });
      assert.equal(voidInvoice.payload.data.status, "void");
      assert.equal(Number(voidInvoice.payload.data.balanceDue), 0);
    });

    await t.test("conversion actions reject invalid, duplicate, and cross-tenant conversions", async () => {
      await api.post(`/quotations/${state.quotation.id}/convert-to-order`, {
        token: state.vendorA.token,
        expectedStatus: 409
      });
      await api.post(`/orders/${state.order.id}/create-invoice`, {
        token: state.vendorA.token,
        expectedStatus: 409
      });
      await api.post(`/quotations/${state.quotation.id}/convert-to-order`, {
        token: state.vendorB.token,
        expectedStatus: 404
      });
      await api.post(`/orders/${state.order.id}/create-invoice`, {
        token: state.vendorB.token,
        expectedStatus: 404
      });

      const draftQuotation = await api.post("/quotations", {
        token: state.vendorA.token,
        body: {
          customerId: state.customer.id,
          notes: "Not accepted yet",
          items: [
            {
              productId: state.product.id,
              quantity: 1,
              unitPrice: 10
            }
          ]
        },
        expectedStatus: 201
      });
      await api.post(`/quotations/${draftQuotation.payload.data.id}/convert-to-order`, {
        token: state.vendorA.token,
        expectedStatus: 409
      });

      const draftOrder = await api.post("/orders", {
        token: state.vendorA.token,
        body: {
          customerId: state.customer.id,
          items: [
            {
              productId: state.product.id,
              quantity: 1,
              unitPrice: 10
            }
          ]
        },
        expectedStatus: 201
      });
      await api.post(`/orders/${draftOrder.payload.data.id}/create-invoice`, {
        token: state.vendorA.token,
        expectedStatus: 409
      });
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
      await api.get(`/inventory/products/${state.product.id}`, {
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

    await t.test("audit trail captures key events and stays vendor scoped", async () => {
      const audit = await api.get("/audit?page=1&pageSize=100", {
        token: state.vendorA.token
      });
      const events = audit.payload.data.items;
      const eventTypes = new Set(events.map((event) => event.eventType));

      [
        "quotation.created",
        "quotation.accepted",
        "quotation.converted_to_order",
        "order.created",
        "order.confirmed",
        "order.converted_to_invoice",
        "invoice.created",
        "invoice.issued",
        "payment.received",
        "inventory.adjusted",
        "order.stock_allocated",
        "inventory.order_reversal"
      ].forEach((eventType) => assert.ok(eventTypes.has(eventType), `Missing audit ${eventType}`));

      assert.ok(events.every((event) => event.vendorId === state.vendorA.vendor.id));
      assert.ok(events.every((event) => event.actorUserId === state.vendorA.user.id));

      const orderHistory = await api.get(`/audit/order/${state.order.id}`, {
        token: state.vendorA.token
      });
      const orderHistoryTypes = new Set(
        orderHistory.payload.data.items.map((event) => event.eventType)
      );

      assert.ok(orderHistoryTypes.has("order.created"));
      assert.ok(orderHistoryTypes.has("order.confirmed"));
      assert.ok(orderHistoryTypes.has("order.converted_to_invoice"));
      assert.ok(
        orderHistory.payload.data.items.some(
          (event) =>
            event.eventType === "order.created" &&
            event.actorDisplay === state.vendorA.user.fullName &&
            event.entityReference === state.order.orderNumber &&
            event.entityLabel === state.order.orderNumber &&
            event.entity?.reference === state.order.orderNumber
        )
      );
      assert.ok(
        orderHistory.payload.data.items.every(
          (event) => event.entityType === "order" && event.entityId === state.order.id
        )
      );

      const paymentAudit = await api.get(
        `/audit?entityType=payment&entityId=${state.partialPayment.id}&eventType=payment.received`,
        {
          token: state.vendorA.token
        }
      );
      assert.equal(paymentAudit.payload.data.items.length, 1);
      assert.equal(paymentAudit.payload.data.items[0].metadata.invoiceId, state.invoice.id);
      assert.equal(paymentAudit.payload.data.items[0].entityType, "payment");
      assert.equal(paymentAudit.payload.data.items[0].actorUserId, state.vendorA.user.id);
      assert.ok(Object.prototype.hasOwnProperty.call(paymentAudit.payload.data.items[0], "entityLabel"));

      const productAudit = await api.get(`/audit/product/${state.product.id}`, {
        token: state.vendorA.token
      });
      assert.ok(
        productAudit.payload.data.items.some(
          (event) =>
            event.eventType === "inventory.adjusted" &&
            event.entityReference === state.product.sku &&
            event.entityLabel === state.product.name
        )
      );

      const vendorBHistory = await api.get(`/audit/order/${state.order.id}`, {
        token: state.vendorB.token
      });
      assert.equal(vendorBHistory.payload.data.items.length, 0);

      await api.patch(`/audit/order/${state.order.id}`, {
        token: state.vendorA.token,
        body: { eventLabel: "mutated" },
        expectedStatus: 404
      });
      await api.delete(`/audit/order/${state.order.id}`, {
        token: state.vendorA.token,
        expectedStatus: 404
      });

      const auditId = events[0].id;
      await assert.rejects(
        () => app.pool.query("UPDATE audit_logs SET event_label = event_label WHERE id = $1", [auditId]),
        /append-only/
      );
      await assert.rejects(
        () => app.pool.query("DELETE FROM audit_logs WHERE id = $1", [auditId]),
        /append-only/
      );
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
      await api.post(`/notifications/${notificationId}/read`, {
        token: state.vendorA.token
      });
      const notificationDetail = await api.get(`/notifications/${notificationId}`, {
        token: state.vendorA.token
      });
      assert.equal(notificationDetail.payload.data.isRead, true);
      assert.ok(notificationDetail.payload.data.relatedEntityType);
      assert.ok(notificationDetail.payload.data.relatedEntityId);
      assert.equal(notificationDetail.payload.data.relatedEntity.id, notificationDetail.payload.data.relatedEntityId);
      assert.equal(notificationDetail.payload.data.relatedEntity.type, notificationDetail.payload.data.relatedEntityType);

      const unreadNotifications = await api.get("/notifications?unreadOnly=true&page=1&pageSize=10", {
        token: state.vendorA.token
      });
      assert.ok(unreadNotifications.payload.data.items.length >= 1);
      const unreadNotificationId = unreadNotifications.payload.data.items[0].id;

      const vendorBBulkRead = await api.post("/notifications/bulk-read", {
        token: state.vendorB.token,
        body: {
          notificationIds: [unreadNotificationId]
        }
      });
      assert.equal(vendorBBulkRead.payload.data.updatedCount, 0);
      assert.equal(vendorBBulkRead.payload.data.skippedCount, 1);

      const stillUnread = await api.get(`/notifications/${unreadNotificationId}`, {
        token: state.vendorA.token
      });
      assert.equal(stillUnread.payload.data.isRead, false);

      const bulkRead = await api.post("/notifications/bulk-read", {
        token: state.vendorA.token,
        body: {
          notificationIds: [unreadNotificationId, notificationId, unreadNotificationId]
        }
      });
      assert.equal(bulkRead.payload.data.requestedCount, 2);
      assert.equal(bulkRead.payload.data.updatedCount, 1);
      assert.equal(bulkRead.payload.data.skippedCount, 1);
      assert.ok(bulkRead.payload.data.updatedIds.includes(unreadNotificationId));

      const bulkReadDetail = await api.get(`/notifications/${unreadNotificationId}`, {
        token: state.vendorA.token
      });
      assert.equal(bulkReadDetail.payload.data.isRead, true);

      const eventDirectory = await waitFor(async () => {
        const result = await api.get("/notifications?page=1&pageSize=50", {
          token: state.vendorA.token
        });
        const eventCodes = new Set(result.payload.data.items.map((item) => item.eventCode));
        [
          "quotation.sent",
          "quotation.accepted",
          "quotation.rejected",
          "quotation.expired",
          "order.confirmed",
          "order.packed",
          "order.dispatched",
          "order.delivered",
          "order.cancelled",
          "invoice.issued",
          "invoice.voided",
          "payment.received",
          "quotation.converted_to_order",
          "order.converted_to_invoice"
        ].forEach((eventCode) => assert.ok(eventCodes.has(eventCode), `Missing ${eventCode}`));

        return result;
      });

      const vendorNotificationId = eventDirectory.payload.data.items[0].id;
      await api.get(`/notifications/${vendorNotificationId}`, {
        token: state.vendorB.token,
        expectedStatus: 404
      });

      const readAll = await api.post("/notifications/read-all", {
        token: state.vendorA.token
      });
      assert.equal(readAll.payload.data.unreadCount, 0);

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
      assert.ok(dashboard.payload.data.aggregates.inventory.productCount >= 2);
      assert.ok(dashboard.payload.data.aggregates.inventory.lowStockProductCount >= 2);
      assert.ok(dashboard.payload.data.aggregates.inventory.negativeStockProductCount >= 1);
      assert.ok(dashboard.payload.data.aggregates.orders.byStatus.confirmed >= 1);
      assert.ok(dashboard.payload.data.aggregates.orders.byStatus.delivered >= 1);
      assert.ok(dashboard.payload.data.aggregates.orders.byStatus.cancelled >= 1);
      assert.ok(dashboard.payload.data.aggregates.invoices.byStatus.paid >= 1);
      assert.ok(dashboard.payload.data.aggregates.invoices.byStatus.void >= 1);
      assert.ok(dashboard.payload.data.aggregates.receivables.openInvoiceCount >= 0);

      const vendorBDashboard = await api.get("/ui/dashboard", {
        token: state.vendorB.token
      });
      assert.equal(vendorBDashboard.payload.data.vendor.id, state.vendorB.vendor.id);
      assert.equal(vendorBDashboard.payload.data.aggregates.inventory.productCount, 0);
      assert.equal(vendorBDashboard.payload.data.aggregates.orders.total, 0);
      assert.equal(vendorBDashboard.payload.data.aggregates.invoices.total, 0);

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
