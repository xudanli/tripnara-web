import type {
  ApplyDecisionCollaborativeTaskView,
  CreateDecisionCollaborativeSubTaskResponse,
  DecisionCollaborativeSubTaskKind,
  DecisionCollaborativeSubTaskStatus,
  DecisionCollaborativeSubTaskView,
  ListDecisionCollaborativeSubTasksResponse,
  PatchDecisionCollaborativeSubTaskResponse,
} from '@/types/unified-decision';
import { DECISION_COLLABORATIVE_SUBTASK_UPDATE_SCHEMA_ID } from '@/types/unified-decision';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export { DECISION_COLLABORATIVE_SUBTASK_UPDATE_SCHEMA_ID };

export const DECISION_COLLABORATIVE_SUB_TASK_KIND_LABELS: Record<
  DecisionCollaborativeSubTaskKind,
  string
> = {
  ACCOMMODATION_LOOKUP: '查住宿',
  CANCELLATION_POLICY: '取消政策',
  TEAM_CONFIRM: '团队确认',
  BOOKING_FOLLOWUP: '预订跟进',
  OTHER: '其他',
};

/** 契约导出：子任务 status 选项 */
export const DECISION_COLLAB_SUBTASK_STATUS_OPTIONS: ReadonlyArray<{
  value: DecisionCollaborativeSubTaskStatus;
  label: string;
}> = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
] as const;

/** @deprecated 使用 DECISION_COLLAB_SUBTASK_STATUS_OPTIONS */
export const DECISION_COLLABORATIVE_SUB_TASK_STATUS_LABELS: Record<
  DecisionCollaborativeSubTaskStatus,
  string
> = Object.fromEntries(
  DECISION_COLLAB_SUBTASK_STATUS_OPTIONS.map((option) => [option.value, option.label]),
) as Record<DecisionCollaborativeSubTaskStatus, string>;

export function normalizeCollaborativeSubTaskStatus(
  raw: unknown,
): DecisionCollaborativeSubTaskStatus | undefined {
  if (typeof raw !== 'string') return undefined;
  const normalized = raw.trim().toLowerCase().replace(/-/g, '_');
  if (normalized === 'pending' || normalized === 'open') return 'pending';
  if (normalized === 'in_progress' || normalized === 'inprogress') return 'in_progress';
  if (normalized === 'completed' || normalized === 'done') return 'completed';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
  return normalized as DecisionCollaborativeSubTaskStatus;
}

export function labelForCollaborativeSubTaskStatus(
  status: string | undefined | null,
): string {
  if (!status) return '待处理';
  const canonical = normalizeCollaborativeSubTaskStatus(status);
  const match = DECISION_COLLAB_SUBTASK_STATUS_OPTIONS.find((option) => option.value === canonical);
  return match?.label ?? status;
}

/** @deprecated 使用 labelForCollaborativeSubTaskStatus */
export const decisionCollaborativeSubTaskStatusLabel = labelForCollaborativeSubTaskStatus;

/** apply 自动 seed 规则（与后端 semanticKey 映射一致） */
export function resolveAutoSuggestedSubTaskKinds(
  semanticKey: string | undefined | null,
): DecisionCollaborativeSubTaskKind[] {
  const key = (semanticKey ?? '').trim().toUpperCase();
  if (!key) return ['TEAM_CONFIRM'];

  if (key.startsWith('ROAD_SEGMENT_') || key.includes('FEASIBILITY_FAILURE')) {
    return ['TEAM_CONFIRM', 'BOOKING_FOLLOWUP'];
  }

  if (
    key.startsWith('BOOKING_') ||
    key.includes('ACCOMMODATION') ||
    key.includes('LODGING') ||
    key.includes('住宿')
  ) {
    return ['ACCOMMODATION_LOOKUP', 'CANCELLATION_POLICY'];
  }

  return ['TEAM_CONFIRM'];
}

export interface CollaborativeFollowUpPreview {
  semanticKey: string;
  kinds: DecisionCollaborativeSubTaskKind[];
  items: Array<{
    kind: DecisionCollaborativeSubTaskKind;
    title: string;
    label: string;
    status: DecisionCollaborativeSubTaskStatus;
  }>;
}

/** semanticKey 预览：apply 前展示将自动 seed 的跟进项 */
export function previewCollaborativeFollowUps(
  semanticKey: string | undefined | null,
): CollaborativeFollowUpPreview {
  const normalizedKey = (semanticKey ?? '').trim();
  const kinds = resolveAutoSuggestedSubTaskKinds(normalizedKey);
  return {
    semanticKey: normalizedKey,
    kinds,
    items: kinds.map((kind) => {
      const title = decisionCollaborativeSubTaskKindLabel(kind);
      return {
        kind,
        title,
        label: title,
        status: 'pending' as const,
      };
    }),
  };
}

/** 按 semanticKey 构建 suggestedSubTasks 预览/占位（与 apply 响应同形） */
export function buildSuggestedSubTasks(
  semanticKey: string | undefined | null,
  options?: { resolutionId?: string },
): DecisionCollaborativeSubTaskView[] {
  const preview = previewCollaborativeFollowUps(semanticKey);
  const resolutionId = options?.resolutionId?.trim() || 'preview';

  return preview.items.map((item, index) => ({
    id: `suggested_${item.kind.toLowerCase()}_${index}`,
    resolutionId,
    title: item.title,
    kind: item.kind,
    status: item.status,
  }));
}

export function decisionCollaborativeSubTaskKindLabel(
  kind: string | undefined | null,
): string {
  if (!kind) return '其他';
  const normalized = kind.trim().toUpperCase() as DecisionCollaborativeSubTaskKind;
  return DECISION_COLLABORATIVE_SUB_TASK_KIND_LABELS[normalized] ?? kind;
}

export function normalizeDecisionCollaborativeSubTask(
  raw: unknown,
): DecisionCollaborativeSubTaskView | null {
  const record = asRecord(raw);
  if (!record) return null;

  const id = String(record.id ?? record.subTaskId ?? record.sub_task_id ?? '').trim();
  const resolutionId = String(record.resolutionId ?? record.resolution_id ?? '').trim();
  const title = String(record.title ?? '').trim();
  const kind = String(record.kind ?? 'OTHER').trim() as DecisionCollaborativeSubTaskKind;

  if (!id || !resolutionId || !title) return null;

  return {
    id,
    resolutionId,
    title,
    kind,
    description: typeof record.description === 'string' ? record.description : undefined,
    assigneeUserId:
      typeof record.assigneeUserId === 'string'
        ? record.assigneeUserId
        : typeof record.assignee_user_id === 'string'
          ? record.assignee_user_id
          : null,
    status: normalizeCollaborativeSubTaskStatus(record.status ?? record.subTaskStatus),
    createdAt:
      typeof record.createdAt === 'string'
        ? record.createdAt
        : typeof record.created_at === 'string'
          ? record.created_at
          : undefined,
  };
}

export function normalizeListDecisionCollaborativeSubTasksResponse(
  raw: unknown,
): ListDecisionCollaborativeSubTasksResponse {
  const record = asRecord(raw);
  const itemsRaw = record?.items ?? record?.subTasks ?? record?.sub_tasks;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw
        .map(normalizeDecisionCollaborativeSubTask)
        .filter((item): item is DecisionCollaborativeSubTaskView => item != null)
    : [];

  return { items };
}

export function normalizeCreateDecisionCollaborativeSubTaskResponse(
  raw: unknown,
): CreateDecisionCollaborativeSubTaskResponse {
  const record = asRecord(raw);
  const subTaskRaw = record?.subTask ?? record?.sub_task ?? record;
  const subTask = normalizeDecisionCollaborativeSubTask(subTaskRaw);
  if (!subTask) {
    throw new Error('无效的协作子任务响应');
  }
  return { subTask };
}

export function normalizePatchDecisionCollaborativeSubTaskResponse(
  raw: unknown,
): PatchDecisionCollaborativeSubTaskResponse {
  const record = asRecord(raw) ?? {};
  const subTaskRaw = record.subTask ?? record.sub_task ?? record;
  const subTask = normalizeDecisionCollaborativeSubTask(subTaskRaw);
  if (!subTask) {
    throw new Error('无效的协作子任务更新响应');
  }
  return {
    schemaId:
      typeof record.schemaId === 'string'
        ? record.schemaId
        : typeof record.schema_id === 'string'
          ? record.schema_id
          : DECISION_COLLABORATIVE_SUBTASK_UPDATE_SCHEMA_ID,
    subTask,
  };
}

export function normalizeSuggestedSubTasks(raw: unknown): DecisionCollaborativeSubTaskView[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeDecisionCollaborativeSubTask)
    .filter((item): item is DecisionCollaborativeSubTaskView => item != null);
}

export function decisionCollaborativeSubTasksQueryKey(
  tripId: string,
  problemId: string,
  resolutionId?: string | null,
): readonly string[] {
  const key = ['trips', tripId, 'decision-problems', problemId, 'collaborative-sub-tasks'];
  return resolutionId ? [...key, resolutionId] : key;
}

export function isCollabSubtaskResolutionMismatchError(err: unknown): boolean {
  if (err instanceof Error && /COLLAB_SUBTASK_RESOLUTION_MISMATCH/i.test(err.message)) {
    return true;
  }
  return false;
}

export function collabSubtaskResolutionMismatchMessage(): string {
  return '协作子任务 API 暂不可用，已改为本地记录；不影响应用到行程。';
}

export interface StructuredSuggestedFollowUp {
  kind: DecisionCollaborativeSubTaskKind;
  title: string;
  description?: string;
}

/** resolutions.suggestedFollowUps — 保留 kind / title / description */
export function normalizeStructuredSuggestedFollowUps(raw: unknown): StructuredSuggestedFollowUp[] {
  if (!Array.isArray(raw)) return [];
  const result: StructuredSuggestedFollowUp[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const title = item.trim();
      if (title) result.push({ kind: 'OTHER', title });
      continue;
    }
    const record = asRecord(item);
    if (!record) continue;
    const title = String(record.title ?? record.label ?? record.text ?? '').trim();
    if (!title) continue;
    const kindRaw = String(record.kind ?? 'OTHER').trim().toUpperCase();
    const kind = (DECISION_COLLABORATIVE_SUB_TASK_KIND_LABELS[
      kindRaw as DecisionCollaborativeSubTaskKind
    ]
      ? kindRaw
      : 'OTHER') as DecisionCollaborativeSubTaskKind;
    const description =
      typeof record.description === 'string' ? record.description.trim() : undefined;
    result.push({ kind, title, description });
  }
  return result;
}

export function buildLocalCollaborativeFollowUp(input: {
  resolutionId: string;
  title: string;
  kind: DecisionCollaborativeSubTaskKind;
  description?: string;
}): DecisionCollaborativeSubTaskView {
  return {
    id: `local_followup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    resolutionId: input.resolutionId,
    title: input.title,
    kind: input.kind,
    description: input.description,
    status: 'pending',
  };
}

export function isLocalCollaborativeFollowUpId(id: string | undefined | null): boolean {
  return String(id ?? '').startsWith('local_followup_');
}

/** submit / apply 返回的协作绑定（子任务 API 须与此 resolutionId 一致） */
export function resolveCollaborativeTaskBinding(input: {
  problemId: string;
  collaborativeTask?: ApplyDecisionCollaborativeTaskView | null;
  resolution?: { resolutionId?: string | null } | null;
  actionPlanId?: string | null;
}): {
  problemId: string;
  resolutionId?: string;
  actionPlanId?: string;
} {
  const resolutionId =
    collaborativeTask?.resolutionId?.trim() ||
    input.resolution?.resolutionId?.trim() ||
    undefined;
  const problemId =
    collaborativeTask?.decisionProblemId?.trim() ||
    collaborativeTask?.problemId?.trim() ||
    input.problemId;
  const actionPlanId =
    collaborativeTask?.actionPlanId?.trim() || input.actionPlanId?.trim() || undefined;

  return {
    problemId,
    resolutionId,
    actionPlanId,
  };
}
