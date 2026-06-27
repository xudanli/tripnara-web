import { useCallback, useEffect, useState } from 'react';
import {
  cycleConstraintFlexibilityLevel,
  getConstraintFlexibilityLevel,
  getConstraintFlexibilityMap,
  setConstraintFlexibilityLevel,
  type ConstraintFlexKey,
  type ConstraintFlexibilityLevel,
} from '@/lib/constraint-flexibility.util';

export function useConstraintFlexibility(tripId: string | null | undefined) {
  const [levels, setLevels] = useState<Partial<Record<ConstraintFlexKey, ConstraintFlexibilityLevel>>>(
    () => getConstraintFlexibilityMap(tripId),
  );

  useEffect(() => {
    setLevels(getConstraintFlexibilityMap(tripId));
  }, [tripId]);

  const cycleFlexibility = useCallback(
    (key: ConstraintFlexKey) => {
      if (!tripId) return;
      const current = getConstraintFlexibilityLevel(tripId, key);
      const next = cycleConstraintFlexibilityLevel(current);
      setConstraintFlexibilityLevel(tripId, key, next);
      setLevels((prev) => ({ ...prev, [key]: next }));
    },
    [tripId],
  );

  return { levels, cycleFlexibility };
}
