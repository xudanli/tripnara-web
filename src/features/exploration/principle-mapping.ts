import type { ConsumerPrincipleId } from './types';

/** 后端 Exploration principles catalog 枚举 — PUT /principles 校验 SSOT */
export type ExplorationApiPrincipleId =
  | 'LOW_DRIVING'
  | 'NO_NIGHT_DRIVING'
  | 'CORE_EXPERIENCE_FIRST'
  | 'REMOTE_EXPLORATION'
  | 'BUDGET_FLEXIBLE'
  | 'STAY_STABILITY';

/** Consumer 卡片 id → API principleId */
export const CONSUMER_TO_API_PRINCIPLE: Record<ConsumerPrincipleId, ExplorationApiPrincipleId> = {
  pace: 'LOW_DRIVING',
  safety: 'NO_NIGHT_DRIVING',
  experience: 'CORE_EXPERIENCE_FIRST',
  coverage: 'REMOTE_EXPLORATION',
  budget: 'BUDGET_FLEXIBLE',
  lodging: 'STAY_STABILITY',
};

export function toApiPrinciples(
  ordered: ConsumerPrincipleId[],
): Array<{ principleId: ExplorationApiPrincipleId; rank: number }> {
  return ordered.map((id, index) => ({
    principleId: CONSUMER_TO_API_PRINCIPLE[id],
    rank: index + 1,
  }));
}
