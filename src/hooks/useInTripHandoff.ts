import { useCallback, useEffect, useState } from 'react';
import {
  inTripExecutionApi,
  isInTripNotFoundError,
} from '@/api/in-trip-execution';
import type {
  HandoffVerifyResult,
  InTripAnchorSnapshotPublic,
} from '@/types/in-trip-execution';

export interface UseInTripHandoffResult {
  verify: HandoffVerifyResult | null;
  snapshot: InTripAnchorSnapshotPublic | null;
  verifyLoading: boolean;
  snapshotLoading: boolean;
  verifyError: string | null;
  snapshotMissing: boolean;
  reloadVerify: () => Promise<void>;
  reloadSnapshot: () => Promise<void>;
  materialize: () => Promise<void>;
  materializing: boolean;
}

export function useInTripHandoff(
  tripId: string | null | undefined,
  options?: { autoVerify?: boolean; autoSnapshot?: boolean },
): UseInTripHandoffResult {
  const autoVerify = options?.autoVerify ?? true;
  const autoSnapshot = options?.autoSnapshot ?? false;

  const [verify, setVerify] = useState<HandoffVerifyResult | null>(null);
  const [snapshot, setSnapshot] = useState<InTripAnchorSnapshotPublic | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [snapshotMissing, setSnapshotMissing] = useState(false);
  const [materializing, setMaterializing] = useState(false);

  const reloadVerify = useCallback(async () => {
    if (!tripId) return;
    try {
      setVerifyLoading(true);
      setVerifyError(null);
      const result = await inTripExecutionApi.verifyHandoff(tripId);
      setVerify(result);
    } catch (e) {
      console.error('[useInTripHandoff] verify failed', e);
      setVerify(null);
      setVerifyError(e instanceof Error ? e.message : '移交校验失败');
    } finally {
      setVerifyLoading(false);
    }
  }, [tripId]);

  const reloadSnapshot = useCallback(async () => {
    if (!tripId) return;
    try {
      setSnapshotLoading(true);
      setSnapshotMissing(false);
      const result = await inTripExecutionApi.getAnchorSnapshot(tripId);
      setSnapshot(result);
    } catch (e) {
      if (isInTripNotFoundError(e)) {
        setSnapshot(null);
        setSnapshotMissing(true);
        return;
      }
      console.error('[useInTripHandoff] snapshot failed', e);
      setSnapshot(null);
    } finally {
      setSnapshotLoading(false);
    }
  }, [tripId]);

  const materialize = useCallback(async () => {
    if (!tripId) return;
    try {
      setMaterializing(true);
      const result = await inTripExecutionApi.materializeHandoff(tripId);
      setVerify(result.verify);
      if (result.snapshot) {
        setSnapshot(result.snapshot);
        setSnapshotMissing(false);
      }
    } finally {
      setMaterializing(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (!tripId) {
      setVerify(null);
      setSnapshot(null);
      return;
    }
    if (autoVerify) reloadVerify();
    if (autoSnapshot) reloadSnapshot();
  }, [tripId, autoVerify, autoSnapshot, reloadVerify, reloadSnapshot]);

  return {
    verify,
    snapshot,
    verifyLoading,
    snapshotLoading,
    verifyError,
    snapshotMissing,
    reloadVerify,
    reloadSnapshot,
    materialize,
    materializing,
  };
}
