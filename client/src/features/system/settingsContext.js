import { createContext, useContext } from "react";
import { DEFAULT_SETTINGS } from "./settingsDefaults.js";

const AppSettingsContext = createContext({
  error: "",
  isHydrated: false,
  isLoading: false,
  refresh: async () => DEFAULT_SETTINGS,
  save: async () => DEFAULT_SETTINGS,
  settings: DEFAULT_SETTINGS
});

function useAppSettings() {
  return useContext(AppSettingsContext);
}

export { AppSettingsContext, useAppSettings };
