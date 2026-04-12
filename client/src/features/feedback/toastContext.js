import { createContext, useContext } from "react";

const ToastContext = createContext(null);

function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}

export { ToastContext, useToast };
