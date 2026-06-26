import type {
  CollaborativeTaskEventRequest,
  CollaborativeTaskFlywheelMetadata,
  CollaborativeTasksResponse,
} from '@/types/collaborative-task-flywheel';
import type { RecruitmentPostCard } from '@/types/match-square';
import { buildCollaborativeTaskFlywheel } from '../decision-engine/collaborative-task-dispatch.engine';
import {
  normalizeCollaborativeTaskFlywheel,
  statusForAction,
} from '../decision-engine/normalize-collaborative-tasks';

const STORAGE_KEY = 'tripnara_collaborative_task_flywheel_v1';

type StoredFlywheels = Record<string, CollaborativeTaskFlywheelMetadata>;

function readStore(): StoredFlywheels {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredFlywheels;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: StoredFlywheels): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function getStoredCollaborativeTaskFlywheel(
  tripId: string
): CollaborativeTaskFlywheelMetadata | null {
  const store = readStore();
  return normalizeCollaborativeTaskFlywheel(store[tripId]) ?? store[tripId] ?? null;
}

export function setStoredCollaborativeTaskFlywheel(
  tripId: string,
  flywheel: CollaborativeTaskFlywheelMetadata
): void {
  const store = readStore();
  store[tripId] = flywheel;
  writeStore(store);
}

export function mockBuildAndStoreFlywheelForTrip(
  tripId: string,
  post: RecruitmentPostCard,
  approvedApplications: Parameters<typeof buildCollaborativeTaskFlywheel>[1]
): CollaborativeTaskFlywheelMetadata {
  const flywheel = buildCollaborativeTaskFlywheel(post, approvedApplications);
  setStoredCollaborativeTaskFlywheel(tripId, flywheel);
  return flywheel;
}

export function mockGetCollaborativeTasks(tripId: string): CollaborativeTasksResponse {
  const flywheel = getStoredCollaborativeTaskFlywheel(tripId);
  return {
    tripId,
    flywheel,
    tasks: flywheel?.tasks ?? [],
    negotiationTasks: [],
  };
}

export function mockPostCollaborativeTaskEvent(
  tripId: string,
  taskId: string,
  body: CollaborativeTaskEventRequest,
  actorUserId = 'current-user'
): CollaborativeTasksResponse | null {
  const flywheel = getStoredCollaborativeTaskFlywheel(tripId);
  if (!flywheel) return null;

  const tasks = flywheel.tasks.map((task) => {
    if (task.id !== taskId) return task;
    const nextStatus = statusForAction(body.action);
    const entry = {
      action: body.action,
      at: new Date().toISOString(),
      actorUserId,
    };
    return {
      ...task,
      status: nextStatus,
      behaviorLog: [...(task.behaviorLog ?? []), entry],
    };
  });

  const updated: CollaborativeTaskFlywheelMetadata = { ...flywheel, tasks };
  setStoredCollaborativeTaskFlywheel(tripId, updated);

  return {
    tripId,
    flywheel: updated,
    tasks,
    negotiationTasks: [],
  };
}
