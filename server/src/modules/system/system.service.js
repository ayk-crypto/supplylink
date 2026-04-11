import env from "../../config/env.js";
import API_INFO from "../../core/constants/api.js";
import {
  ALL_ROLES,
  CUSTOMER_ROLES,
  PLATFORM_ROLES,
  VENDOR_ROLES
} from "../../core/constants/roles.js";
import { TENANCY_HEADERS, TENANCY_SCOPES } from "../../core/constants/tenancy.js";
import { getDatabaseTimestamp } from "../../database/repositories/system.repository.js";

const MODULES = [
  {
    key: "auth",
    scope: "platform",
    path: `${API_INFO.basePath}/auth`,
    description: "Shared identity and session layer for all clients."
  },
  {
    key: "vendors",
    scope: "platform",
    path: `${API_INFO.basePath}/vendors`,
    description: "Tenant management and vendor onboarding."
  },
  {
    key: "customers",
    scope: "vendor",
    path: `${API_INFO.basePath}/customers`,
    description: "Vendor-isolated customer access through relationship records."
  },
  {
    key: "products",
    scope: "vendor",
    path: `${API_INFO.basePath}/products`,
    description: "Catalog and category base."
  },
  {
    key: "orders",
    scope: "vendor",
    path: `${API_INFO.basePath}/orders`,
    description: "Ordering and fulfillment base."
  },
  {
    key: "invoices",
    scope: "vendor",
    path: `${API_INFO.basePath}/invoices`,
    description: "Billing and receivables base."
  },
  {
    key: "quotations",
    scope: "vendor",
    path: `${API_INFO.basePath}/quotations`,
    description: "Quotation workflow base."
  },
  {
    key: "ledger",
    scope: "vendor",
    path: `${API_INFO.basePath}/ledger`,
    description: "Customer balance and transaction history base."
  },
  {
    key: "routes",
    scope: "vendor",
    path: `${API_INFO.basePath}/routes`,
    description: "Delivery route planning base."
  },
  {
    key: "subscriptions",
    scope: "platform",
    path: `${API_INFO.basePath}/subscriptions`,
    description: "Tenant subscription base."
  },
  {
    key: "reports",
    scope: "vendor",
    path: `${API_INFO.basePath}/reports`,
    description: "Vendor-scoped report and CSV export foundation."
  },
  {
    key: "notifications",
    scope: "user",
    path: `${API_INFO.basePath}/notifications`,
    description: "In-app notification center foundation."
  }
];

async function buildSystemOverview() {
  let database = {
    enabled: Boolean(env.DATABASE_URL),
    connected: false,
    timestamp: null
  };

  if (env.DATABASE_URL) {
    try {
      const timestamp = await getDatabaseTimestamp();
      database = {
        enabled: true,
        connected: true,
        timestamp
      };
    } catch {
      database = {
        enabled: true,
        connected: false,
        timestamp: null
      };
    }
  }

  return {
    app: {
      name: env.APP_NAME,
      version: env.APP_VERSION,
      environment: env.NODE_ENV
    },
    api: API_INFO,
    database,
    roles: {
      all: ALL_ROLES,
      platform: PLATFORM_ROLES,
      vendor: VENDOR_ROLES,
      customer: CUSTOMER_ROLES
    },
    tenancy: {
      scopes: Object.values(TENANCY_SCOPES),
      headers: TENANCY_HEADERS,
      principle:
        "Customers can be shared at the master-record level while each vendor relationship remains isolated."
    },
    modules: MODULES
  };
}

async function buildSystemReadiness() {
  const overview = await buildSystemOverview();
  const checks = {
    databaseConfigured: overview.database.enabled,
    databaseConnected: overview.database.connected,
    jwtSecretConfigured: Boolean(env.JWT_SECRET),
    productionJwtSecretIsExplicit:
      env.NODE_ENV !== "production" || env.JWT_SECRET !== "development-only-jwt-secret"
  };
  const ready = Object.values(checks).every(Boolean);

  return {
    ready,
    checks,
    app: overview.app,
    database: overview.database
  };
}

export { MODULES, buildSystemOverview, buildSystemReadiness };
