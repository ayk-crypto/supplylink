import { useEffect, useState } from "react";
import { getSystemOverview } from "../../services/systemApi.js";

const defaultOverview = {
  app: {
    name: "SupplyLink API",
    version: "loading",
    environment: "unknown"
  },
  api: {
    basePath: "/api/v1",
    version: "v1"
  },
  database: {
    enabled: false,
    connected: false,
    timestamp: null
  },
  roles: {
    platform: [],
    vendor: []
  },
  tenancy: {
    scopes: [],
    headers: {},
    principle: ""
  },
  modules: []
};

function useSystemOverview() {
  const [overview, setOverview] = useState(defaultOverview);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      try {
        const response = await getSystemOverview();

        if (!active) {
          return;
        }

        setOverview(response.data);
        setError("");
      } catch (requestError) {
        if (!active) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load the system overview."
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadOverview();

    return () => {
      active = false;
    };
  }, []);

  return {
    overview,
    error,
    isLoading
  };
}

export { useSystemOverview };
