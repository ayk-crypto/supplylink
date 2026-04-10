import FoundationHero from "../components/dashboard/FoundationHero.jsx";
import FoundationMetrics from "../components/dashboard/FoundationMetrics.jsx";
import ModuleGrid from "../components/dashboard/ModuleGrid.jsx";
import OverviewStatusCard from "../components/dashboard/OverviewStatusCard.jsx";
import TenancyPanel from "../components/dashboard/TenancyPanel.jsx";
import { useSystemOverview } from "../features/system/useSystemOverview.js";

function App() {
  const { overview, error, isLoading } = useSystemOverview();

  return (
    <main className="app-shell">
      <header className="foundation-header">
        <FoundationHero />
      </header>

      <OverviewStatusCard overview={overview} error={error} isLoading={isLoading} />

      <section className="dashboard-grid">
        <div className="stacked-panels">
          <FoundationMetrics overview={overview} />
          <TenancyPanel tenancy={overview.tenancy} />
        </div>
        <ModuleGrid modules={overview.modules} />
      </section>

      <p className="footer-note">
        The UI is intentionally minimal here: it is acting as a living overview
        of the shared architecture foundation rather than shipping business
        modules too early.
      </p>
    </main>
  );
}

export default App;
