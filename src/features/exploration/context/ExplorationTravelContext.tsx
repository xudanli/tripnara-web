import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTravelContextProvider } from '@/travel-context/hooks/useTravelContextProvider';
import type { TravelContextProvider } from '@/travel-context/client/travel-context-api.types';
import type { TravelContextProviderState } from '@/travel-context/client/travel-context-api.types';
import type { ExplorationViewData } from '@/travel-context/views/exploration-view.types';
import type { PlanViewData } from '@/travel-context/views/travel-context-views.types';
import { explorationFlags } from '../flags';
import { ExploreRevisionSyncNotifier } from '../components/ExploreRevisionSyncNotifier';
import { persistFlowState, readFlowStateForScenario } from '../flow-state';

interface ExplorationTravelContextValue {
  enabled: boolean;
  ready: boolean;
  contextId: string;
  revision: number;
  state: TravelContextProviderState | null;
  explorationView: ExplorationViewData | undefined;
  planView: PlanViewData | undefined;
  getProvider: () => TravelContextProvider | null;
  refresh: () => Promise<void>;
  getView: ReturnType<typeof useTravelContextProvider>['getView'];
}

const ExplorationTravelContext = createContext<ExplorationTravelContextValue | null>(null);

export function ExplorationTravelContextProvider({ children }: { children: ReactNode }) {
  const { scenarioId = '' } = useParams<{ scenarioId: string }>();
  const { accessToken } = useAuth();
  const enabled = explorationFlags.travelContextEnabled && Boolean(scenarioId && accessToken);

  const tc = useTravelContextProvider({
    contextId: scenarioId,
    token: accessToken,
    enabled,
    prefetchViews: ['exploration', 'plan', 'feasibility'],
    subscribeRevisionEvents: explorationFlags.travelContextRevisionEvents,
  });

  useEffect(() => {
    if (!enabled || !import.meta.env.DEV) return;
    const err = tc.state.error;
    if (err) {
      console.warn('[travel-context/explore] provider error', {
        contextId: scenarioId,
        error: err,
      });
    }
  }, [enabled, scenarioId, tc.state.error]);

  const explorationView = tc.state.views.exploration?.data as ExplorationViewData | undefined;
  const planView = tc.state.views.plan?.data as PlanViewData | undefined;

  useEffect(() => {
    if (!enabled || !planView?.selectedRouteId || !scenarioId) return;
    const existing = readFlowStateForScenario(scenarioId);
    if (existing?.selectedRouteId === planView.selectedRouteId) return;
    if (existing) {
      persistFlowState({ selectedRouteId: planView.selectedRouteId });
    }
  }, [enabled, planView?.selectedRouteId, scenarioId]);

  const value = useMemo<ExplorationTravelContextValue>(
    () => ({
      enabled,
      ready: tc.ready,
      contextId: scenarioId,
      revision: tc.state.revision,
      state: enabled ? tc.state : null,
      explorationView,
      planView,
      getProvider: tc.getProvider,
      refresh: tc.refresh,
      getView: tc.getView,
    }),
    [
      enabled,
      tc.ready,
      scenarioId,
      tc.state,
      tc.state.revision,
      explorationView,
      planView,
      tc.getProvider,
      tc.refresh,
      tc.getView,
    ],
  );

  return (
    <ExplorationTravelContext.Provider value={value}>
      <ExploreRevisionSyncNotifier />
      {children}
    </ExplorationTravelContext.Provider>
  );
}

export function useExplorationTravelContext(): ExplorationTravelContextValue {
  const ctx = useContext(ExplorationTravelContext);
  return (
    ctx ?? {
      enabled: false,
      ready: false,
      contextId: '',
      revision: 0,
      state: null,
      explorationView: undefined,
      planView: undefined,
      getProvider: () => null,
      refresh: async () => {},
      getView: async () => {
        throw new Error('Travel Context not available');
      },
    }
  );
}
