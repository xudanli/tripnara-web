import { decisionProblemsApi } from '@/api/decision-problems';
import { isUnifiedDecisionGatewayEnabled } from '@/lib/decision-gateway.util';
import {
  decisionCollaborativeSubTaskKindLabel,
  normalizeCollaborativeSubTaskStatus,
} from '@/lib/decision-collaborative-sub-task.util';
import type { DecisionCollaborativeSubTaskView } from '@/types/unified-decision';
import type {
  CollaborativeTaskStatus,
  CollaborativeTaskView,
} from '@/types/collaborative-task-flywheel';

export const tripDecisionFollowUpTasksQueryKey = (tripId: string) =>
  ['trips', tripId, 'decision-follow-up-tasks'] as const;

function mapSubTaskStatus(
  status: string | undefined | null,
): CollaborativeTaskStatus {
  const canonical = normalizeCollaborativeSubTaskStatus(status);
  if (canonical === 'completed') return 'confirmed';
  if (canonical === 'cancelled') return 'rolled_back';
  return 'pending';
}

export function mapDecisionSubTaskToCollaborativeTaskView(input: {
  subTask: DecisionCollaborativeSubTaskView & { problemId?: string };
  problemTitle?: string | null;
}): CollaborativeTaskView {
  const { subTask, problemTitle } = input;
  const kindLabel = decisionCollaborativeSubTaskKindLabel(subTask.kind);
  const problemId =
    subTask.problemId ??
    (subTask as DecisionCollaborativeSubTaskView & { decisionProblemId?: string })
      .decisionProblemId;

  return {
    id: subTask.id,
    templateId: `decision_subtask:${subTask.kind}`,
    title: subTask.title,
    description:
      subTask.description?.trim() ||
      (problemTitle ? `决策跟进 · ${problemTitle}` : `决策跟进 · ${kindLabel}`),
    assigneeUserId: subTask.assigneeUserId ?? null,
    status: mapSubTaskStatus(subTask.status),
    resolutionId: subTask.resolutionId,
    decisionProblemId: problemId,
    problemTitle: problemTitle ?? null,
    source: 'decision_problem',
    isSubTask: true,
    subTaskKind: subTask.kind,
    subTaskStatus: subTask.status ?? 'pending',
  };
}

/** 聚合行程内各 decision-problem 的 collaborative-sub-tasks（协作中心读路径） */
export async function fetchTripDecisionFollowUpTasks(
  tripId: string,
): Promise<CollaborativeTaskView[]> {
  const listResponse = isUnifiedDecisionGatewayEnabled()
    ? await decisionProblemsApi.listUnifiedByTrip(tripId)
    : await decisionProblemsApi.listByTrip(tripId);

  const problems = listResponse.items ?? [];
  if (!problems.length) return [];

  const batches = await Promise.all(
    problems.map(async (problem) => {
      try {
        const { items } = await decisionProblemsApi.listCollaborativeSubTasks(
          tripId,
          problem.id,
        );
        return items
          .filter((item) => normalizeCollaborativeSubTaskStatus(item.status) !== 'cancelled')
          .map((subTask) =>
            mapDecisionSubTaskToCollaborativeTaskView({
              subTask: { ...subTask, problemId: problem.id },
              problemTitle: problem.title,
            }),
          );
      } catch {
        return [];
      }
    }),
  );

  return batches.flat();
}
