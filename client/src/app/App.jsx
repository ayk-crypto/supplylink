import AppShell from "../components/layout/AppShell.jsx";
import AuthProvider from "../features/auth/AuthProvider.jsx";
import ProtectedRoute from "../features/auth/ProtectedRoute.jsx";
import DashboardScreen from "../features/dashboard/DashboardScreen.jsx";

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AppShell>
          <DashboardScreen />
        </AppShell>
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;
