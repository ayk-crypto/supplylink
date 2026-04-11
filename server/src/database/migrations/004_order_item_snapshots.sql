ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS sequence_number INTEGER,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

WITH numbered_items AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY created_at ASC, id ASC)::int AS sequence_number
  FROM order_items
  WHERE sequence_number IS NULL
)
UPDATE order_items item
SET sequence_number = numbered_items.sequence_number
FROM numbered_items
WHERE item.id = numbered_items.id;

ALTER TABLE order_items
ALTER COLUMN sequence_number SET DEFAULT 1,
ALTER COLUMN sequence_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_items_order_sequence
ON order_items (order_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);
