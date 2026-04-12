import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUser, loginUser } from "../../services/authApi.js";
import { getStoredToken, setStoredToken } from "../../services/httpClient.js";
import AuthContext from "./authContext.js";

let currentUserRequest = null;
let currentUserRequestToken = null;

function getCurrentUserForToken(token) {
  if (currentUserRequest && currentUserRequestToken === token) {
    return currentUserRequest;
  }

  currentUserRequestToken = token;
  currentUserRequest = getCurrentUser({ token }).finally(() => {
    currentUserRequest = null;
    currentUserRequestToken = null;
  });

  return currentUserRequest;
}

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  const refreshCurrentUser = useCallback(async () => {
    const storedToken = getStoredToken();

    if (!storedToken) {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);

    try {
      const response = await getCurrentUserForToken(storedToken);
      setUser(response.data);
      setError("");
      return response.data;
    } catch (requestError) {
      setStoredToken(null);
      setToken(null);
      setUser(null);
      setError(
        requestError instanceof Error ? requestError.message : "Your session could not be loaded."
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCurrentUser();
  }, [refreshCurrentUser]);

  const login = useCallback(
    async ({ email, password, vendorId }) => {
      setError("");

      const response = await loginUser({ email, password, vendorId });
      setStoredToken(response.data.accessToken);
      setToken(response.data.accessToken);
      setUser(response.data.user);
      setError("");

      return response.data.user;
    },
    []
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
    setError("");
  }, []);

  const value = useMemo(
    () => ({
      error,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      logout,
      refreshCurrentUser,
      token,
      user
    }),
    [error, isLoading, login, logout, refreshCurrentUser, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
