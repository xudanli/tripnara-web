import type { RouteAndRunResponse } from '@/api/agent';
import type {
  OpenWorldDiscoveryPayload,
  OpenWorldVerificationTask,
  VerificationTaskPriority,
  VerificationTaskStatus,
} from '@/types/open-world-discovery';
import { isOpenWorldDiscoveryPayload } from '@/types/open-world-discovery';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function pickStr(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

function pickNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
}

function pickStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

function normalizePriority(v: unknown): VerificationTaskPriority {
  const s = pickStr(v);
  if (s === 'P0' || s === 'P1') return s;
  return 'P1';
}

function normalizeStatus(v: unknown): VerificationTaskStatus {
  const s = pickStr(v);
  if (s === 'pending' || s === 'in_progress' || s === 'done') return s;
  return 'pending';
}

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1 };
const STATUS_ORDER: Record<string, number> = { pending: 0, in_progress: 1, done: 2 };

export function normalizeVerificationTask(v: unknown, index: number): OpenWorldVerificationTask | null {
  if (!isRecord(v)) return null;

  const title_zh = pickStr(v.title_zh) ?? pickStr(v.titleZh);
  if (!title_zh) return null;

  const task_id = pickStr(v.task_id) ?? pickStr(v.taskId) ?? `verification-task-${index}`;
  const stub_id = pickStr(v.stub_id) ?? pickStr(v.stubId) ?? task_id;

  const promoted_place_id =
    pickNum(v.promoted_place_id) ?? pickNum(v.promotedPlaceId);

  return {
    task_id,
    stub_id,
    title_zh,
    ...(pickStr(v.description_zh) ?? pickStr(v.descriptionZh)
      ? { description_zh: pickStr(v.description_zh) ?? pickStr(v.descriptionZh) }
      : {}),
    priority: normalizePriority(v.priority),
    constraint_tags: pickStringArray(v.constraint_tags ?? v.constraintTags),
    status: normalizeStatus(v.status),
    cta_label_zh:
      pickStr(v.cta_label_zh) ??
      pickStr(v.ctaLabelZh) ??
      '标记已核实',
    ...(promoted_place_id != null ? { promoted_place_id } : {}),
  };
}

/** P0 优先；同优先级 pending / in_progress 在 done 之前 */
export function sortVerificationTasks(
  tasks: OpenWorldVerificationTask[]
): OpenWorldVerificationTask[] {
  return [...tasks].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 99;
    const pb = PRIORITY_ORDER[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    const sa = STATUS_ORDER[a.status] ?? 99;
    const sb = STATUS_ORDER[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    return a.title_zh.localeCompare(b.title_zh, 'zh-CN');
  });
}

export function normalizeOpenWorldDiscovery(raw: unknown): OpenWorldDiscoveryPayload | null {
  if (!isOpenWorldDiscoveryPayload(raw)) return null;

  const verification_tasks = raw.verification_tasks
    .map((task, idx) => normalizeVerificationTask(task, idx))
    .filter(Boolean) as OpenWorldVerificationTask[];

  if (!verification_tasks.length) return null;

  return {
    schema: 'tripnara.open_world_discovery@v1',
    ...(pickStr(raw.sparse_profile_id) ?? pickStr(raw.sparseProfileId)
      ? { sparse_profile_id: pickStr(raw.sparse_profile_id) ?? pickStr(raw.sparseProfileId) }
      : {}),
    mention_count: pickNum(raw.mention_count) ?? pickNum(raw.mentionCount) ?? 0,
    stub_count: pickNum(raw.stub_count) ?? pickNum(raw.stubCount) ?? verification_tasks.length,
    verification_tasks: sortVerificationTasks(verification_tasks),
    ...(pickStr(raw.intentional_slack_summary_zh) ?? pickStr(raw.intentionalSlackSummaryZh)
      ? {
          intentional_slack_summary_zh:
            pickStr(raw.intentional_slack_summary_zh) ?? pickStr(raw.intentionalSlackSummaryZh),
        }
      : {}),
    ...(pickStr(raw.computed_at) ?? pickStr(raw.computedAt)
      ? { computed_at: pickStr(raw.computed_at) ?? pickStr(raw.computedAt) }
      : {}),
  };
}

function pickRawOpenWorldDiscovery(payload: Record<string, unknown> | undefined): unknown {
  if (!payload) return undefined;
  const uiDisplay = isRecord(payload.ui_display) ? payload.ui_display : undefined;
  return uiDisplay?.open_world_discovery;
}

/**
 * SUCCESS 后读取：`result.payload.ui_display.open_world_discovery`
 * （DecisionUiDisplayDto / enrichClientUiDisplay）
 */
export function pickOpenWorldDiscoveryFromRouteRun(
  response: RouteAndRunResponse
): OpenWorldDiscoveryPayload | null {
  if (response.result?.status !== 'OK') return null;

  const payload = response.result?.payload as Record<string, unknown> | undefined;
  return normalizeOpenWorldDiscovery(pickRawOpenWorldDiscovery(payload));
}

export function hasOpenWorldDiscoveryUi(
  discovery: OpenWorldDiscoveryPayload | null | undefined
): boolean {
  return Boolean(discovery?.verification_tasks?.length);
}

export function countPendingVerificationTasks(
  discovery: OpenWorldDiscoveryPayload
): number {
  return discovery.verification_tasks.filter((t) => t.status !== 'done').length;
}

export function countDoneVerificationTasks(discovery: OpenWorldDiscoveryPayload): number {
  return discovery.verification_tasks.filter((t) => t.status === 'done').length;
}

export function mergeVerificationTaskStatus(
  discovery: OpenWorldDiscoveryPayload,
  taskId: string,
  status: VerificationTaskStatus
): OpenWorldDiscoveryPayload {
  return {
    ...discovery,
    verification_tasks: sortVerificationTasks(
      discovery.verification_tasks.map((task) =>
        task.task_id === taskId ? { ...task, status } : task
      )
    ),
  };
}

export function priorityLabel(priority: VerificationTaskPriority): string {
  if (priority === 'P0') return '必核';
  if (priority === 'P1') return '建议核';
  return priority;
}

export function statusLabel(status: VerificationTaskStatus): string {
  if (status === 'done') return '已核实';
  if (status === 'in_progress') return '核实中';
  return '待核实';
}

export function isVerificationTaskActionable(task: OpenWorldVerificationTask): boolean {
  return task.status === 'pending' || task.status === 'in_progress';
}

/** constraint_tags 常见值 → 人话标签 */
export const OPEN_WORLD_CONSTRAINT_TAG_LABELS: Record<string, string> = {
  weather_window: '天气窗口',
  guide_required: '需向导',
  permit_required: '需许可',
  bear_zone_buffer: '防熊缓冲区',
};

export function constraintTagLabel(tag: string): string {
  return OPEN_WORLD_CONSTRAINT_TAG_LABELS[tag] ?? tag;
}

/** 稀疏开放世界：勿展示「POI 不足请补全」类负面 copy */
export function shouldSuppressSparseNegativeCopy(
  discovery: OpenWorldDiscoveryPayload | null | undefined
): boolean {
  return Boolean(
    discovery &&
      (hasOpenWorldDiscoveryUi(discovery) ||
        Boolean(discovery.intentional_slack_summary_zh?.trim()))
  );
}

/** narration.decision_context_summary（SSOT 辅助，非 stub 列表来源） */
export function pickDecisionContextSummaryFromRouteRun(
  response: RouteAndRunResponse
): string | undefined {
  if (response.result?.status !== 'OK') return undefined;
  const payload = response.result?.payload as Record<string, unknown> | undefined;
  const narration = isRecord(payload?.narration) ? payload.narration : undefined;
  return (
    pickStr(narration?.decision_context_summary) ??
    pickStr(narration?.decisionContextSummary)
  );
}
