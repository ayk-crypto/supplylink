import { useAuth } from "./useAuth.js";
import LoginScreen from "./LoginScreen.jsx";

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="loading-screen">
        <div className="loading-mark" />
        <p>Loading your workspace...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return children;
}

export default ProtectedRoute;
