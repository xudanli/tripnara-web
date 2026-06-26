import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { tripDomainInfluenceApi } from '@/api/trip-domain-influence';
import type {
  CreateDomainClaimRequest,
  DomainInfluenceItem,
  DomainInfluenceSnapshot,
  DomainRecommendation,
  DomainWorkbenchSidebar,
  EndorseDomainClaimRequest,
  TripDomain,
  UpdateDomainWeightsRequest,
} from '@/types/trip-domain-influence';

export function useTripDomainInfluence(tripId: string | null | undefined) {
  const [snapshot, setSnapshot] = useState<DomainInfluenceSnapshot | null>(null);
  const [recommendations, setRecommendations] = useState<DomainRecommendation[]>([]);
  const [loading, setLoading] = useState(!!tripId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      setLoadError(null);
      const [snap, recs] = await Promise.all([
        tripDomainInfluenceApi.getSnapshot(tripId),
        tripDomainInfluenceApi.getRecommendations(tripId).catch(() => ({ items: [] })),
      ]);
      setSnapshot(snap);
      setRecommendations(recs.items);
    } catch (e) {
      const message = (e as Error).message ?? '加载领域影响力失败';
      setLoadError(message);
      setSnapshot(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const patchDomain = useCallback((domain: DomainInfluenceItem) => {
    setSnapshot((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        domains: prev.domains.map((d) => (d.domain === domain.domain ? domain : d)),
      };
    });
  }, []);

  const claimDomain = useCallback(
    async (body: CreateDomainClaimRequest) => {
      if (!tripId) return;
      setSubmitting(true);
      try {
        const updated = await tripDomainInfluenceApi.createOrUpdateClaim(tripId, body);
        patchDomain(updated);
        toast.success('已更新领域认领');
        void reload();
        return updated;
      } catch (e) {
        toast.error((e as Error).message);
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [tripId, patchDomain, reload],
  );

  const withdrawClaim = useCallback(
    async (claimId: string) => {
      if (!tripId) return;
      setSubmitting(true);
      try {
        await tripDomainInfluenceApi.withdrawClaim(tripId, claimId);
        toast.message('已撤回认领');
        void reload();
      } catch (e) {
        toast.error((e as Error).message);
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [tripId, reload],
  );

  const endorseClaim = useCallback(
    async (body: EndorseDomainClaimRequest) => {
      if (!tripId) return;
      setSubmitting(true);
      try {
        await tripDomainInfluenceApi.endorseClaim(tripId, body);
        toast.success('已表示认可');
        void reload();
      } catch (e) {
        toast.error((e as Error).message);
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [tripId, reload],
  );

  const updateWeights = useCallback(
    async (body: UpdateDomainWeightsRequest) => {
      if (!tripId) return;
      setSubmitting(true);
      try {
        const updated = await tripDomainInfluenceApi.updateWeights(tripId, {
          ...body,
          source: 'negotiation',
        });
        patchDomain(updated);
        toast.success('权重已更新');
        void reload();
        return updated;
      } catch (e) {
        toast.error((e as Error).message);
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [tripId, patchDomain, reload],
  );

  const confirmRules = useCallback(
    async (note?: string) => {
      if (!tripId) return;
      setSubmitting(true);
      try {
        const res = await tripDomainInfluenceApi.confirmRules(tripId, note ? { note } : undefined);
        setSnapshot((prev) =>
          prev
            ? { ...prev, rulesConfirmed: true, rulesConfirmedAt: res.confirmedAt }
            : prev,
        );
        toast.success('已确认决策规则');
        void reload();
        return res;
      } catch (e) {
        toast.error((e as Error).message);
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [tripId, reload],
  );

  return {
    snapshot,
    recommendations,
    loading,
    loadError,
    submitting,
    reload,
    claimDomain,
    withdrawClaim,
    endorseClaim,
    updateWeights,
    confirmRules,
  };
}

export function useDomainWorkbenchBreakdown(tripId: string | null | undefined) {
  const [breakdown, setBreakdown] = useState<DomainWorkbenchSidebar | null>(null);
  const [loading, setLoading] = useState(!!tripId);

  const reload = useCallback(async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const data = await tripDomainInfluenceApi.getDomainBreakdown(tripId).catch(() =>
        tripDomainInfluenceApi.getWorkbenchSidebar(tripId),
      );
      setBreakdown(data);
    } catch {
      setBreakdown(null);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { breakdown, loading, reload };
}

export function useDomainDecisionBrief(tripId: string, domain: TripDomain | null) {
  const [brief, setBrief] = useState<Awaited<ReturnType<typeof tripDomainInfluenceApi.getDecisionBrief>> | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!tripId || !domain) return;
    try {
      setLoading(true);
      const data = await tripDomainInfluenceApi.getDecisionBrief(tripId, domain);
      setBrief(data);
    } catch {
      setBrief(null);
    } finally {
      setLoading(false);
    }
  }, [tripId, domain]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { brief, loading, reload };
}
