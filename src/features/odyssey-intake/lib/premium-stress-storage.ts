import type { PremiumStressAnswerChoice } from '@/types/odyssey-travel-persona';
import type { MbtiType } from '@/types/odyssey-travel-persona';

export const PREMIUM_INTAKE_STORAGE_KEY = 'odyssey-intake-premium';

export type StoredPremiumIntake = {
  mbtiType: MbtiType;
  /** key = GET /premium-stress-test/questions 返回的 id */
  stressAnswers: Record<string, PremiumStressAnswerChoice>;
  /** 与提交 answers[] 顺序一致，用于客户端计分对齐 fallback 槽位 */
  questionIds: string[];
  completedAt: string;
};

export function readStoredPremiumIntake(): StoredPremiumIntake | null {
  try {
    const raw = localStorage.getItem(PREMIUM_INTAKE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPremiumIntake;
    if (!parsed?.mbtiType || !parsed.stressAnswers) return null;
    return {
      ...parsed,
      questionIds: parsed.questionIds ?? Object.keys(parsed.stressAnswers),
    };
  } catch {
    return null;
  }
}

export function writeStoredPremiumIntake(payload: Omit<StoredPremiumIntake, 'completedAt'>): void {
  localStorage.setItem(
    PREMIUM_INTAKE_STORAGE_KEY,
    JSON.stringify({
      ...payload,
      completedAt: new Date().toISOString(),
    } satisfies StoredPremiumIntake)
  );
}

/** 按提交顺序取第 N 题答案（0=资源挤兑语义，1=分工，2=溢价消费） */
export function stressAnswerAtSlot(
  stored: Pick<StoredPremiumIntake, 'stressAnswers' | 'questionIds'>,
  slotIndex: number
): PremiumStressAnswerChoice | undefined {
  const orderedId = stored.questionIds[slotIndex];
  if (orderedId && stored.stressAnswers[orderedId]) {
    return stored.stressAnswers[orderedId];
  }
  const legacyIds = ['resource_crunch', 'team_division', 'premium_spend'] as const;
  const legacyId = legacyIds[slotIndex];
  return legacyId ? stored.stressAnswers[legacyId] : undefined;
}
