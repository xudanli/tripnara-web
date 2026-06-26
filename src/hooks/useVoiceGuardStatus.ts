import { useCallback, useEffect, useState } from 'react';
import { processFairnessApi } from '@/api/process-fairness';
import type { VoiceGuardStatus } from '@/types/process-fairness';

export function useVoiceGuardStatus(tripId: string | undefined, options?: { enabled?: boolean }) {
  const [status, setStatus] = useState<VoiceGuardStatus | null>(null);
  const [loading, setLoading] = useState(Boolean(tripId));
  const enabled = options?.enabled !== false;

  const reload = useCallback(async () => {
    if (!tripId) {
      setStatus(null);
      return null;
    }
    try {
      setLoading(true);
      const data = await processFairnessApi.getVoiceGuardStatus(tripId);
      setStatus(data);
      return data;
    } catch {
      setStatus(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (!enabled || !tripId) {
      setStatus(null);
      setLoading(false);
      return;
    }
    void reload();
  }, [enabled, tripId, reload]);

  return { status, loading, reload };
}
