const appRoutes = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard"
  },
  {
    id: "customers",
    label: "Customers",
    path: "/customers"
  },
  {
    id: "categories",
    label: "Categories",
    path: "/categories"
  },
  {
    id: "products",
    label: "Products",
    path: "/products"
  },
  {
    id: "quotations",
    label: "Quotations",
    path: "/quotations"
  },
  {
    id: "orders",
    label: "Orders",
    path: "/orders"
  },
  {
    id: "invoices",
    label: "Invoices",
    path: "/invoices"
  },
  {
    id: "inventory",
    label: "Inventory",
    path: "/inventory"
  },
  {
    id: "routes",
    label: "Routes",
    path: "/routes"
  },
  {
    id: "route-templates",
    label: "Route Templates",
    path: "/route-templates"
  },
  {
    id: "ledger",
    label: "Ledger",
    path: "/ledger"
  },
  {
    id: "reports",
    label: "Reports",
    path: "/reports"
  },
  {
    id: "audit",
    label: "Audit",
    path: "/audit"
  },
  {
    id: "settings",
    label: "Settings",
    path: "/settings"
  },
  {
    id: "subscription",
    label: "Subscription",
    path: "/subscription"
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
    paramNames: ["id"]
  },
  {
    id: "quotation-new",
    path: "/quotations/new",
    navPath: "/quotations"
  },
  {
    id: "quotation-detail",
    path: /^\/quotations\/([^/]+)$/,
    navPath: "/quotations",
    paramNames: ["id"]
  },
  {
    id: "order-new",
    path: "/orders/new",
    navPath: "/orders"
  },
  {
    id: "order-detail",
    path: /^\/orders\/([^/]+)$/,
    navPath: "/orders",
    paramNames: ["id"]
  },
  {
    id: "invoice-new",
    path: "/invoices/new",
    navPath: "/invoices"
  },
  {
    id: "invoice-from-order",
    path: /^\/invoices\/from-order\/([^/]+)$/,
    navPath: "/invoices",
    paramNames: ["orderId"]
  },
  {
    id: "invoice-detail",
    path: /^\/invoices\/([^/]+)$/,
    navPath: "/invoices",
    paramNames: ["id"]
  },
  {
    id: "inventory-product",
    path: /^\/inventory\/products\/([^/]+)$/,
    navPath: "/inventory",
    paramNames: ["id"]
  },
  {
    id: "customer-ledger",
    path: /^\/ledger\/customers\/([^/]+)$/,
    navPath: "/ledger",
    paramNames: ["id"]
  },
  {
    id: "route-detail",
    path: /^\/routes\/([^/]+)$/,
    navPath: "/routes",
    paramNames: ["id"]
  },
  {
    id: "route-template-detail",
    path: /^\/route-templates\/([^/]+)$/,
    navPath: "/route-templates",
    paramNames: ["id"]
  },
  {
    id: "report-receivables",
    path: "/reports/receivables",
    navPath: "/reports"
  },
  {
    id: "report-invoices",
    path: "/reports/invoices",
    navPath: "/reports"
  },
  {
    id: "report-payments",
    path: "/reports/payments",
    navPath: "/reports"
  },
  {
    id: "report-orders",
    path: "/reports/orders",
    navPath: "/reports"
  },
  {
    id: "report-statements",
    path: "/reports/statements",
    navPath: "/reports"
  },
  {
    id: "notifications",
    path: "/notifications",
    navPath: "/notifications"
  },
  {
    id: "audit-entity",
    path: /^\/audit\/([^/]+)\/([^/]+)$/,
    navPath: "/audit",
    paramNames: ["entityType", "entityId"]
  },
  {
    id: "public-document",
    path: /^\/share\/([^/]+)$/,
    navPath: null,
    paramNames: ["token"]
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
