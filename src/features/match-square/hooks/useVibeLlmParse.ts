import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vibeLlmApi } from '@/api/vibe-llm';
import type { PlanningStyle } from '@/types/match-square';
import type { VibeLlmParseResponse, VibeLlmParseResult } from '@/types/vibe-llm';

export type UseVibeLlmParseOptions = {
  debounceMs?: number;
  minLength?: number;
  enabled?: boolean;
  slotsNeeded?: number;
  captainContext?: { mbtiType?: string; personaTitle?: string };
};

export function useVibeLlmParse(text: string, options: UseVibeLlmParseOptions = {}) {
  const {
    debounceMs = 450,
    minLength = 12,
    enabled = true,
    slotsNeeded = 3,
    captainContext,
  } = options;

  const [debouncedText, setDebouncedText] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedText(text.trim()), debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, debounceMs]);

  const shouldFetch = enabled && debouncedText.length >= minLength;

  const query = useQuery({
    queryKey: ['vibe-llm', 'parse', debouncedText, slotsNeeded, captainContext?.mbtiType],
    queryFn: () =>
      vibeLlmApi.parse({
        freeText: debouncedText,
        slotsNeeded,
        captainContext,
      }),
    enabled: shouldFetch,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    retry: (failureCount, error) => {
      const err = error as { response?: { status?: number }; code?: string };
      if (err.response?.status === 401 || err.code === 'UNAUTHORIZED') return false;
      return failureCount < 1;
    },
  });

  const parse: VibeLlmParseResult | null =
    shouldFetch && query.data?.parse ? query.data.parse : null;

  const parseResponse: VibeLlmParseResponse | null =
    shouldFetch && query.data ? query.data : null;

  const suggestedPlanningStyle: PlanningStyle | null =
    shouldFetch && query.data?.suggestedPlanningStyle ? query.data.suggestedPlanningStyle : null;

  return {
    parse,
    parseResponse,
    suggestedPlanningStyle,
    teamworkContractModelLabel: parseResponse?.teamworkContractModelLabel ?? null,
    suggestedItinerarySummary: parseResponse?.suggestedItinerarySummary ?? null,
    suggestedCaptainMessage: parseResponse?.suggestedCaptainMessage ?? null,
    suggestedFields: parseResponse?.suggestedFields ?? null,
    source: query.data?.source,
    parseSource: query.data?.parseSource,
    isLiveLlm: query.data?.source === 'live_llm',
    isRuleMock: query.data?.source === 'rule_mock',
    realtimeReady: query.data?.realtime_ready ?? false,
    isParsing: shouldFetch && query.isFetching,
    isError: query.isError,
    error: query.error,
    debouncedText,
    isStale: text.trim() !== debouncedText,
  };
}
