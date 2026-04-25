const appRoutes = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    scope: "vendor"
  },
  {
    id: "customers",
    label: "Customers",
    path: "/customers",
    scope: "vendor"
  },
  {
    id: "categories",
    label: "Categories",
    path: "/categories",
    scope: "vendor"
  },
  {
    id: "products",
    label: "Products",
    path: "/products",
    scope: "vendor"
  },
  {
    id: "quotations",
    label: "Quotations",
    path: "/quotations",
    scope: "vendor"
  },
  {
    id: "orders",
    label: "Orders",
    path: "/orders",
    scope: "vendor"
  },
  {
    id: "invoices",
    label: "Invoices",
    path: "/invoices",
    scope: "vendor"
  },
  {
    id: "inventory",
    label: "Inventory",
    path: "/inventory",
    scope: "vendor"
  },
  {
    id: "routes",
    label: "Routes",
    path: "/routes",
    scope: "vendor"
  },
  {
    id: "route-templates",
    label: "Route Templates",
    path: "/route-templates",
    scope: "vendor"
  },
  {
    id: "ledger",
    label: "Ledger",
    path: "/ledger",
    scope: "vendor"
  },
  {
    id: "reports",
    label: "Reports",
    path: "/reports",
    scope: "vendor"
  },
  {
    id: "audit",
    label: "Audit",
    path: "/audit",
    scope: "vendor"
  },
  {
    id: "settings",
    label: "Settings",
    path: "/settings",
    scope: "vendor"
  },
  {
    id: "subscription",
    label: "Subscription",
    path: "/subscription",
    scope: "vendor"
  },
  {
    id: "admin-dashboard",
    label: "Admin Dashboard",
    path: "/admin",
    allowedRoles: ["super_admin"],
    scope: "platform"
  },
  {
    id: "admin-billing",
    label: "Admin Billing",
    path: "/admin/billing",
    allowedRoles: ["super_admin"],
    scope: "platform"
  }
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

export { appRoutes, findRoute, normalizePath };
