import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { createTravelContextProvider } from '@/travel-context/client/travel-context-provider';
import type { TravelContextProvider } from '@/travel-context/client/travel-context-api.types';
import type {
  TravelContextIntentRequest,
  TravelContextIntentResult,
  TravelContextProviderState,
} from '@/travel-context/client/travel-context-api.types';
import type { OverviewViewData, MonitoringViewData, ContextMutationResult } from '@/travel-context/views/overview-view.types';
import type { PlanViewData, DecisionsViewData } from '@/travel-context/views/travel-context-views.types';
import { explorationFlags } from '@/features/exploration/flags';
import {
  isRevisionConflict,
  submitIntentWithRetry,
} from '@/travel-context/hooks/submit-intent-with-retry';
import { buildContextStatusDisplay } from '../lib/context-status-display.util';
import {
  classifyTravelContextError,
  buildHarnessFailSafeState,
} from '../lib/travel-context-failsafe.util';

export type ContextFailSafeKind =
  | 'REVISION_CONFLICT'
  | 'WRITE_FAILED'
  | 'CONSTRAINT_BLOCKED'
  | 'STALE_FACTS'
  | 'AUTHORITY_BLOCKED';

export interface ContextFailSafeState {
  kind: ContextFailSafeKind;
  title: string;
  message: string;
  preserveEffectivePlan?: boolean;
}

export interface ContextAttentionState {
  id: string;
  headline: string;
  body?: string;
  severity: 'info' | 'warning' | 'action';
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  dismissible?: boolean;
}

interface TripTravelContextValue {
  enabled: boolean;
  ready: boolean;
  tripId: string;
  contextId: string;
  revision: number;
  state: TravelContextProviderState | null;
  overviewView: OverviewViewData | undefined;
  planView: PlanViewData | undefined;
  decisionsView: DecisionsViewData | undefined;
  monitoringView: MonitoringViewData | undefined;
  openDecisionCount: number;
  monitoringCount: number;
  statusDisplay: ReturnType<typeof buildContextStatusDisplay>;
  attention: ContextAttentionState | null;
  failSafe: ContextFailSafeState | null;
  syncError: string | null;
  getProvider: () => TravelContextProvider | null;
  refresh: () => Promise<void>;
  dismissAttention: () => void;
  dismissFailSafe: () => void;
  submitTripIntent: (
    intent: Omit<TravelContextIntentRequest, 'basedOnRevision'>,
  ) => Promise<TravelContextIntentResult>;
  applyMutationAttention: (mutation: ContextMutationResult) => void;
  triggerHarnessFailSafe: (kind: ContextFailSafeKind) => void;
  contextDiffOpen: boolean;
  contextDiffSinceRevision: number;
  openContextDiff: (sinceRevision?: number) => void;
  closeContextDiff: () => void;
}

const TripTravelContext = createContext<TripTravelContextValue | null>(null);

const EMPTY_STATE: TravelContextProviderState = {
  contextId: '',
  revision: 0,
  snapshotId: '',
  stage: 'PLANNING',
  views: {},
  loading: false,
};

export function TripTravelContextProvider({
  children,
  tripId: tripIdOverride,
}: {
  children: ReactNode;
  tripId?: string;
}) {
  const { id: routeTripId = '' } = useParams<{ id: string }>();
  const tripId = tripIdOverride ?? routeTripId;
  const { accessToken } = useAuth();
  const enabled = explorationFlags.travelContextEnabled && Boolean(tripId && accessToken);

  const providerRef = useRef<TravelContextProvider | null>(null);
  const [state, setState] = useState<TravelContextProviderState>(EMPTY_STATE);
  const [resolved, setResolved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attention, setAttention] = useState<ContextAttentionState | null>(null);
  const [failSafe, setFailSafe] = useState<ContextFailSafeState | null>(null);
  const [contextDiff, setContextDiff] = useState({ open: false, sinceRevision: 0 });
  const revisionRef = useRef<number | null>(null);
  const localWriteRef = useRef(false);
  const openContextDiffRef = useRef<(sinceRevision?: number) => void>(() => {});

  const syncState = useCallback(() => {
    const provider = providerRef.current;
    if (provider) setState({ ...provider.getState() });
  }, []);

  useEffect(() => {
    if (!enabled || !tripId || !accessToken) {
      providerRef.current = null;
      setState(EMPTY_STATE);
      setResolved(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const provider = createTravelContextProvider({
      contextId: tripId,
      token: accessToken,
      prefetchViews: ['overview', 'plan', 'decisions', 'monitoring'],
    });
    providerRef.current = provider;

    const unsubscribe = provider.subscribe(() => {
      if (!cancelled) syncState();
    });

    const unsubscribeSse = explorationFlags.travelContextRevisionEvents
      ? provider.subscribeRevisionEvents()
      : undefined;

    void provider
      .resolveFromTrip(tripId)
      .then(async () => {
        if (cancelled) return;
        await Promise.all([
          provider.getView<OverviewViewData>('overview'),
          provider.getView<PlanViewData>('plan'),
          provider.getView<DecisionsViewData>('decisions'),
          provider.getView<MonitoringViewData>('monitoring'),
        ]);
        if (!cancelled) {
          syncState();
          setResolved(true);
          revisionRef.current = provider.getState().revision;
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setResolved(true);
        }
      });

    return () => {
      cancelled = true;
      unsubscribe();
      unsubscribeSse?.();
      providerRef.current = null;
    };
  }, [enabled, tripId, accessToken, syncState]);

  const openContextDiff = useCallback((sinceRevision?: number) => {
    const since =
      sinceRevision ??
      Math.max(0, revisionRef.current != null ? revisionRef.current - 1 : state.revision - 1);
    setContextDiff({ open: true, sinceRevision: since });
  }, [state.revision]);

  openContextDiffRef.current = openContextDiff;

  const closeContextDiff = useCallback(() => {
    setContextDiff((prev) => ({ ...prev, open: false }));
  }, []);

  useEffect(() => {
    if (!enabled || !resolved) return;
    const prev = revisionRef.current;
    const next = state.revision;
    if (prev !== null && next > prev && !localWriteRef.current && !state.loading) {
      setAttention({
        id: `rev-${next}`,
        headline: '行程刚刚发生了新的变化',
        body: '其他设备或协作者更新了这趟旅行。页面已同步最新状态，当前生效方案未被自动修改。',
        severity: 'info',
        dismissible: true,
        primaryActionLabel: '查看变化',
        onPrimaryAction: () => openContextDiffRef.current(prev),
      });
    }
    revisionRef.current = next;
    localWriteRef.current = false;
  }, [enabled, resolved, state.revision, state.loading]);

  const overviewView = state.views.overview?.data as OverviewViewData | undefined;
  const planView = state.views.plan?.data as PlanViewData | undefined;
  const decisionsView = state.views.decisions?.data as DecisionsViewData | undefined;
  const monitoringView = state.views.monitoring?.data as MonitoringViewData | undefined;

  const openDecisionCount =
    overviewView?.openDecisionCount ??
    decisionsView?.openDecisionCount ??
    decisionsView?.problems?.filter((p) => p.status !== 'COMPLETED' && p.status !== 'RESOLVED')
      .length ??
    0;

  const monitoringCount =
    overviewView?.monitoringCount ?? monitoringView?.activeCount ?? monitoringView?.items?.length ?? 0;

  const statusDisplay = useMemo(
    () =>
      buildContextStatusDisplay({
        stage: state.stage,
        loading: state.loading,
        error,
        overviewView,
        planView,
        openDecisionCount,
        monitoringCount,
      }),
    [state.stage, state.loading, error, overviewView, planView, openDecisionCount, monitoringCount],
  );

  const refresh = useCallback(async () => {
    const provider = providerRef.current;
    if (!provider) return;
    await provider.refresh();
    await Promise.all([
      provider.getView<OverviewViewData>('overview'),
      provider.getView<PlanViewData>('plan'),
      provider.getView<DecisionsViewData>('decisions'),
      provider.getView<MonitoringViewData>('monitoring'),
    ]);
    syncState();
  }, [syncState]);

  const submitTripIntent = useCallback(
    async (
      intent: Omit<TravelContextIntentRequest, 'basedOnRevision'>,
    ): Promise<TravelContextIntentResult> => {
      const provider = providerRef.current;
      if (!provider) throw new Error('Travel Context 未就绪');
      localWriteRef.current = true;
      try {
        const result = await submitIntentWithRetry(provider, intent);
        syncState();
        setFailSafe(null);
        return result;
      } catch (err) {
        const classified = classifyTravelContextError(err);
        if (classified === 'REVISION_CONFLICT') {
          setFailSafe(buildHarnessFailSafeState('REVISION_CONFLICT'));
        } else if (classified === 'CONSTRAINT_BLOCKED') {
          setFailSafe(buildHarnessFailSafeState('CONSTRAINT_BLOCKED'));
        } else if (classified === 'STALE_FACTS') {
          setFailSafe(buildHarnessFailSafeState('STALE_FACTS'));
        } else if (classified === 'AUTHORITY_BLOCKED') {
          setFailSafe(buildHarnessFailSafeState('AUTHORITY_BLOCKED'));
        } else {
          setFailSafe(buildHarnessFailSafeState('WRITE_FAILED'));
        }
        throw err;
      }
    },
    [syncState],
  );

  const triggerHarnessFailSafe = useCallback((kind: ContextFailSafeKind) => {
    if (!import.meta.env.DEV || import.meta.env.VITE_TRAVEL_CONTEXT_DEBUG !== '1') return;
    setFailSafe(buildHarnessFailSafeState(kind));
  }, []);

  const applyMutationAttention = useCallback((mutation: ContextMutationResult) => {
    if (!mutation.userFacingSummary) return;
    setAttention({
      id: `mutation-${mutation.newRevision}`,
      headline: mutation.userFacingSummary,
      body:
        mutation.changedDomains?.length && mutation.changedDomains.length > 0
          ? `影响范围：${mutation.changedDomains.join('、')}`
          : undefined,
      severity: mutation.warnings?.length ? 'warning' : 'info',
      dismissible: true,
      primaryActionLabel: '查看变化',
      onPrimaryAction: () => openContextDiffRef.current(mutation.previousRevision),
    });
  }, []);

  const value = useMemo<TripTravelContextValue>(
    () => ({
      enabled,
      ready: enabled && resolved && !state.loading,
      tripId,
      contextId: state.contextId,
      revision: state.revision,
      state: enabled ? state : null,
      overviewView,
      planView,
      decisionsView,
      monitoringView,
      openDecisionCount,
      monitoringCount,
      statusDisplay,
      attention,
      failSafe,
      syncError: error,
      getProvider: () => providerRef.current,
      refresh,
      dismissAttention: () => setAttention(null),
      dismissFailSafe: () => setFailSafe(null),
      submitTripIntent,
      applyMutationAttention,
      triggerHarnessFailSafe,
      contextDiffOpen: contextDiff.open,
      contextDiffSinceRevision: contextDiff.sinceRevision,
      openContextDiff,
      closeContextDiff,
    }),
    [
      enabled,
      resolved,
      state,
      tripId,
      overviewView,
      planView,
      decisionsView,
      monitoringView,
      openDecisionCount,
      monitoringCount,
      statusDisplay,
      attention,
      failSafe,
      error,
      refresh,
      submitTripIntent,
      applyMutationAttention,
      triggerHarnessFailSafe,
      contextDiff.open,
      contextDiff.sinceRevision,
      openContextDiff,
      closeContextDiff,
    ],
  );

  return <TripTravelContext.Provider value={value}>{children}</TripTravelContext.Provider>;
}

export function useTripTravelContext(): TripTravelContextValue {
  const ctx = useContext(TripTravelContext);
  return (
    ctx ?? {
      enabled: false,
      ready: false,
      tripId: '',
      contextId: '',
      revision: 0,
      state: null,
      overviewView: undefined,
      planView: undefined,
      decisionsView: undefined,
      monitoringView: undefined,
      openDecisionCount: 0,
      monitoringCount: 0,
      statusDisplay: buildContextStatusDisplay({
        loading: false,
        openDecisionCount: 0,
        monitoringCount: 0,
      }),
      attention: null,
      failSafe: null,
      syncError: null,
      getProvider: () => null,
      refresh: async () => {},
      dismissAttention: () => {},
      dismissFailSafe: () => {},
      submitTripIntent: async () => {
        throw new Error('Travel Context 不可用');
      },
      applyMutationAttention: () => {},
      triggerHarnessFailSafe: () => {},
      contextDiffOpen: false,
      contextDiffSinceRevision: 0,
      openContextDiff: () => {},
      closeContextDiff: () => {},
    }
  );
}
