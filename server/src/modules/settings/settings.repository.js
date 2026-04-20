import { query } from "../../config/db.js";

async function findVendorSettings(vendorId) {
  const result = await query(
    `SELECT vendor.id AS vendor_id,
            vendor.legal_name,
            vendor.display_name,
            vendor.contact_email,
            vendor.contact_phone,
            vendor.currency_code,
            vendor.settings AS vendor_metadata,
            tenant_settings.settings,
            tenant_settings.created_at,
            tenant_settings.updated_at
     FROM vendors vendor
     LEFT JOIN vendor_settings tenant_settings ON tenant_settings.vendor_id = vendor.id
     WHERE vendor.id = $1
     LIMIT 1`,
    [vendorId]
  );

  return result.rows[0] || null;
}

async function upsertVendorSettings(vendorId, settings) {
  const result = await query(
    `INSERT INTO vendor_settings (vendor_id, settings)
     VALUES ($1, $2)
     ON CONFLICT (vendor_id)
     DO UPDATE SET settings = EXCLUDED.settings,
                   updated_at = NOW()
     RETURNING vendor_id,
               settings,
               created_at,
               updated_at`,
    [vendorId, settings]
  );

  return result.rows[0] || null;
}

export { findVendorSettings, upsertVendorSettings };
