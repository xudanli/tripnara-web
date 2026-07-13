import apiClient from './client';
import type {
  CollaborativeTaskEventRequest,
  CollaborativeTasksResponse,
} from '@/types/collaborative-task-flywheel';
import {
  normalizeCollaborativeTaskFlywheel,
  normalizeCollaborativeTaskView,
} from '@/lib/collaborative-tasks/normalize-collaborative-tasks';
import {
  isDomainNegotiationTaskRaw,
  normalizeDomainNegotiationTasksResponse,
} from '@/lib/normalize-domain-negotiation-tasks';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

function unwrap<T>(payload: SuccessResponse<T>): T {
  return payload.data;
}

function normalizeCollaborativeTasksResponse(
  tripId: string,
  raw: unknown
): CollaborativeTasksResponse {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const flywheel = normalizeCollaborativeTaskFlywheel(
    record.flywheel ?? record.collaborativeTaskFlywheel
  );
  const tasksRaw = record.tasks;
  const negotiationTasks = normalizeDomainNegotiationTasksResponse(raw);

  let tasks: CollaborativeTasksResponse['tasks'] = [];
  if (Array.isArray(tasksRaw)) {
    const flywheelRaw = tasksRaw.filter((item) => !isDomainNegotiationTaskRaw(item));
    tasks = flywheelRaw
      .map(normalizeCollaborativeTaskView)
      .filter((x): x is NonNullable<typeof x> => x != null);
  } else if (flywheel?.tasks?.length) {
    tasks = flywheel.tasks;
  }

  return { tripId, flywheel, tasks, negotiationTasks };
}

/** §3.13 Phase 2 · 行中协同任务 API */
export const collaborativeTasksApi = {
  list: async (tripId: string): Promise<CollaborativeTasksResponse> => {
    const response = await apiClient.get<SuccessResponse<unknown>>(
      `/trips/${tripId}/collaborative-tasks`
    );
    return normalizeCollaborativeTasksResponse(tripId, unwrap(response.data));
  },

  postEvent: async (
    tripId: string,
    taskId: string,
    body: CollaborativeTaskEventRequest
  ): Promise<CollaborativeTasksResponse> => {
    const response = await apiClient.post<SuccessResponse<unknown>>(
      `/trips/${tripId}/collaborative-tasks/${taskId}/events`,
      body
    );
    return normalizeCollaborativeTasksResponse(tripId, unwrap(response.data));
  },
};
