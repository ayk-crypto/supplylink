ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_scope_check;

ALTER TABLE roles
ADD CONSTRAINT roles_scope_check
CHECK (scope IN ('platform', 'vendor', 'customer'));

CREATE TABLE IF NOT EXISTS vendor_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended')),
  job_title VARCHAR(120),
  invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_memberships_user_id ON vendor_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_memberships_vendor_id ON vendor_memberships (vendor_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);

INSERT INTO roles (code, name, scope, description)
VALUES
  ('vendor_staff', 'Vendor Staff', 'vendor', 'General vendor team member with vendor-scoped access.'),
  ('customer_user', 'Customer User', 'customer', 'Future customer portal user foundation.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO vendor_memberships (user_id, vendor_id, status, joined_at)
SELECT DISTINCT user_id, vendor_id, 'active', NOW()
FROM user_roles
WHERE vendor_id IS NOT NULL
ON CONFLICT (user_id, vendor_id) DO NOTHING;
