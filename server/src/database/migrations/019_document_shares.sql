CREATE TABLE document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('quotation', 'invoice')),
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  public_token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_viewed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT document_shares_single_document_check CHECK (
    ((quotation_id IS NOT NULL)::int + (invoice_id IS NOT NULL)::int) = 1
  ),
  CONSTRAINT document_shares_type_match_check CHECK (
    (document_type = 'quotation' AND quotation_id IS NOT NULL AND invoice_id IS NULL)
    OR
    (document_type = 'invoice' AND invoice_id IS NOT NULL AND quotation_id IS NULL)
  )
);

CREATE UNIQUE INDEX document_shares_active_quotation_unique_idx
  ON document_shares (quotation_id)
  WHERE quotation_id IS NOT NULL AND revoked_at IS NULL;

CREATE UNIQUE INDEX document_shares_active_invoice_unique_idx
  ON document_shares (invoice_id)
  WHERE invoice_id IS NOT NULL AND revoked_at IS NULL;

CREATE INDEX document_shares_vendor_document_idx
  ON document_shares (vendor_id, document_type, created_at DESC);
