import { useState } from "react";
import { useAuth } from "./useAuth.js";

function getLoginErrorMessage(error) {
  if (!(error instanceof Error)) {
    return "Unable to sign in. Check your email and password.";
  }

  if (error.status === 401 || error.status === 400) {
    return "The email or password you entered is not correct.";
  }

  if (error.status === 403) {
    return error.message || "This account cannot access the selected workspace.";
  }

  if (error.status === 422) {
    return "Check the sign-in details and try again.";
  }

  return error.message || "Unable to sign in. Check your email and password.";
}

function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [showVendorId, setShowVendorId] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function clearError() {
    if (error) {
      setError("");
    }
  }

  function toggleVendorId() {
    setShowVendorId((current) => {
      const next = !current;
      if (!next) {
        setVendorId("");
      }
      return next;
    });
    clearError();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({ email, password, vendorId: vendorId || null });
    } catch (requestError) {
      setError(getLoginErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page auth-page-v2">
      <section className="auth-visual" aria-label="SupplyLink workspace">
        <img
          src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80"
          alt="Warehouse shelves with prepared supply boxes"
        />
        <div className="auth-visual-copy">
          <h1>SupplyLink</h1>
          <p>
            Orders, invoices, inventory and receivables — managed in one secure workspace.
          </p>
        </div>
      </section>

      <section className="auth-panel" aria-label="Sign in">
        <div className="auth-panel-card">
          <header className="auth-panel-head">
            <p className="eyebrow">Secure access</p>
            <h2>Welcome back</h2>
            <p className="muted">Sign in to manage your SupplyLink workspace.</p>
          </header>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <label className="auth-field">
              <span className="auth-field-label">Email</span>
              <input
                autoComplete="email"
                inputMode="email"
                onChange={(event) => {
                  clearError();
                  setEmail(event.target.value);
                }}
                placeholder="you@company.com"
                required
                type="email"
                value={email}
              />
            </label>

            <label className="auth-field">
              <span className="auth-field-label">Password</span>
              <input
                autoComplete="current-password"
                onChange={(event) => {
                  clearError();
                  setPassword(event.target.value);
                }}
                placeholder="Enter your password"
                required
                type="password"
                value={password}
              />
            </label>

            <div className="auth-vendor-toggle">
              <button
                type="button"
                className="auth-link-button"
                aria-expanded={showVendorId}
                aria-controls="auth-vendor-id-field"
                onClick={toggleVendorId}
              >
                <span className="auth-toggle-icon" aria-hidden="true">
                  {showVendorId ? "−" : "+"}
                </span>
                {showVendorId ? "Hide Vendor ID" : "Use Vendor ID (advanced)"}
              </button>
              <small>Only required if your account has access to multiple workspaces.</small>
            </div>

            {showVendorId ? (
              <label className="auth-field" id="auth-vendor-id-field">
                <span className="auth-field-label">Vendor ID</span>
                <input
                  autoComplete="off"
                  onChange={(event) => {
                    clearError();
                    setVendorId(event.target.value);
                  }}
                  placeholder="e.g. acme-distribution"
                  type="text"
                  value={vendorId}
                />
              </label>
            ) : null}

            {error ? (
              <div className="form-error" role="alert">
                <strong>Sign-in failed</strong>
                <span>{error}</span>
              </div>
            ) : null}

            <button className="primary-button auth-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <footer className="auth-footer-helper">
            Need access? Contact your workspace administrator.
          </footer>
        </div>
      </section>
    </main>
  );
}

export default LoginScreen;
