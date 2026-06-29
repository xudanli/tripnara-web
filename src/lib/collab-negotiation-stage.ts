import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import type { PreferenceRoundDetail } from '@/types/process-fairness';

export type NegotiationStageStepId =
  | 'propose'
  | 'clarify_views'
  | 'clarify_followup'
  | 'optimize_options'
  | 'recommendation';

export interface NegotiationStageStep {
  id: NegotiationStageStepId;
  label: string;
}

export const NEGOTIATION_STAGE_STEPS: NegotiationStageStep[] = [
  { id: 'propose', label: '提出议题' },
  { id: 'clarify_views', label: '澄清观点' },
  { id: 'clarify_followup', label: '澄清追问' },
  { id: 'optimize_options', label: '优化选项' },
  { id: 'recommendation', label: '形成建议' },
];

export interface CollabNegotiationOption {
  id: string;
  label: string;
  title: string;
  advantage: string;
  concern: string;
  supportPct: number;
}

export interface CollabSpeakerSlot {
  userId: string;
  displayName: string;
  isCurrent: boolean;
  hasSpoken: boolean;
}

/** 从任务与轮次状态推断协商进度步 */
export function resolveNegotiationStageStep(
  task: DomainNegotiationTask,
  detail: PreferenceRoundDetail | null,
): NegotiationStageStepId {
  if (task.status === 'consensus_reached') return 'recommendation';
  if (task.status === 'pending') return 'propose';

  if (!detail) return 'clarify_views';

  if (detail.status === 'closed') return 'recommendation';
  if (detail.status === 'synthesizing') return 'optimize_options';

  if (detail.utterances.length === 0) return 'clarify_views';

  const spokenCount = new Set(detail.utterances.map((u) => u.userId)).size;
  const totalSpeakers = detail.turnOrder.length || spokenCount;

  if (spokenCount < Math.min(2, totalSpeakers)) return 'clarify_views';
  if (detail.currentTurn < totalSpeakers - 1) return 'clarify_followup';

  return 'optimize_options';
}

export function resolveNegotiationStageIndex(stepId: NegotiationStageStepId): number {
  return NEGOTIATION_STAGE_STEPS.findIndex((s) => s.id === stepId);
}

function truncate(text: string, max = 72): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/** 从发言与被听见率构建 A/B/C 选项对比（v1 启发式，无独立 synthesis API） */
export function buildNegotiationOptions(
  detail: PreferenceRoundDetail | null,
  task: DomainNegotiationTask,
): CollabNegotiationOption[] {
  if (!detail) return [];

  if (detail.heardRates?.length) {
    return detail.heardRates.slice(0, 3).map((hr, index) => {
      const utterance = detail.utterances.find((u) => u.userId === hr.userId);
      const intervention = detail.interventions.find((i) => i.targetUserId === hr.userId);
      return {
        id: hr.userId,
        label: String.fromCharCode(65 + index),
        title: `${hr.displayName} · ${task.title}`,
        advantage: utterance ? truncate(utterance.content) : '已表达核心偏好',
        concern: intervention ? truncate(intervention.messageCN, 48) : '暂无显著顾虑',
        supportPct: Math.round(hr.heardRate * 100),
      };
    });
  }

  const seen = new Set<string>();
  const options: CollabNegotiationOption[] = [];

  for (const utterance of detail.utterances) {
    if (seen.has(utterance.userId)) continue;
    seen.add(utterance.userId);
    if (options.length >= 3) break;

    const index = options.length;
    options.push({
      id: utterance.userId,
      label: String.fromCharCode(65 + index),
      title: `${utterance.displayName} · ${task.title}`,
      advantage: truncate(utterance.content),
      concern: utterance.reason ? truncate(utterance.reason, 48) : '待进一步澄清',
      supportPct: Math.max(20, 70 - index * 12),
    });
  }

  return options;
}

/** 发言顺序 Avatar 条 */
export function buildSpeakerSlots(detail: PreferenceRoundDetail | null): CollabSpeakerSlot[] {
  if (!detail) return [];

  const nameByUserId = new Map<string, string>();
  for (const u of detail.utterances) {
    nameByUserId.set(u.userId, u.displayName);
  }
  for (const hr of detail.heardRates ?? []) {
    nameByUserId.set(hr.userId, hr.displayName);
  }

  const spoken = new Set(detail.utterances.map((u) => u.userId));
  const order = detail.turnOrder.length > 0 ? detail.turnOrder : [...spoken];

  return order.map((userId) => ({
    userId,
    displayName: nameByUserId.get(userId) ?? '成员',
    isCurrent: detail.currentSpeakerUserId === userId && detail.status === 'collecting',
    hasSpoken: spoken.has(userId),
  }));
}
