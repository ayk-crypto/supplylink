import { useEffect, useState } from "react";
import StatusCard from "./components/StatusCard";
import { getApiStatus } from "./services/api";

const defaultStatus = {
  name: "SupplyLink API",
  version: "loading",
  message: "Connecting to backend...",
  environment: "unknown",
  database: {
    enabled: false,
    connected: false,
    timestamp: null
  }
};

function App() {
  const [status, setStatus] = useState(defaultStatus);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      try {
        const data = await getApiStatus();

        if (!active) {
          return;
        }

        setStatus(data);
        setError("");
      } catch (requestError) {
        if (!active) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to connect to the backend."
        );
      }
    }

    loadStatus();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="eyebrow">SupplyLink</div>
        <h1>Production-ready SaaS starter for supply chain workflows.</h1>
        <p className="hero-copy">
          React on the frontend, Express on the backend, and PostgreSQL-ready
          infrastructure underneath. This baseline is structured for growth and
          already wired end to end.
        </p>
      </section>

      <StatusCard status={status} error={error} />
    </main>
  );
}

export default App;
