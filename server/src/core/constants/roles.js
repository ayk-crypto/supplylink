const PLATFORM_ROLES = ["super_admin"];

const VENDOR_ROLES = [
  "vendor_admin",
  "vendor_staff",
  "vendor_owner",
  "vendor_manager",
  "vendor_sales",
  "vendor_accountant",
  "vendor_dispatcher",
  "vendor_driver"
];

const CUSTOMER_ROLES = ["customer_user"];

const AUTH_FOUNDATION_ROLES = [
  "super_admin",
  "vendor_admin",
  "vendor_staff",
  "customer_user"
];

const ALL_ROLES = [...PLATFORM_ROLES, ...VENDOR_ROLES, ...CUSTOMER_ROLES];

export { ALL_ROLES, AUTH_FOUNDATION_ROLES, CUSTOMER_ROLES, PLATFORM_ROLES, VENDOR_ROLES };
