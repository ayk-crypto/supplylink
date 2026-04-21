ALTER TABLE document_shares
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS document_shares_expires_at_idx
  ON document_shares (expires_at)
  WHERE expires_at IS NOT NULL;
