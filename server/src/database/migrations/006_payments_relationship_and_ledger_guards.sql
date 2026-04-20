ALTER TABLE payments
ADD COLUMN IF NOT EXISTS vendor_customer_relationship_id UUID REFERENCES vendor_customer_relationships(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE payments payment
SET vendor_customer_relationship_id = relationship.id
FROM vendor_customer_relationships relationship
WHERE payment.vendor_customer_relationship_id IS NULL
  AND relationship.vendor_id = payment.vendor_id
  AND relationship.customer_id = payment.customer_id;

ALTER TABLE payments
ALTER COLUMN vendor_customer_relationship_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_vendor_id ON payments (vendor_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments (customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_vendor_customer_relationship_id
ON payments (vendor_customer_relationship_id);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_customer_id ON ledger_entries (customer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_invoice_id ON ledger_entries (invoice_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_payment_id ON ledger_entries (payment_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_entries_unique_invoice_source
ON ledger_entries (vendor_id, invoice_id)
WHERE source_type = 'invoice' AND invoice_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_entries_unique_payment_source
ON ledger_entries (vendor_id, payment_id)
WHERE source_type = 'payment' AND payment_id IS NOT NULL;
