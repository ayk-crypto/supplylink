import { useEffect, useState } from "react";
import { getApiErrorMessage } from "./resourceUtils.js";

function useResourceDirectory(loadDirectory, query, options = {}) {
  const { onError } = options;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const response = await loadDirectory(query, { signal: controller.signal });

        if (!active) {
          return;
        }

        setData(response.data);
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        setError(getApiErrorMessage(requestError, "This list could not be loaded."));
        onError?.(requestError);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [loadDirectory, onError, query, reloadKey]);

  return {
    data,
    error,
    isLoading,
    reload: () => setReloadKey((value) => value + 1)
  };
}

export { useResourceDirectory };
