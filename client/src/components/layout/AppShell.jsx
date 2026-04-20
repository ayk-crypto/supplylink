import { useState } from "react";
import { useAuth } from "../../features/auth/useAuth.js";

function AppShell({
  activePath = "/dashboard",
  children,
  headerExtras = null,
  navItems = [],
  onNavigate
}) {
  const { logout, user } = useAuth();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const activeVendor = user?.memberships?.find(
    (membership) => membership.vendorId === user.currentVendorId
  );
  const roleLabel = user?.roleCodes?.join(", ") || "Team member";

  return (
    <div className="app-layout">
      {isNavOpen ? (
        <button
          aria-label="Close navigation overlay"
          className="sidebar-backdrop"
          onClick={() => setIsNavOpen(false)}
          type="button"
        />
      ) : null}

      <aside className={`sidebar ${isNavOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="brand-lockup">
            <span className="brand-mark">SL</span>
            <div>
              <strong>SupplyLink</strong>
              <small>Operations console</small>
            </div>
          </div>
          <button
            aria-label="Close navigation"
            className="sidebar-close"
            onClick={() => setIsNavOpen(false)}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="sidebar-vendor">
          <span>Current vendor</span>
          <strong>{activeVendor?.vendorDisplayName || "Selected workspace"}</strong>
          <small>{activeVendor?.vendorSlug || user?.currentVendorId}</small>
        </div>

        <nav className="side-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <button
              className={item.path === activePath ? "active" : ""}
              key={item.id}
              onClick={(event) => {
                event.preventDefault();
                onNavigate?.(item.path);
                setIsNavOpen(false);
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button
            aria-expanded={isNavOpen}
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

          <div className="topbar-actions">
            {headerExtras}
            <div className="session-chip">
              <div>
                <strong>{user?.fullName}</strong>
                <span>{roleLabel}</span>
              </div>
              <button onClick={logout} type="button">
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="workspace-content">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
