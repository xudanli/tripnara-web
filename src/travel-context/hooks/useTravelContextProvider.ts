import { useCallback, useEffect, useRef, useState } from 'react';
import { createTravelContextProvider } from '../client/travel-context-provider';
import type {
  TravelContextProvider,
  TravelContextProviderOptions,
  TravelContextProviderState,
} from '../client/travel-context-api.types';
import { submitIntentWithRetry } from './submit-intent-with-retry';
import type { TravelContextIntentRequest, TravelContextIntentResult } from '../client/travel-context-api.types';

const EMPTY_STATE: TravelContextProviderState = {
  contextId: '',
  revision: 0,
  snapshotId: '',
  stage: 'EXPLORATION',
  views: {},
  loading: false,
};

export interface UseTravelContextProviderOptions {
  contextId: string | undefined;
  token: string | null | undefined;
  enabled?: boolean;
  prefetchViews?: TravelContextProviderOptions['prefetchViews'];
  subscribeRevisionEvents?: boolean;
}

export function useTravelContextProvider(options: UseTravelContextProviderOptions) {
  const enabled =
    options.enabled !== false && Boolean(options.contextId && options.token);
  const providerRef = useRef<TravelContextProvider | null>(null);
  const [state, setState] = useState<TravelContextProviderState>(EMPTY_STATE);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!enabled || !options.contextId || !options.token) {
      providerRef.current = null;
      setState(EMPTY_STATE);
      setInitialized(false);
      return;
    }

    let cancelled = false;
    const provider = createTravelContextProvider({
      contextId: options.contextId,
      token: options.token,
      prefetchViews: options.prefetchViews,
      subscribeRevisionEvents: options.subscribeRevisionEvents,
    });
    providerRef.current = provider;

    const unsubscribe = provider.subscribe(() => {
      if (!cancelled) setState({ ...provider.getState() });
    });

    void provider
      .refresh()
      .then(() => {
        if (!cancelled) {
          setState({ ...provider.getState() });
          setInitialized(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ ...provider.getState() });
          setInitialized(true);
        }
      });

    let unsubscribeSse: (() => void) | undefined;
    if (options.subscribeRevisionEvents) {
      unsubscribeSse = provider.subscribeRevisionEvents();
    }

    return () => {
      cancelled = true;
      unsubscribe();
      unsubscribeSse?.();
      providerRef.current = null;
      setInitialized(false);
    };
  }, [
    enabled,
    options.contextId,
    options.token,
    options.subscribeRevisionEvents,
    // prefetchViews 序列化 — 避免引用变化导致重复 refresh
    JSON.stringify(options.prefetchViews ?? []),
  ]);

  const refresh = useCallback(async () => {
    const provider = providerRef.current;
    if (!provider) return;
    await provider.refresh();
    setState({ ...provider.getState() });
  }, []);

  const submitIntent = useCallback(
    async (
      intent: Omit<TravelContextIntentRequest, 'basedOnRevision'>,
    ): Promise<TravelContextIntentResult> => {
      const provider = providerRef.current;
      if (!provider) throw new Error('Travel Context provider not ready');
      const result = await submitIntentWithRetry(provider, intent);
      setState({ ...provider.getState() });
      return result;
    },
    [],
  );

  const getView = useCallback(
    async <T = Record<string, unknown>>(view: Parameters<TravelContextProvider['getView']>[0]) => {
      const provider = providerRef.current;
      if (!provider) throw new Error('Travel Context provider not ready');
      const envelope = await provider.getView<T>(view);
      setState({ ...provider.getState() });
      return envelope;
    },
    [],
  );

  const getProvider = useCallback(() => providerRef.current, []);

  return {
    enabled,
    ready: enabled && initialized && !state.loading,
    provider: providerRef.current,
    getProvider,
    state,
    refresh,
    submitIntent,
    getView,
  };
}
