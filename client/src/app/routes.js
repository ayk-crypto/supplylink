const appRoutes = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    scope: "vendor",
    group: "overview"
  },
  {
    id: "customers",
    label: "Customers",
    path: "/customers",
    scope: "vendor",
    group: "catalog"
  },
  {
    id: "categories",
    label: "Categories",
    path: "/categories",
    scope: "vendor",
    group: "catalog"
  },
  {
    id: "products",
    label: "Products",
    path: "/products",
    scope: "vendor",
    group: "catalog"
  },
  {
    id: "quotations",
    label: "Quotations",
    path: "/quotations",
    scope: "vendor",
    group: "sales"
  },
  {
    id: "orders",
    label: "Orders",
    path: "/orders",
    scope: "vendor",
    group: "sales"
  },
  {
    id: "invoices",
    label: "Invoices",
    path: "/invoices",
    scope: "vendor",
    group: "sales"
  },
  {
    id: "inventory",
    label: "Inventory",
    path: "/inventory",
    scope: "vendor",
    group: "operations"
  },
  {
    id: "routes",
    label: "Routes",
    path: "/routes",
    scope: "vendor",
    group: "operations"
  },
  {
    id: "route-templates",
    label: "Route Templates",
    path: "/route-templates",
    scope: "vendor",
    group: "operations"
  },
  {
    id: "ledger",
    label: "Ledger",
    path: "/ledger",
    scope: "vendor",
    group: "finance"
  },
  {
    id: "reports",
    label: "Reports",
    path: "/reports",
    scope: "vendor",
    group: "finance"
  },
  {
    id: "audit",
    label: "Audit",
    path: "/audit",
    scope: "vendor",
    group: "admin"
  },
  {
    id: "settings",
    label: "Settings",
    path: "/settings",
    scope: "vendor",
    group: "admin"
  },
  {
    id: "subscription",
    label: "Subscription",
    path: "/subscription",
    scope: "vendor",
    group: "admin"
  },
  {
    id: "admin-dashboard",
    label: "Admin Dashboard",
    path: "/admin",
    allowedRoles: ["super_admin"],
    scope: "platform",
    group: "platform"
  },
  {
    id: "admin-vendors",
    label: "Vendors",
    path: "/admin/vendors",
    allowedRoles: ["super_admin"],
    scope: "platform",
    group: "platform"
  },
  {
    id: "admin-billing",
    label: "Admin Billing",
    path: "/admin/billing",
    allowedRoles: ["super_admin"],
    scope: "platform",
    group: "platform"
  }
];

const navGroupOrder = [
  { id: "overview", label: "Overview" },
  { id: "catalog", label: "Catalog" },
  { id: "sales", label: "Sales" },
  { id: "operations", label: "Operations" },
  { id: "finance", label: "Finance" },
  { id: "admin", label: "Admin" },
  { id: "platform", label: "Platform" }
];

const routeDefinitions = [
  ...appRoutes.map((route) => ({
    ...route,
    navPath: route.path
  })),
  {
    id: "customer-detail",
    path: /^\/customers\/([^/]+)$/,
    navPath: "/customers",
    paramNames: ["id"],
    scope: "vendor"
  },
  {
    id: "quotation-new",
    path: "/quotations/new",
    navPath: "/quotations",
    scope: "vendor"
  },
  {
    id: "quotation-detail",
    path: /^\/quotations\/([^/]+)$/,
    navPath: "/quotations",
    paramNames: ["id"],
    scope: "vendor"
  },
  {
    id: "order-new",
    path: "/orders/new",
    navPath: "/orders",
    scope: "vendor"
  },
  {
    id: "order-detail",
    path: /^\/orders\/([^/]+)$/,
    navPath: "/orders",
    paramNames: ["id"],
    scope: "vendor"
  },
  {
    id: "invoice-new",
    path: "/invoices/new",
    navPath: "/invoices",
    scope: "vendor"
  },
  {
    id: "invoice-from-order",
    path: /^\/invoices\/from-order\/([^/]+)$/,
    navPath: "/invoices",
    paramNames: ["orderId"],
    scope: "vendor"
  },
  {
    id: "invoice-detail",
    path: /^\/invoices\/([^/]+)$/,
    navPath: "/invoices",
    paramNames: ["id"],
    scope: "vendor"
  },
  {
    id: "inventory-product",
    path: /^\/inventory\/products\/([^/]+)$/,
    navPath: "/inventory",
    paramNames: ["id"],
    scope: "vendor"
  },
  {
    id: "customer-ledger",
    path: /^\/ledger\/customers\/([^/]+)$/,
    navPath: "/ledger",
    paramNames: ["id"],
    scope: "vendor"
  },
  {
    id: "route-detail",
    path: /^\/routes\/([^/]+)$/,
    navPath: "/routes",
    paramNames: ["id"],
    scope: "vendor"
  },
  {
    id: "route-template-detail",
    path: /^\/route-templates\/([^/]+)$/,
    navPath: "/route-templates",
    paramNames: ["id"],
    scope: "vendor"
  },
  {
    id: "report-receivables",
    path: "/reports/receivables",
    navPath: "/reports",
    scope: "vendor"
  },
  {
    id: "report-invoices",
    path: "/reports/invoices",
    navPath: "/reports",
    scope: "vendor"
  },
  {
    id: "report-payments",
    path: "/reports/payments",
    navPath: "/reports",
    scope: "vendor"
  },
  {
    id: "report-orders",
    path: "/reports/orders",
    navPath: "/reports",
    scope: "vendor"
  },
  {
    id: "report-statements",
    path: "/reports/statements",
    navPath: "/reports",
    scope: "vendor"
  },
  {
    id: "notifications",
    path: "/notifications",
    navPath: "/notifications",
    scope: "vendor"
  },
  {
    id: "audit-entity",
    path: /^\/audit\/([^/]+)\/([^/]+)$/,
    navPath: "/audit",
    paramNames: ["entityType", "entityId"],
    scope: "vendor"
  },
  {
    id: "public-document",
    path: /^\/share\/([^/]+)$/,
    navPath: null,
    paramNames: ["token"],
    scope: "public"
  }
];

function normalizePath(pathname) {
  if (!pathname || pathname === "/") {
    return "/dashboard";
  }

  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

function findRoute(pathname) {
  const normalizedPath = normalizePath(pathname);

  for (const route of routeDefinitions) {
    if (typeof route.path === "string" && route.path === normalizedPath) {
      return {
        ...route,
        params: {}
      };
    }

    if (route.path instanceof RegExp) {
      const match = normalizedPath.match(route.path);

      if (match) {
        const params = {};

        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });

        return {
          ...route,
          params
        };
      }
    }
  }

  return null;
}

export { appRoutes, findRoute, navGroupOrder, normalizePath };
