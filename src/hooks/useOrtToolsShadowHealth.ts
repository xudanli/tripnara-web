import { useEffect, useState } from 'react';
import {
  getOrtToolsShadowHealthSnapshot,
  prefetchOrtToolsShadowHealth,
} from '@/lib/ortools-shadow.store';
import type { OrtToolsShadowHealthSnapshot } from '@/types/ortools-shadow';

/** Decision / Arrange 进入时探活；结果缓存见 ortools-shadow.store TTL */
export function useOrtToolsShadowHealth(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;
  const [health, setHealth] = useState<OrtToolsShadowHealthSnapshot>(() =>
    getOrtToolsShadowHealthSnapshot(),
  );

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void prefetchOrtToolsShadowHealth().then((next) => {
      if (!cancelled) setHealth(next);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return health;
}
