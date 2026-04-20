import { useCallback, useMemo, useState } from "react";
import { ToastContext } from "./toastContext.js";

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, title, tone = "success" }) => {
      const id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

      setToasts((current) => [
        ...current,
        {
          id,
          message,
          title,
          tone
        }
      ]);

      window.setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({
      dismissToast,
      showToast
    }),
    [dismissToast, showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="toast-region">
        {toasts.map((toast) => (
          <div className={`toast-card ${toast.tone}`} key={toast.id} role="status">
            <div>
              <strong>{toast.title}</strong>
              {toast.message ? <span>{toast.message}</span> : null}
            </div>
            <button
              aria-label="Dismiss notification"
              onClick={() => dismissToast(toast.id)}
              type="button"
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export { ToastProvider };
