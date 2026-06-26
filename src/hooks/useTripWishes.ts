import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { tripWishesApi } from '@/api/trip-wishes';
import type {
  CreateWishFromInspirationRequest,
  CreateWishFromVoiceRequest,
  CreateWishRequest,
  TeamWishItem,
  TripWishItem,
  UpdateWishRequest,
  WishCategory,
  WishSummary,
  WishVisibility,
} from '@/types/trip-wishes';

export function useTripWishSummary(tripId: string | null | undefined) {
  const [summary, setSummary] = useState<WishSummary | null>(null);
  const [loading, setLoading] = useState(!!tripId);

  const reload = useCallback(async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const data = await tripWishesApi.getWorkbenchSummary(tripId);
      setSummary(data);
    } catch {
      try {
        const data = await tripWishesApi.getSummary(tripId);
        setSummary(data);
      } catch {
        setSummary(null);
      }
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { summary, loading, reload };
}

export function useTripWishes(tripId: string) {
  const [mine, setMine] = useState<TripWishItem[]>([]);
  const [team, setTeam] = useState<TeamWishItem[]>([]);
  const [summary, setSummary] = useState<WishSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const [mineRes, teamRes, summaryRes] = await Promise.all([
        tripWishesApi.getMine(tripId),
        tripWishesApi.getTeam(tripId),
        tripWishesApi.getSummary(tripId).catch(() => null),
      ]);
      setMine(mineRes.items);
      setTeam(teamRes.items);
      setSummary(summaryRes);
    } catch (e) {
      toast.error((e as Error).message ?? '加载愿望单失败');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const notifyCreated = (wish: TripWishItem) => {
    setMine((prev) => [wish, ...prev.filter((w) => w.id !== wish.id)]);
    if (wish.visibility !== 'private') {
      void tripWishesApi.getTeam(tripId).then((r) => setTeam(r.items)).catch(() => {});
    }
    void tripWishesApi.getSummary(tripId).then(setSummary).catch(() => {});
  };

  const createFreeText = useCallback(
    async (body: Omit<CreateWishRequest, 'inputMode'>) => {
      setSubmitting(true);
      try {
        const wish = await tripWishesApi.create(tripId, {
          ...body,
          inputMode: 'free_text',
        });
        notifyCreated(wish);
        toast.success('已记下你的心愿');
        return wish;
      } catch (e) {
        toast.error((e as Error).message);
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [tripId],
  );

  const createFromCard = useCallback(
    async (
      cardId: string,
      overrides?: { text?: string; importance?: number; visibility?: WishVisibility },
    ) => {
      setSubmitting(true);
      try {
        const wish = await tripWishesApi.createFromCard(tripId, cardId, overrides);
        notifyCreated(wish);
        return wish;
      } catch (e) {
        toast.error((e as Error).message);
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [tripId],
  );

  const createFromInspiration = useCallback(
    async (body: CreateWishFromInspirationRequest) => {
      setSubmitting(true);
      try {
        const wish = await tripWishesApi.createFromInspiration(tripId, body);
        notifyCreated(wish);
        toast.success('已收藏进心愿单');
        return wish;
      } catch (e) {
        toast.error((e as Error).message);
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [tripId],
  );

  const createFromVoice = useCallback(
    async (body: CreateWishFromVoiceRequest) => {
      setSubmitting(true);
      try {
        const wish = await tripWishesApi.createFromVoice(tripId, body);
        notifyCreated(wish);
        toast.success('已记下你的心愿');
        return wish;
      } catch (e) {
        toast.error((e as Error).message);
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [tripId],
  );

  const updateWish = useCallback(
    async (wishId: string, body: UpdateWishRequest) => {
      try {
        const updated = await tripWishesApi.update(tripId, wishId, body);
        setMine((prev) => prev.map((w) => (w.id === wishId ? updated : w)));
        if (body.visibility !== undefined) {
          const teamRes = await tripWishesApi.getTeam(tripId);
          setTeam(teamRes.items);
        }
        void tripWishesApi.getSummary(tripId).then(setSummary).catch(() => {});
        return updated;
      } catch (e) {
        toast.error((e as Error).message);
        throw e;
      }
    },
    [tripId],
  );

  const archiveWish = useCallback(
    async (wishId: string) => {
      try {
        await tripWishesApi.archive(tripId, wishId);
        setMine((prev) => prev.filter((w) => w.id !== wishId));
        const teamRes = await tripWishesApi.getTeam(tripId);
        setTeam(teamRes.items);
        void tripWishesApi.getSummary(tripId).then(setSummary).catch(() => {});
        toast.message('已移除心愿');
      } catch (e) {
        toast.error((e as Error).message);
        throw e;
      }
    },
    [tripId],
  );

  return {
    mine,
    team,
    summary,
    loading,
    submitting,
    reload,
    createFreeText,
    createFromCard,
    createFromInspiration,
    createFromVoice,
    updateWish,
    archiveWish,
  };
}

export type { WishCategory, WishVisibility, TripWishItem, TeamWishItem, WishSummary };
