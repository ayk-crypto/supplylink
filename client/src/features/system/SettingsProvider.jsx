import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSettings, updateSettings } from "../../services/settingsApi.js";
import { useAuth } from "../auth/useAuth.js";
import { AppSettingsContext } from "./settingsContext.js";
import {
  DEFAULT_SETTINGS,
  clearLegacySettings,
  mergeSettings,
  readLegacySettings,
  stripServerManagedBranding
} from "./settingsDefaults.js";

function extractSettings(response) {
  if (!response || typeof response !== "object") {
    return null;
  }

  if (response.data && typeof response.data === "object") {
    return response.data;
  }

  return response;
}

function SettingsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState("");
  const isMountedRef = useRef(true);
  const legacyMigrationDoneRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(
    async (options = {}) => {
      if (!isAuthenticated) {
        return DEFAULT_SETTINGS;
      }

      if (isMountedRef.current) {
        setIsLoading(true);
        setError("");
      }

      try {
        const response = await getSettings(options);
        const payload = extractSettings(response);
        const legacy = legacyMigrationDoneRef.current ? null : readLegacySettings();
        const merged = mergeSettings(DEFAULT_SETTINGS, payload, legacy);

        if (legacy && !legacyMigrationDoneRef.current) {
          try {
            await updateSettings(stripServerManagedBranding(merged));
            clearLegacySettings();
          } catch {
            // best-effort: keep legacy values in memory; will retry on next save
          } finally {
            legacyMigrationDoneRef.current = true;
          }
        }

        if (isMountedRef.current) {
          setSettings(merged);
          setIsHydrated(true);
        }

        return merged;
      } catch (requestError) {
        if (requestError?.name === "AbortError") {
          return settings;
        }

        const legacy = readLegacySettings();
        const fallback = mergeSettings(DEFAULT_SETTINGS, legacy);

        if (isMountedRef.current) {
          setSettings(fallback);
          setIsHydrated(true);
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Settings could not be loaded."
          );
        }

        return fallback;
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [isAuthenticated, settings]
  );

  const save = useCallback(async (nextSettings) => {
    const payload = mergeSettings(DEFAULT_SETTINGS, nextSettings);
    const response = await updateSettings(payload);
    const persisted = extractSettings(response);
    const merged = mergeSettings(DEFAULT_SETTINGS, persisted ?? payload);

    if (isMountedRef.current) {
      setSettings(merged);
      setIsHydrated(true);
    }

    if (!legacyMigrationDoneRef.current) {
      clearLegacySettings();
      legacyMigrationDoneRef.current = true;
    }

    return merged;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setSettings(DEFAULT_SETTINGS);
      setIsHydrated(false);
      setError("");
      legacyMigrationDoneRef.current = false;
      return undefined;
    }

    const controller = new AbortController();
    refresh({ signal: controller.signal });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      error,
      isHydrated,
      isLoading,
      refresh,
      save,
      settings
    }),
    [error, isHydrated, isLoading, refresh, save, settings]
  );

  return (
    <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
  );
}

export default SettingsProvider;
