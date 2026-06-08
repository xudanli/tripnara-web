import { useCallback, useEffect, useState } from 'react';
import { hikePlanRepository } from '@/services/hike-plan-repository';
import type { HikePlanRecord } from '@/types/hike-plan';

export function useHikePlan(hikePlanId: string | undefined) {
  const [plan, setPlan] = useState<HikePlanRecord | null>(null);
  const [loading, setLoading] = useState(Boolean(hikePlanId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!hikePlanId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await hikePlanRepository.getById(hikePlanId);
      setPlan(data);
    } catch (e) {
      setError((e as Error).message);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [hikePlanId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { plan, loading, error, refresh, setPlan };
}
