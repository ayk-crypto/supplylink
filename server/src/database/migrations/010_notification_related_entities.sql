ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS related_entity_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS related_entity_id UUID;

CREATE INDEX IF NOT EXISTS idx_notifications_related_entity
ON notifications (vendor_id, related_entity_type, related_entity_id);
