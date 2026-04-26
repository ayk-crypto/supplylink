import { useMemo, useState } from "react";
import { navGroupOrder } from "../../app/routes.js";
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

function groupNavItems(items) {
  const buckets = new Map();

  items.forEach((item) => {
    const groupId = item.group || "overview";

    if (!buckets.has(groupId)) {
      buckets.set(groupId, []);
    }

    buckets.get(groupId).push(item);
  });

  const ordered = [];

  navGroupOrder.forEach((group) => {
    if (buckets.has(group.id)) {
      ordered.push({ ...group, items: buckets.get(group.id) });
      buckets.delete(group.id);
    }
  });

  buckets.forEach((items, id) => {
    ordered.push({ id, label: id.charAt(0).toUpperCase() + id.slice(1), items });
  });

  return ordered;
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
  const isSuperAdmin = user?.roleCodes?.includes("super_admin") || false;
  const vendorName = activeVendor?.vendorDisplayName || (isSuperAdmin ? "Platform overview" : "Selected workspace");
  const realVendorSlug = activeVendor?.vendorSlug || user?.currentVendorId || null;
  const workspaceLabel = isSuperAdmin ? "Role" : "Current workspace";
  const sidebarSubLabel = realVendorSlug || (isSuperAdmin ? "Super admin" : null);
  const userInitials = getInitials(user?.fullName, "SL");
  const navGroups = useMemo(() => groupNavItems(navItems), [navItems]);
  const activeNavItem = navItems.find((item) => item.path === activePath);

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
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="sidebar-vendor">
          <span>{workspaceLabel}</span>
          <strong>{vendorName}</strong>
          {sidebarSubLabel ? <small>{sidebarSubLabel}</small> : null}
        </div>

        <nav className="side-nav" aria-label="Primary navigation">
          {navGroups.map((group) => (
            <div className="side-nav-group" key={group.id}>
              <p className="side-nav-group-label">{group.label}</p>
              {group.items.map((item) => (
                <button
                  className={`side-nav-item nav-group-${group.id} ${item.path === activePath ? "active" : ""}`}
                  key={item.id}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate?.(item.path);
                    setIsNavOpen(false);
                  }}
                  type="button"
                >
                  <span aria-hidden="true" className="side-nav-bullet" />
                  <span className="side-nav-label">{item.label}</span>
                </button>
              ))}
            </div>
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
            <span aria-hidden="true" className="nav-toggle-icon">
              <span />
              <span />
              <span />
            </span>
            <span className="nav-toggle-label">Menu</span>
          </button>

          <div className="workspace-title-block">
            <p className="eyebrow">{activeNavItem ? activeNavItem.label : "Workspace"}</p>
            <h1>{vendorName}</h1>
            {realVendorSlug ? <p className="workspace-subtitle">{realVendorSlug}</p> : null}
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
              <button
                aria-label="Sign out"
                className="session-chip-logout"
                onClick={logout}
                type="button"
              >
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
