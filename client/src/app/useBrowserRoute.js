import { useCallback, useEffect, useState } from "react";
import { normalizePath } from "./routes.js";

function getCurrentPath() {
  return normalizePath(window.location.pathname);
}

function useBrowserRoute() {
  const [path, setPath] = useState(getCurrentPath);

  useEffect(() => {
    const normalizedPath = getCurrentPath();

    if (window.location.pathname !== normalizedPath) {
      window.history.replaceState({}, "", normalizedPath);
    }

    function handlePopState() {
      setPath(getCurrentPath());
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const navigate = useCallback((nextPath, options = {}) => {
    const normalizedPath = normalizePath(nextPath);

    if (window.location.pathname === normalizedPath) {
      setPath(normalizedPath);
      return;
    }

    if (options.replace) {
      window.history.replaceState({}, "", normalizedPath);
    } else {
      window.history.pushState({}, "", normalizedPath);
    }

    setPath(normalizedPath);
  }, []);

  return {
    navigate,
    path
  };
}

export { useBrowserRoute };
