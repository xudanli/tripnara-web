import { useCallback, useEffect, useMemo, useState } from 'react';
import { tripWishesApi } from '@/api/trip-wishes';
import type { WishCategory, WishCategoryOption } from '@/types/trip-wishes';
import { WISH_CATEGORY_LABELS } from '@/lib/wishlist-model';

const FALLBACK_CATEGORIES: WishCategoryOption[] = (
  Object.entries(WISH_CATEGORY_LABELS) as [WishCategory, string][]
).map(([value, label]) => ({ value, label }));

export function useWishCategories(tripId: string, locale = 'zh-CN') {
  const [categories, setCategories] = useState<WishCategoryOption[]>(FALLBACK_CATEGORIES);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const res = await tripWishesApi.getCategories(tripId, locale);
      if (res.categories.length > 0) {
        setCategories(res.categories);
      }
    } catch {
      setCategories(FALLBACK_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }, [tripId, locale]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const labelMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.value, c.label])),
    [categories],
  );

  const defaultCategory = categories[0]?.value ?? 'activities';

  return { categories, labelMap, loading, defaultCategory, reload };
}
