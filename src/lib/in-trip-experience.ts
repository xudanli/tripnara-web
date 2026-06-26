import type { ExperienceTriggerType } from '@/types/in-trip-experience';

export const EXPERIENCE_PULSE_SCORE_LABELS: Record<number, string> = {
  1: '很差',
  2: '偏差',
  3: '一般',
  4: '不错',
  5: '超预期',
};

export const EXPERIENCE_PULSE_FIELD_LABELS = {
  expectationConfirmation: '预期符合度',
  emotionalValueScore: '情绪价值',
  senseOfControl: '掌控感',
  spendWorthIt: '花得值',
  teamAtmosphere: '团队氛围',
} as const;

export function experienceTriggerTypeLabel(type: ExperienceTriggerType): string {
  const map: Record<ExperienceTriggerType, string> = {
    post_activity: '活动后反馈',
    post_decision: '决策后反馈',
    daily_review: '今日回顾',
    split_party: '分组汇合',
    last_day: '行程最后一天',
  };
  return map[type];
}

export function experiencePulseScoreLabel(score: number): string {
  return EXPERIENCE_PULSE_SCORE_LABELS[score] ?? String(score);
}

export function formatEmotionPolarity(polarity: number): string {
  if (polarity >= 0.5) return '积极';
  if (polarity >= 0.15) return '偏积极';
  if (polarity > -0.15) return '中性';
  if (polarity > -0.5) return '偏消极';
  return '消极';
}

export function emotionPolarityClasses(polarity: number): string {
  if (polarity >= 0.15) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (polarity > -0.15) return 'text-slate-700 bg-slate-50 border-slate-200';
  return 'text-rose-700 bg-rose-50 border-rose-200';
}

export function weightDeltaLabel(delta: number): string {
  if (delta > 0) return `+${Math.round(delta * 100)}%`;
  if (delta < 0) return `${Math.round(delta * 100)}%`;
  return '持平';
}

export function dominantPersonaLabel(persona: string): string {
  const map: Record<string, string> = {
    experience: '体验型',
    frugal: '节俭型',
    efficiency: '效率型',
    comfort: '舒适型',
    food: '美食型',
  };
  return map[persona] ?? persona;
}
