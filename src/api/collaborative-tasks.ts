import apiClient from './client';
import type {
  CollaborativeTaskEventRequest,
  CollaborativeTasksResponse,
} from '@/types/collaborative-task-flywheel';
import {
  mockGetCollaborativeTasks,
  mockPostCollaborativeTaskEvent,
} from '@/features/match-square/lib/decision-engine/collaborative-task-flywheel-mock';
import {
  normalizeCollaborativeTaskFlywheel,
  normalizeCollaborativeTaskView,
} from '@/features/match-square/lib/decision-engine/normalize-collaborative-tasks';
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

async function liveList(tripId: string): Promise<CollaborativeTasksResponse> {
  const response = await apiClient.get<SuccessResponse<unknown>>(
    `/trips/${tripId}/collaborative-tasks`
  );
  const raw = unwrap(response.data);
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

async function livePostEvent(
  tripId: string,
  taskId: string,
  body: CollaborativeTaskEventRequest
): Promise<CollaborativeTasksResponse> {
  const response = await apiClient.post<SuccessResponse<unknown>>(
    `/trips/${tripId}/collaborative-tasks/${taskId}/events`,
    body
  );
  const raw = unwrap(response.data);
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

async function withMockFallback<T>(live: () => Promise<T>, mock: () => T): Promise<T> {
  try {
    return await live();
  } catch {
    return mock();
  }
}

/** §3.13 Phase 2 · 行中协同任务 API */
export const collaborativeTasksApi = {
  list: (tripId: string) =>
    withMockFallback(
      () => liveList(tripId),
      () => mockGetCollaborativeTasks(tripId)
    ),

  postEvent: (tripId: string, taskId: string, body: CollaborativeTaskEventRequest) =>
    withMockFallback(
      () => livePostEvent(tripId, taskId, body),
      () => {
        const result = mockPostCollaborativeTaskEvent(tripId, taskId, body);
        if (!result) throw new Error('协同任务不存在');
        return result;
      }
    ),
};
