import AppShell from "../components/layout/AppShell.jsx";
import { ToastProvider } from "../features/feedback/ToastProvider.jsx";
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
import TransactionCreateScreen from "../features/transactions/TransactionCreateScreen.jsx";
import TransactionDetailScreen from "../features/transactions/TransactionDetailScreen.jsx";
import TransactionListScreen from "../features/transactions/TransactionListScreens.jsx";
import { appRoutes, findRoute } from "./routes.js";
import { useBrowserRoute } from "./useBrowserRoute.js";

const screens = {
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
  const route = findRoute(path);
  const ActiveScreen = route ? screens[route.id] : null;

  return (
    <ProtectedRoute>
      <SettingsProvider>
      <NotificationsProvider>
        <AppShell
          activePath={route?.navPath || route?.path || ""}
          headerExtras={<NotificationBell onNavigate={navigate} />}
          navItems={appRoutes}
          onNavigate={(nextPath) => navigate(nextPath)}
        >
          {ActiveScreen ? (
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
