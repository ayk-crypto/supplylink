import { useState } from "react";
import { useAuth } from "../../features/auth/useAuth.js";

const navItems = [
  "Dashboard",
  "Customers",
  "Catalog",
  "Quotations",
  "Orders",
  "Invoices",
  "Payments",
  "Routes",
  "Reports"
];

function AppShell({ children }) {
  const { logout, user } = useAuth();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const activeVendor = user?.memberships?.find((membership) => membership.vendorId === user.currentVendorId);
  const roleLabel = user?.roleCodes?.join(", ") || "Team member";

  return (
    <div className="app-layout">
      <aside className={`sidebar ${isNavOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <span className="brand-mark">SL</span>
          <div>
            <strong>SupplyLink</strong>
            <small>Operations console</small>
          </div>
        </div>

        <nav className="side-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a
              className={item === "Dashboard" ? "active" : ""}
              href="/"
              key={item}
              onClick={(event) => {
                event.preventDefault();
                setIsNavOpen(false);
              }}
            >
              {item}
            </a>
          ))}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button
            aria-label="Toggle navigation"
            className="nav-toggle"
            onClick={() => setIsNavOpen((value) => !value)}
            type="button"
          >
            Menu
          </button>

          <div>
            <p className="eyebrow">Workspace</p>
            <h1>{activeVendor?.vendorDisplayName || user?.currentVendorId || "SupplyLink"}</h1>
          </div>

          <div className="session-chip">
            <div>
              <strong>{user?.fullName}</strong>
              <span>{roleLabel}</span>
            </div>
            <button onClick={logout} type="button">
              Logout
            </button>
          </div>
        </header>

        <main className="workspace-content">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
