import AppShell from "../components/layout/AppShell.jsx";
import { ToastProvider } from "../features/feedback/ToastProvider.jsx";
import AuthProvider from "../features/auth/AuthProvider.jsx";
import ProtectedRoute from "../features/auth/ProtectedRoute.jsx";
import DashboardScreen from "../features/dashboard/DashboardScreen.jsx";
import InvoiceDetailScreen from "../features/invoices/InvoiceDetailScreen.jsx";
import InvoiceListScreen from "../features/invoices/InvoiceListScreen.jsx";
import CategoriesScreen from "../features/master-data/CategoriesScreen.jsx";
import CustomersScreen from "../features/master-data/CustomersScreen.jsx";
import ProductsScreen from "../features/master-data/ProductsScreen.jsx";
import TransactionCreateScreen from "../features/transactions/TransactionCreateScreen.jsx";
import TransactionDetailScreen from "../features/transactions/TransactionDetailScreen.jsx";
import TransactionListScreen from "../features/transactions/TransactionListScreens.jsx";
import { appRoutes, findRoute } from "./routes.js";
import { useBrowserRoute } from "./useBrowserRoute.js";

const screens = {
  categories: CategoriesScreen,
  customers: CustomersScreen,
  dashboard: DashboardScreen,
  products: ProductsScreen,
  quotations: (props) => <TransactionListScreen kind="quotations" {...props} />,
  "quotation-new": (props) => <TransactionCreateScreen kind="quotations" {...props} />,
  "quotation-detail": (props) => <TransactionDetailScreen kind="quotations" {...props} />,
  orders: (props) => <TransactionListScreen kind="orders" {...props} />,
  "order-new": (props) => <TransactionCreateScreen kind="orders" {...props} />,
  "order-detail": (props) => <TransactionDetailScreen kind="orders" {...props} />,
  invoices: InvoiceListScreen,
  "invoice-detail": InvoiceDetailScreen
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

function AuthenticatedApp() {
  const { navigate, path } = useBrowserRoute();
  const route = findRoute(path);
  const ActiveScreen = route ? screens[route.id] : null;

  return (
    <ProtectedRoute>
      <AppShell
        activePath={route?.navPath || route?.path || ""}
        navItems={appRoutes}
        onNavigate={(nextPath) => navigate(nextPath)}
      >
        {ActiveScreen ? (
          <ActiveScreen id={route.params?.id} navigate={navigate} />
        ) : (
          <NotFoundScreen onGoHome={() => navigate("/dashboard", { replace: true })} />
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthenticatedApp />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
