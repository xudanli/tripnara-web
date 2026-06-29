import { useEffect, useState } from 'react';
import {
  getDecisionCheckerDeferredSnapshot,
  subscribeDecisionCheckerDeferred,
  type DecisionCheckerDeferredRecord,
} from '@/lib/decision-checker-deferred.store';

const EMPTY: DecisionCheckerDeferredRecord = {
  taskId: '',
  pollIntervalMs: 5000,
  status: 'pending',
  decisionChecker: null,
  loading: false,
  error: null,
};

export function useDecisionCheckerDeferred(
  tripId: string | null | undefined,
): DecisionCheckerDeferredRecord {
  const [snapshot, setSnapshot] = useState<DecisionCheckerDeferredRecord>(() =>
    tripId ? getDecisionCheckerDeferredSnapshot(tripId) : EMPTY,
  );

  useEffect(() => {
    if (!tripId) {
      setSnapshot(EMPTY);
      return;
    }
    setSnapshot(getDecisionCheckerDeferredSnapshot(tripId));
    return subscribeDecisionCheckerDeferred(tripId, () => {
      setSnapshot(getDecisionCheckerDeferredSnapshot(tripId));
    });
  }, [tripId]);

  return tripId ? snapshot : EMPTY;
}
