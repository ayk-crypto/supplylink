CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('customers', 'quotations', 'orders', 'invoices', 'routes')),
  entity_id UUID NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  storage_key TEXT NOT NULL,
  storage_backend VARCHAR(50) NOT NULL DEFAULT 'local',
  mime_type VARCHAR(150) NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_vendor_id ON attachments (vendor_id);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments (vendor_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by_user_id
ON attachments (uploaded_by_user_id);
