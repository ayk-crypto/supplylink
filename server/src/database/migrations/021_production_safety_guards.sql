DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_invoice_id_fkey'
  ) THEN
    ALTER TABLE payments DROP CONSTRAINT payments_invoice_id_fkey;
  END IF;
END $$;

ALTER TABLE payments
ADD CONSTRAINT payments_invoice_id_fkey
FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ledger_entries_invoice_id_fkey'
  ) THEN
    ALTER TABLE ledger_entries DROP CONSTRAINT ledger_entries_invoice_id_fkey;
  END IF;
END $$;

ALTER TABLE ledger_entries
ADD CONSTRAINT ledger_entries_invoice_id_fkey
FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ledger_entries_payment_id_fkey'
  ) THEN
    ALTER TABLE ledger_entries DROP CONSTRAINT ledger_entries_payment_id_fkey;
  END IF;
END $$;

ALTER TABLE ledger_entries
ADD CONSTRAINT ledger_entries_payment_id_fkey
FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'document_shares_invoice_id_fkey'
  ) THEN
    ALTER TABLE document_shares DROP CONSTRAINT document_shares_invoice_id_fkey;
  END IF;
END $$;

ALTER TABLE document_shares
ADD CONSTRAINT document_shares_invoice_id_fkey
FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'document_shares_quotation_id_fkey'
  ) THEN
    ALTER TABLE document_shares DROP CONSTRAINT document_shares_quotation_id_fkey;
  END IF;
END $$;

ALTER TABLE document_shares
ADD CONSTRAINT document_shares_quotation_id_fkey
FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE RESTRICT;
