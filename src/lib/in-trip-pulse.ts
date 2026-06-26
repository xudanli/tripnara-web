import type { ThermometerLevel } from '@/types/in-trip-execution';
import type {
  DecisionFatigueLevel,
  EmotionalLevel,
  PhysicalLevel,
  SocialLevel,
  SpendingLevel,
} from '@/types/in-trip-pulse';

export const MOOD_CHECK_LABELS: Record<number, string> = {
  1: '不太想动',
  2: '有点累',
  3: '一般',
  4: '不错',
  5: '精力充沛',
};

export function physicalLevelLabel(level: PhysicalLevel): string {
  const map: Record<PhysicalLevel, string> = {
    energetic: '充沛',
    normal: '正常',
    fatigued: '疲劳',
    exhausted: '极限',
  };
  return map[level];
}

export function emotionalLevelLabel(level: EmotionalLevel): string {
  const map: Record<EmotionalLevel, string> = {
    joyful: '愉悦',
    stable: '平稳',
    low: '低落',
    irritable: '烦躁',
  };
  return map[level];
}

export function spendingLevelLabel(level: SpendingLevel): string {
  const map: Record<SpendingLevel, string> = {
    surplus: '充裕',
    normal: '正常',
    tight: '紧张',
    overspent: '超支',
  };
  return map[level];
}

export function socialLevelLabel(level: SocialLevel): string {
  const map: Record<SocialLevel, string> = {
    harmonious: '融洽',
    normal: '正常',
    subtle: '微妙',
    tense: '紧张',
  };
  return map[level];
}

export function decisionFatigueLabel(level: DecisionFatigueLevel): string {
  const map: Record<DecisionFatigueLevel, string> = {
    fresh: '清醒',
    normal: '正常',
    fatigued: '疲劳',
    depleted: '耗尽',
  };
  return map[level];
}

export function thermometerScoreToWidth(score: number): string {
  return `${Math.round(Math.min(Math.max(score, 0), 1) * 100)}%`;
}

export function interventionLevelLabel(level: number): string {
  if (level >= 3) return '建议分组探索';
  if (level === 2) return '主动调解';
  return '柔性助推';
}
