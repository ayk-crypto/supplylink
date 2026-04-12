import { useState } from "react";
import { useAuth } from "./useAuth.js";

function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({ email, password, vendorId: vendorId || null });
      window.history.replaceState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual" aria-label="SupplyLink workspace">
        <img
          src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80"
          alt="Warehouse shelves with prepared supply boxes"
        />
        <div className="auth-visual-copy">
          <span>SupplyLink</span>
          <h1>Run orders, invoices, routes, and receivables from one tenant-safe workspace.</h1>
        </div>
      </section>

      <section className="auth-panel" aria-label="Sign in">
        <div>
          <p className="eyebrow">Secure access</p>
          <h2>Welcome back</h2>
          <p className="muted">Sign in with your SupplyLink account to open the dashboard.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vendor.admin@supplylink.local"
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            Password
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password123!"
              required
              type="password"
              value={password}
            />
          </label>

          <label>
            Vendor ID
            <input
              onChange={(event) => setVendorId(event.target.value)}
              placeholder="Optional when your account has one active vendor"
              type="text"
              value={vendorId}
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginScreen;
