import { useState } from "react";
import { useAuth } from "../../features/auth/useAuth.js";
import { useAppSettings } from "../../features/system/settingsContext.js";

function getInitials(value, fallback = "SL") {
  if (typeof value !== "string") {
    return fallback;
  }

  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return fallback;
  }

  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

function AppShell({
  activePath = "/dashboard",
  children,
  headerExtras = null,
  navItems = [],
  onNavigate
}) {
  const { logout, user } = useAuth();
  useAppSettings();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const activeVendor = user?.memberships?.find(
    (membership) => membership.vendorId === user.currentVendorId
  );
  const roleLabel = user?.roleCodes?.join(", ") || "Team member";
  const vendorName = activeVendor?.vendorDisplayName || "Selected workspace";
  const vendorSlug = activeVendor?.vendorSlug || user?.currentVendorId || "No workspace selected";
  const userInitials = getInitials(user?.fullName, "SL");

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
            <span aria-label="SupplyLink" className="brand-mark">
              SL
            </span>
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
          <span>Current workspace</span>
          <strong>{vendorName}</strong>
          <small>{vendorSlug}</small>
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
              <span>{item.label}</span>
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

          <div className="workspace-title-block">
            <p className="eyebrow">Workspace</p>
            <h1>{vendorName}</h1>
            <p className="workspace-subtitle">{vendorSlug}</p>
          </div>

          <div className="topbar-actions">
            {headerExtras}
            <div className="session-chip">
              <span className="session-chip-avatar" aria-hidden="true">
                {userInitials}
              </span>
              <div className="session-chip-body">
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
