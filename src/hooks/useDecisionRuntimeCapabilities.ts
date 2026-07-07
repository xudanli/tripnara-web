import { useEffect, useState } from 'react';
import {
  getDecisionRuntimeCapabilitiesSnapshot,
  prefetchDecisionRuntimeCapabilities,
} from '@/lib/decision-runtime-capabilities.store';
import type { DecisionRuntimeCapabilitiesSnapshot } from '@/types/decision-runtime-capabilities';

export function useDecisionRuntimeCapabilities(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;
  const [capabilities, setCapabilities] = useState<DecisionRuntimeCapabilitiesSnapshot>(() =>
    getDecisionRuntimeCapabilitiesSnapshot(),
  );

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void prefetchDecisionRuntimeCapabilities().then((next) => {
      if (!cancelled) setCapabilities(next);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return capabilities;
}
