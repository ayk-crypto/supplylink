import { createContext, useContext } from "react";

const NotificationsCenterContext = createContext(null);

function useNotificationsCenter() {
  const context = useContext(NotificationsCenterContext);

  if (!context) {
    throw new Error("useNotificationsCenter must be used within NotificationsProvider");
  }

  return context;
}

export { NotificationsCenterContext, useNotificationsCenter };
