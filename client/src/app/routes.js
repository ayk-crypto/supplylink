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
  }
];

const routeDefinitions = [
  ...appRoutes.map((route) => ({
    ...route,
    navPath: route.path
  })),
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
    id: "invoice-detail",
    path: /^\/invoices\/([^/]+)$/,
    navPath: "/invoices",
    paramNames: ["id"]
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
