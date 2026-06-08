import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getHikePlanStoragePreference,
  resolveHikePlanStorageMode,
  setHikePlanStoragePreference,
  type HikePlanStorageMode,
} from '@/lib/hike-plan-storage';

const CHANGE_EVENT = 'tripnara-hike-plan-storage-change';

function subscribe(listener: () => void) {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

function getSnapshot() {
  return getHikePlanStoragePreference();
}

export function useHikePlanStorage() {
  const { isAuthenticated } = useAuth();
  const preference = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const mode = useMemo(
    () => resolveHikePlanStorageMode(isAuthenticated),
    [isAuthenticated, preference]
  );

  const setMode = useCallback((next: HikePlanStorageMode) => {
    setHikePlanStoragePreference(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const clearPreference = useCallback(() => {
    setHikePlanStoragePreference(null);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return {
    mode,
    preference,
    isApiMode: mode === 'api',
    isLocalMode: mode === 'local',
    isAuthenticated,
    setMode,
    clearPreference,
  };
}
