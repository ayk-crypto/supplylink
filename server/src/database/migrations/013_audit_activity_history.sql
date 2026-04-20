ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(120),
  ADD COLUMN IF NOT EXISTS event_label TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE audit_logs
SET event_type = action
WHERE event_type IS NULL;

UPDATE audit_logs
SET event_label = action
WHERE event_label IS NULL;

UPDATE audit_logs
SET metadata = payload
WHERE metadata = '{}'::jsonb
  AND payload <> '{}'::jsonb;

ALTER TABLE audit_logs
  ALTER COLUMN event_type SET NOT NULL,
  ALTER COLUMN event_label SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_vendor_created
ON audit_logs (vendor_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_vendor_entity
ON audit_logs (vendor_id, entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_vendor_event_type
ON audit_logs (vendor_id, event_type, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_audit_logs_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs are append-only and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_prevent_update ON audit_logs;
CREATE TRIGGER audit_logs_prevent_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_logs_mutation();

DROP TRIGGER IF EXISTS audit_logs_prevent_delete ON audit_logs;
CREATE TRIGGER audit_logs_prevent_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_logs_mutation();
