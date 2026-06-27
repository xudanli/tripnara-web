import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { RouteAndRunRequest } from '@/api/agent';
import { invokeRouteAndRun } from '@/lib/executeRouteAndRun';
import { buildRelaxationClarificationAnswers } from '@/lib/relaxation-suggestions-parse.util';
import { syncRelaxationSuggestionsFromRouteRun } from '@/lib/sync-relaxation-suggestions-store';
import { applyRouteAndRunToStore } from '@/lib/world-model-guards';
import { publishPlanStudioComparison } from '@/store/planStudioCompareStore';
import { usePlanningTaskStore } from '@/store/planningTaskStore';
import { pickComparisonFromRouteRun } from '@/lib/decision-strip-route-run';
import type { RelaxationSuggestionsContextV1 } from '@/types/relaxation-suggestions';
import { useAuth } from '@/hooks/useAuth';

export function useRelaxationSuggestionSubmit(tripId: string | null | undefined) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (context: RelaxationSuggestionsContextV1, actionIds: string[]) => {
      if (!tripId || !user?.id) {
        toast.error('请先登录后再提交');
        return null;
      }

      const answer = buildRelaxationClarificationAnswers(context, actionIds);
      if (!answer) {
        toast.error('请选择至少一项松弛方案');
        return null;
      }

      setSubmitting(true);
      try {
        const request: RouteAndRunRequest = {
          request_id: `relax-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          user_id: user.id,
          trip_id: tripId,
          message: '',
          clarification_answers: [answer],
          options: {
            entry_point: 'planning_workbench',
            use_state_machine_orchestration: true,
          },
        };

        const response = await invokeRouteAndRun(request);
        const status = response.result?.status;

        if (status === 'OK') {
          applyRouteAndRunToStore(response);
        }

        usePlanningTaskStore.getState().setTask({
          status: status === 'OK' ? 'SUCCESS' : status === 'FAILED' ? 'FAILED' : 'PROCESSING',
          resultData: response,
          message: response.result?.answer_text ?? '',
        });

        const comparison = pickComparisonFromRouteRun(response);
        if (comparison?.recommendation) {
          publishPlanStudioComparison(tripId, comparison);
        }

        syncRelaxationSuggestionsFromRouteRun(response, tripId);

        return response;
      } catch (error) {
        const message = error instanceof Error ? error.message : '提交失败，请重试';
        toast.error(message);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [tripId, user?.id],
  );

  return { submit, submitting };
}
