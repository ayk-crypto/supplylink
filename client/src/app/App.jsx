import { useEffect } from "react";
import AppShell from "../components/layout/AppShell.jsx";
import { ToastProvider } from "../features/feedback/ToastProvider.jsx";
import AdminBillingScreen from "../features/admin-billing/AdminBillingScreen.jsx";
import AdminVendorsScreen from "../features/admin-vendors/AdminVendorsScreen.jsx";
import AuthProvider from "../features/auth/AuthProvider.jsx";
import ProtectedRoute from "../features/auth/ProtectedRoute.jsx";
import AuditScreen from "../features/audit/AuditScreen.jsx";
import EntityAuditScreen from "../features/audit/EntityAuditScreen.jsx";
import DashboardScreen from "../features/dashboard/DashboardScreen.jsx";
import PublicDocumentScreen from "../features/documents/PublicDocumentScreen.jsx";
import InvoiceCreateScreen from "../features/invoices/InvoiceCreateScreen.jsx";
import InvoiceDetailScreen from "../features/invoices/InvoiceDetailScreen.jsx";
import InvoiceListScreen from "../features/invoices/InvoiceListScreen.jsx";
import CustomerLedgerScreen from "../features/ledger/CustomerLedgerScreen.jsx";
import LedgerOverviewScreen from "../features/ledger/LedgerOverviewScreen.jsx";
import InventoryDetailScreen from "../features/inventory/InventoryDetailScreen.jsx";
import InventoryListScreen from "../features/inventory/InventoryListScreen.jsx";
import CategoriesScreen from "../features/master-data/CategoriesScreen.jsx";
import CustomerDetailScreen from "../features/master-data/CustomerDetailScreen.jsx";
import CustomersScreen from "../features/master-data/CustomersScreen.jsx";
import ProductsScreen from "../features/master-data/ProductsScreen.jsx";
import NotificationBell from "../features/notifications/NotificationBell.jsx";
import NotificationsProvider from "../features/notifications/NotificationsProvider.jsx";
import NotificationsScreen from "../features/notifications/NotificationsScreen.jsx";
import OperationalReportScreen from "../features/reports/OperationalReportScreen.jsx";
import RouteDetailScreen from "../features/routes/RouteDetailScreen.jsx";
import RoutesListScreen from "../features/routes/RoutesListScreen.jsx";
import RouteTemplateDetailScreen from "../features/route-templates/RouteTemplateDetailScreen.jsx";
import RouteTemplatesListScreen from "../features/route-templates/RouteTemplatesListScreen.jsx";
import ReceivablesReportScreen from "../features/reports/ReceivablesReportScreen.jsx";
import ReportsHomeScreen from "../features/reports/ReportsHomeScreen.jsx";
import StatementsReportScreen from "../features/reports/StatementsReportScreen.jsx";
import SettingsScreen from "../features/system/SettingsScreen.jsx";
import SettingsProvider from "../features/system/SettingsProvider.jsx";
import SubscriptionScreen from "../features/subscription/SubscriptionScreen.jsx";
import TransactionCreateScreen from "../features/transactions/TransactionCreateScreen.jsx";
import TransactionDetailScreen from "../features/transactions/TransactionDetailScreen.jsx";
import TransactionListScreen from "../features/transactions/TransactionListScreens.jsx";
import { appRoutes, findRoute } from "./routes.js";
import { useBrowserRoute } from "./useBrowserRoute.js";
import { useAuth } from "../features/auth/useAuth.js";

function AdminDashboardScreen({ navigate }) {
  return (
    <div className="resource-page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Platform Dashboard</h2>
          <p>Use the platform tools to manage billing and vendor subscription access.</p>
        </div>
        <div className="page-header-action">
          <button className="primary-button" onClick={() => navigate("/admin/vendors")} type="button">
            Manage Vendors
          </button>
          <button className="secondary-button" onClick={() => navigate("/admin/billing")} type="button">
            Open Admin Billing
          </button>
        </div>
      </section>
    </div>
  );
}

function VendorWorkspaceOnlyScreen() {
  return (
    <div className="resource-page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Vendor workspace</p>
          <h2>This section is available only for vendor workspaces.</h2>
          <p>Platform admins can use the admin navigation to manage SupplyLink.</p>
        </div>
      </section>
    </div>
  );
}

const screens = {
  "admin-dashboard": AdminDashboardScreen,
  "admin-vendors": AdminVendorsScreen,
  categories: CategoriesScreen,
  customers: CustomersScreen,
  "customer-detail": CustomerDetailScreen,
  dashboard: DashboardScreen,
  products: ProductsScreen,
  quotations: (props) => <TransactionListScreen kind="quotations" {...props} />,
  "quotation-new": (props) => <TransactionCreateScreen kind="quotations" {...props} />,
  "quotation-detail": (props) => <TransactionDetailScreen kind="quotations" {...props} />,
  orders: (props) => <TransactionListScreen kind="orders" {...props} />,
  "order-new": (props) => <TransactionCreateScreen kind="orders" {...props} />,
  "order-detail": (props) => <TransactionDetailScreen kind="orders" {...props} />,
  invoices: InvoiceListScreen,
  "invoice-new": InvoiceCreateScreen,
  "invoice-from-order": InvoiceCreateScreen,
  "invoice-detail": InvoiceDetailScreen,
  inventory: InventoryListScreen,
  "inventory-product": InventoryDetailScreen,
  routes: RoutesListScreen,
  "route-detail": RouteDetailScreen,
  "route-templates": RouteTemplatesListScreen,
  "route-template-detail": RouteTemplateDetailScreen,
  ledger: LedgerOverviewScreen,
  "customer-ledger": CustomerLedgerScreen,
  notifications: NotificationsScreen,
  reports: ReportsHomeScreen,
  "report-receivables": ReceivablesReportScreen,
  "report-invoices": (props) => <OperationalReportScreen kind="invoices" {...props} />,
  "report-payments": (props) => <OperationalReportScreen kind="payments" {...props} />,
  "report-orders": (props) => <OperationalReportScreen kind="orders" {...props} />,
  "report-statements": StatementsReportScreen,
  audit: AuditScreen,
  settings: SettingsScreen,
  subscription: SubscriptionScreen,
  "admin-billing": AdminBillingScreen,
  "audit-entity": (props) => (
    <EntityAuditScreen
      entityId={props.entityId}
      entityType={props.entityType}
      navigate={props.navigate}
    />
  )
};

function NotFoundScreen({ onGoHome }) {
  return (
    <div className="resource-page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Not found</p>
          <h2>This workspace page is not available</h2>
          <p>Use the navigation to continue working in SupplyLink.</p>
        </div>
        <div className="page-header-action">
          <button className="primary-button" onClick={onGoHome} type="button">
            Go to dashboard
          </button>
        </div>
      </section>
    </div>
  );
}

function AuthenticatedApp({ navigate, path }) {
  const { user } = useAuth();
  const route = findRoute(path);
  const ActiveScreen = route ? screens[route.id] : null;
  const isSuperAdmin = user?.roleCodes?.includes("super_admin");
  const isVendorRouteForPlatformAdmin = isSuperAdmin && route?.scope === "vendor";
  const isForbiddenPlatformRoute =
    route?.scope === "platform" &&
    !route.allowedRoles?.some((roleCode) => user?.roleCodes?.includes(roleCode));
  const navItems = appRoutes.filter((item) => {
    if (isSuperAdmin) {
      return item.scope === "platform";
    }

    if (item.scope === "platform") {
      return false;
    }

    return (
      !item.allowedRoles ||
      item.allowedRoles.some((roleCode) => user?.roleCodes?.includes(roleCode))
    );
  });

  useEffect(() => {
    if (isSuperAdmin && path === "/") {
      navigate("/admin", { replace: true });
    }
  }, [isSuperAdmin, navigate, path]);

  return (
    <ProtectedRoute>
      <SettingsProvider>
      <NotificationsProvider>
        <AppShell
          activePath={route?.navPath || route?.path || ""}
          headerExtras={isSuperAdmin ? null : <NotificationBell onNavigate={navigate} />}
          navItems={navItems}
          onNavigate={(nextPath) => navigate(nextPath)}
        >
          {isVendorRouteForPlatformAdmin ? (
            <VendorWorkspaceOnlyScreen />
          ) : isForbiddenPlatformRoute ? (
            <NotFoundScreen onGoHome={() => navigate("/dashboard", { replace: true })} />
          ) : ActiveScreen ? (
            <ActiveScreen
              entityId={route.params?.entityId}
              entityType={route.params?.entityType}
              id={route.params?.id}
              navigate={navigate}
              orderId={route.params?.orderId}
            />
          ) : (
            <NotFoundScreen onGoHome={() => navigate("/dashboard", { replace: true })} />
          )}
        </AppShell>
      </NotificationsProvider>
      </SettingsProvider>
    </ProtectedRoute>
  );
}

function App() {
  const { navigate, path } = useBrowserRoute();
  const route = findRoute(path);

  if (route?.id === "public-document") {
    return (
      <ToastProvider>
        <PublicDocumentScreen token={route.params?.token} />
      </ToastProvider>
    );
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <AuthenticatedApp navigate={navigate} path={path} />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
