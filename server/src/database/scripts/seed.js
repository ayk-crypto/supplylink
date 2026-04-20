import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import AppError from "../../core/errors/AppError.js";
import env from "../../config/env.js";
import { pool, withTransaction } from "../../config/db.js";

const DEMO_MARKER = "SupplyLink demo seed data. Safe to recreate in local/test databases.";
const DEMO = {
  superAdminEmail: "super.admin@supplylink.local",
  vendorAdminEmail: "vendor.admin@supplylink.local",
  vendorSlug: "demo-supply-co",
  categorySlug: "demo-beverages",
  productSku: "DEMO-WATER-12",
  customerEmail: "buyer@supplylink.local",
  quoteNumber: "DEMO-Q-1001",
  orderNumber: "DEMO-O-1001",
  invoiceNumber: "DEMO-I-1001",
  paymentReference: "DEMO-PAY-1001"
};

async function findRoleId(client, code) {
  const result = await client.query("SELECT id FROM roles WHERE code = $1 LIMIT 1", [code]);
  const role = result.rows[0];

  if (!role) {
    throw new AppError(`Role ${code} is missing. Run migrations before seeding.`, {
      statusCode: 500,
      code: "SEED_ROLE_MISSING"
    });
  }

  return role.id;
}

async function upsertUser(client, { fullName, email, passwordHash }) {
  const result = await client.query(
    `INSERT INTO users (full_name, email, password_hash, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (email)
     DO UPDATE
     SET full_name = EXCLUDED.full_name,
         password_hash = EXCLUDED.password_hash,
         status = 'active',
         updated_at = NOW()
     RETURNING id, email`,
    [fullName, email, passwordHash]
  );

  return result.rows[0];
}

async function assignRole(client, { userId, roleId, vendorId = null }) {
  await client.query(
    `INSERT INTO user_roles (user_id, role_id, vendor_id)
     SELECT $1, $2, $3
     WHERE NOT EXISTS (
       SELECT 1
       FROM user_roles
       WHERE user_id = $1
         AND role_id = $2
         AND vendor_id IS NOT DISTINCT FROM $3
     )`,
    [userId, roleId, vendorId]
  );
}

async function ensureMembership(client, { userId, vendorId }) {
  await client.query(
    `INSERT INTO vendor_memberships (user_id, vendor_id, status, job_title, joined_at)
     VALUES ($1, $2, 'active', 'Demo Vendor Admin', NOW())
     ON CONFLICT (user_id, vendor_id)
     DO UPDATE
     SET status = 'active',
         job_title = EXCLUDED.job_title,
         joined_at = COALESCE(vendor_memberships.joined_at, NOW()),
         updated_at = NOW()`,
    [userId, vendorId]
  );
}

async function seedDemoData(client) {
  const passwordHash = await bcrypt.hash(env.DEMO_SEED_PASSWORD, env.BCRYPT_SALT_ROUNDS);
  const superAdminRoleId = await findRoleId(client, "super_admin");
  const vendorAdminRoleId = await findRoleId(client, "vendor_admin");
  const superAdmin = await upsertUser(client, {
    fullName: "SupplyLink Demo Super Admin",
    email: DEMO.superAdminEmail,
    passwordHash
  });
  const vendorAdmin = await upsertUser(client, {
    fullName: "Demo Vendor Admin",
    email: DEMO.vendorAdminEmail,
    passwordHash
  });

  await assignRole(client, { userId: superAdmin.id, roleId: superAdminRoleId });

  const vendorResult = await client.query(
    `INSERT INTO vendors (
       legal_name,
       display_name,
       slug,
       status,
       contact_email,
       contact_phone,
       currency_code,
       timezone,
       settings
     )
     VALUES (
       'Demo Supply Co LLC',
       'Demo Supply Co',
       $1,
       'active',
       $2,
       '+1-555-0100',
       'USD',
       'UTC',
       $3
     )
     ON CONFLICT (slug)
     DO UPDATE
     SET legal_name = EXCLUDED.legal_name,
         display_name = EXCLUDED.display_name,
         status = 'active',
         contact_email = EXCLUDED.contact_email,
         updated_at = NOW()
     RETURNING id`,
    [DEMO.vendorSlug, DEMO.vendorAdminEmail, { demo: true, note: DEMO_MARKER }]
  );
  const vendor = vendorResult.rows[0];

  await assignRole(client, {
    userId: vendorAdmin.id,
    roleId: vendorAdminRoleId,
    vendorId: vendor.id
  });
  await ensureMembership(client, { userId: vendorAdmin.id, vendorId: vendor.id });

  const categoryResult = await client.query(
    `INSERT INTO categories (vendor_id, name, slug, description)
     VALUES ($1, 'Demo Beverages', $2, 'Demo shelf-stable drinks')
     ON CONFLICT (vendor_id, slug)
     DO UPDATE
     SET name = EXCLUDED.name,
         description = EXCLUDED.description,
         updated_at = NOW()
     RETURNING id`,
    [vendor.id, DEMO.categorySlug]
  );
  const category = categoryResult.rows[0];

  const productResult = await client.query(
    `INSERT INTO products (
       vendor_id,
       category_id,
       sku,
       name,
       description,
       unit_price,
       status,
       metadata
     )
     VALUES ($1, $2, $3, 'Demo Sparkling Water 12 Pack', 'Demo product for local API testing', 8.99, 'active', $4)
     ON CONFLICT (vendor_id, sku)
     DO UPDATE
     SET category_id = EXCLUDED.category_id,
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         unit_price = EXCLUDED.unit_price,
         status = 'active',
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
     RETURNING id`,
    [vendor.id, category.id, DEMO.productSku, { demo: true, unit: "case", note: DEMO_MARKER }]
  );
  const product = productResult.rows[0];

  const existingCustomer = await client.query(
    `SELECT id
     FROM customers
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [DEMO.customerEmail]
  );
  const customer =
    existingCustomer.rows[0] ||
    (
      await client.query(
        `INSERT INTO customers (
           full_name,
           company_name,
           email,
           phone,
           billing_address,
           shipping_address,
           metadata
         )
         VALUES ('Demo Buyer', 'Demo Buyer Co', $1, '+1-555-0111', $2, $2, $3)
         RETURNING id`,
        [
          DEMO.customerEmail,
          { city: "Demo City", country: "US" },
          { demo: true, note: DEMO_MARKER }
        ]
      )
    ).rows[0];

  const relationshipResult = await client.query(
    `INSERT INTO vendor_customer_relationships (
       vendor_id,
       customer_id,
       account_code,
       status,
       credit_limit,
       price_list_code,
       notes,
       metadata
     )
     VALUES ($1, $2, 'DEMO-CUST-001', 'active', 5000, 'DEMO', 'Demo customer relationship', $3)
     ON CONFLICT (vendor_id, customer_id)
     DO UPDATE
     SET status = 'active',
         account_code = EXCLUDED.account_code,
         credit_limit = EXCLUDED.credit_limit,
         price_list_code = EXCLUDED.price_list_code,
         notes = EXCLUDED.notes,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
     RETURNING id`,
    [vendor.id, customer.id, { demo: true, note: DEMO_MARKER }]
  );
  const relationship = relationshipResult.rows[0];

  const quotationResult = await client.query(
    `INSERT INTO quotations (
       vendor_id,
       customer_id,
       vendor_customer_relationship_id,
       quote_number,
       status,
       issue_date,
       expiry_date,
       subtotal,
       discount_total,
       tax_total,
       grand_total,
       notes,
       created_by
     )
     VALUES ($1, $2, $3, $4, 'sent', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 17.98, 0, 1.80, 19.78, 'Demo quotation', $5)
     ON CONFLICT (vendor_id, quote_number)
     DO UPDATE
     SET status = EXCLUDED.status,
         customer_id = EXCLUDED.customer_id,
         vendor_customer_relationship_id = EXCLUDED.vendor_customer_relationship_id,
         subtotal = EXCLUDED.subtotal,
         discount_total = EXCLUDED.discount_total,
         tax_total = EXCLUDED.tax_total,
         grand_total = EXCLUDED.grand_total,
         notes = EXCLUDED.notes,
         updated_at = NOW()
     RETURNING id`,
    [vendor.id, customer.id, relationship.id, DEMO.quoteNumber, vendorAdmin.id]
  );
  const quotation = quotationResult.rows[0];

  await client.query("DELETE FROM quotation_items WHERE vendor_id = $1 AND quotation_id = $2", [
    vendor.id,
    quotation.id
  ]);
  await client.query(
    `INSERT INTO quotation_items (
       quotation_id,
       vendor_id,
       product_id,
       sequence_number,
       description,
       quantity,
       unit_price,
       discount_total,
       tax_total,
       line_total,
       metadata
     )
     VALUES ($1, $2, $3, 1, 'Demo Sparkling Water 12 Pack', 2, 8.99, 0, 1.80, 19.78, $4)`,
    [quotation.id, vendor.id, product.id, { demo: true }]
  );

  const orderResult = await client.query(
    `INSERT INTO orders (
       vendor_id,
       customer_id,
       vendor_customer_relationship_id,
       quotation_id,
       order_number,
       status,
       order_date,
       delivery_date,
       subtotal,
       discount_total,
       tax_total,
       grand_total,
       notes,
       created_by
     )
     VALUES ($1, $2, $3, $4, $5, 'confirmed', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days', 17.98, 0, 1.80, 19.78, 'Demo order', $6)
     ON CONFLICT (vendor_id, order_number)
     DO UPDATE
     SET status = EXCLUDED.status,
         customer_id = EXCLUDED.customer_id,
         vendor_customer_relationship_id = EXCLUDED.vendor_customer_relationship_id,
         quotation_id = EXCLUDED.quotation_id,
         subtotal = EXCLUDED.subtotal,
         discount_total = EXCLUDED.discount_total,
         tax_total = EXCLUDED.tax_total,
         grand_total = EXCLUDED.grand_total,
         notes = EXCLUDED.notes,
         updated_at = NOW()
     RETURNING id`,
    [vendor.id, customer.id, relationship.id, quotation.id, DEMO.orderNumber, vendorAdmin.id]
  );
  const order = orderResult.rows[0];

  await client.query("DELETE FROM order_items WHERE order_id = $1", [order.id]);
  await client.query(
    `INSERT INTO order_items (
       order_id,
       product_id,
       sequence_number,
       description,
       quantity,
       unit_price,
       discount_total,
       tax_total,
       line_total,
       metadata
     )
     VALUES ($1, $2, 1, 'Demo Sparkling Water 12 Pack', 2, 8.99, 0, 1.80, 19.78, $3)`,
    [order.id, product.id, { demo: true }]
  );

  const invoiceResult = await client.query(
    `INSERT INTO invoices (
       vendor_id,
       customer_id,
       vendor_customer_relationship_id,
       order_id,
       invoice_number,
       status,
       issue_date,
       due_date,
       subtotal,
       discount_total,
       tax_total,
       grand_total,
       balance_due,
       notes,
       created_by
     )
     VALUES ($1, $2, $3, $4, $5, 'partially_paid', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 17.98, 0, 1.80, 19.78, 9.78, 'Demo invoice', $6)
     ON CONFLICT (vendor_id, invoice_number)
     DO UPDATE
     SET status = EXCLUDED.status,
         customer_id = EXCLUDED.customer_id,
         vendor_customer_relationship_id = EXCLUDED.vendor_customer_relationship_id,
         order_id = EXCLUDED.order_id,
         subtotal = EXCLUDED.subtotal,
         discount_total = EXCLUDED.discount_total,
         tax_total = EXCLUDED.tax_total,
         grand_total = EXCLUDED.grand_total,
         balance_due = EXCLUDED.balance_due,
         notes = EXCLUDED.notes,
         updated_at = NOW()
     RETURNING id`,
    [vendor.id, customer.id, relationship.id, order.id, DEMO.invoiceNumber, vendorAdmin.id]
  );
  const invoice = invoiceResult.rows[0];

  await client.query("DELETE FROM invoice_items WHERE vendor_id = $1 AND invoice_id = $2", [
    vendor.id,
    invoice.id
  ]);
  await client.query(
    `INSERT INTO invoice_items (
       invoice_id,
       vendor_id,
       product_id,
       sequence_number,
       description,
       quantity,
       unit_price,
       discount_total,
       tax_total,
       line_total,
       metadata
     )
     VALUES ($1, $2, $3, 1, 'Demo Sparkling Water 12 Pack', 2, 8.99, 0, 1.80, 19.78, $4)`,
    [invoice.id, vendor.id, product.id, { demo: true }]
  );

  const paymentResult = await client.query(
    `SELECT id
     FROM payments
     WHERE vendor_id = $1
       AND payment_reference = $2
     LIMIT 1`,
    [vendor.id, DEMO.paymentReference]
  );
  const payment =
    paymentResult.rows[0] ||
    (
      await client.query(
        `INSERT INTO payments (
           vendor_id,
           customer_id,
           vendor_customer_relationship_id,
           invoice_id,
           amount,
           method,
           payment_reference,
           payment_date,
           notes,
           metadata,
           created_by
         )
         VALUES ($1, $2, $3, $4, 10, 'cash', $5, CURRENT_DATE, 'Demo partial payment', $6, $7)
         RETURNING id`,
        [
          vendor.id,
          customer.id,
          relationship.id,
          invoice.id,
          DEMO.paymentReference,
          { demo: true, note: DEMO_MARKER },
          vendorAdmin.id
        ]
      )
    ).rows[0];

  await client.query(
    `INSERT INTO ledger_entries (
       vendor_id,
       customer_id,
       invoice_id,
       order_id,
       entry_type,
       source_type,
       amount,
       entry_date,
       notes,
       created_by
     )
     VALUES ($1, $2, $3, $4, 'debit', 'invoice', 19.78, CURRENT_DATE, 'Demo invoice posted', $5)
     ON CONFLICT (vendor_id, invoice_id)
     WHERE source_type = 'invoice' AND invoice_id IS NOT NULL
     DO UPDATE
     SET amount = EXCLUDED.amount,
         entry_date = EXCLUDED.entry_date,
         notes = EXCLUDED.notes`,
    [vendor.id, customer.id, invoice.id, order.id, vendorAdmin.id]
  );
  await client.query(
    `INSERT INTO ledger_entries (
       vendor_id,
       customer_id,
       invoice_id,
       payment_id,
       entry_type,
       source_type,
       amount,
       entry_date,
       notes,
       created_by
     )
     VALUES ($1, $2, $3, $4, 'credit', 'payment', 10, CURRENT_DATE, 'Demo payment received', $5)
     ON CONFLICT (vendor_id, payment_id)
     WHERE source_type = 'payment' AND payment_id IS NOT NULL
     DO UPDATE
     SET amount = EXCLUDED.amount,
         entry_date = EXCLUDED.entry_date,
         notes = EXCLUDED.notes`,
    [vendor.id, customer.id, invoice.id, payment.id, vendorAdmin.id]
  );

  const existingSubscription = await client.query(
    `SELECT id
     FROM subscriptions
     WHERE vendor_id = $1
       AND plan_code = 'demo_growth'
     ORDER BY created_at ASC
     LIMIT 1`,
    [vendor.id]
  );
  const subscription =
    existingSubscription.rows[0] ||
    (
      await client.query(
        `INSERT INTO subscriptions (
           vendor_id,
           plan_code,
           status,
           billing_cycle,
           current_period_start,
           current_period_end,
           metadata
         )
         VALUES ($1, 'demo_growth', 'trialing', 'monthly', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', $2)
         RETURNING id`,
        [vendor.id, { demo: true, notes: DEMO_MARKER }]
      )
    ).rows[0];

  await client.query(
    `UPDATE subscriptions
     SET status = 'trialing',
         billing_cycle = 'monthly',
         current_period_start = CURRENT_DATE,
         current_period_end = CURRENT_DATE + INTERVAL '30 days',
         metadata = $2,
         updated_at = NOW()
     WHERE id = $1`,
    [subscription.id, { demo: true, notes: DEMO_MARKER }]
  );

  return {
    superAdmin,
    vendorAdmin,
    vendor,
    category,
    product,
    customer,
    quotation,
    order,
    invoice,
    payment,
    subscription
  };
}

async function run() {
  if (!env.DATABASE_URL || !pool) {
    throw new AppError("DATABASE_URL is required to seed demo data", {
      statusCode: 500,
      code: "DATABASE_NOT_CONFIGURED"
    });
  }

  if (env.NODE_ENV === "production" && !env.ALLOW_DEMO_SEED_IN_PRODUCTION) {
    throw new AppError("Refusing to seed demo data in production", {
      statusCode: 403,
      code: "PRODUCTION_SEED_BLOCKED"
    });
  }

  const seeded = await withTransaction(seedDemoData);

  console.log("Demo seed complete");
  console.log(`Super admin: ${DEMO.superAdminEmail} / ${env.DEMO_SEED_PASSWORD}`);
  console.log(`Vendor admin: ${DEMO.vendorAdminEmail} / ${env.DEMO_SEED_PASSWORD}`);
  console.log(`Vendor ID: ${seeded.vendor.id}`);
  console.log(`Customer ID: ${seeded.customer.id}`);
  console.log(`Product ID: ${seeded.product.id}`);
  console.log(`Quotation ID: ${seeded.quotation.id}`);
  console.log(`Order ID: ${seeded.order.id}`);
  console.log(`Invoice ID: ${seeded.invoice.id}`);
  console.log(`Payment ID: ${seeded.payment.id}`);
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  run()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      if (pool) {
        await pool.end();
      }
    });
}

export { seedDemoData };
