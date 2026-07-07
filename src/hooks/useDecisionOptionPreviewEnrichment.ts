import { useCallback, useEffect, useState } from 'react';
import { decisionProblemsApi } from '@/api/decision-problems';
import {
  mergePreviewIntoDecisionOption,
  optionNeedsPreviewEnrichment,
} from '@/lib/decision-option-preview-enrichment.util';
import type { DecisionOption } from '@/types/decision-problem';

export function useDecisionOptionPreviewEnrichment(
  tripId: string,
  problemId: string | null | undefined,
) {
  const [enrichedById, setEnrichedById] = useState<Record<string, DecisionOption>>({});
  const [previewingOptionId, setPreviewingOptionId] = useState<string | null>(null);

  useEffect(() => {
    setEnrichedById({});
    setPreviewingOptionId(null);
  }, [tripId, problemId]);

  const mergeOptions = useCallback(
    (options: DecisionOption[]): DecisionOption[] =>
      options.map((option) => enrichedById[option.id] ?? option),
    [enrichedById],
  );

  const enrichOption = useCallback(
    async (option: DecisionOption): Promise<DecisionOption> => {
      if (!problemId) return option;
      if (!optionNeedsPreviewEnrichment(option)) return option;

      setPreviewingOptionId(option.id);
      try {
        const preview = await decisionProblemsApi.previewOption(tripId, problemId, option.id);
        const merged = mergePreviewIntoDecisionOption(option, preview);
        let resolved = merged;
        setEnrichedById((prev) => {
          if (prev[option.id]) {
            resolved = prev[option.id]!;
            return prev;
          }
          return { ...prev, [option.id]: merged };
        });
        return resolved;
      } finally {
        setPreviewingOptionId((current) => (current === option.id ? null : current));
      }
    },
    [tripId, problemId],
  );

  return {
    mergeOptions,
    enrichOption,
    previewingOptionId,
  };
}
