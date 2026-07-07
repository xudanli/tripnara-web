import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Calendar,
  Car,
  Clock3,
  Cloud,
  Eye,
  History,
  Minus,
  Radio,
  Route,
  Shield,
  Users,
} from 'lucide-react';
import { pickRecommendedOption } from '@/dto/frontend-planning-decision-card.util';
import type {
  PlanningDecisionPack,
  PlanningDecisionPackOption,
} from '@/dto/frontend-planning-decision-pack.types';

/** dataBasis[].icon → Lucide 组件 */
export const DATA_BASIS_ICON_KEYS: Record<string, LucideIcon> = {
  time: Clock3,
  calendar: Calendar,
  clock: Clock3,
  route: Route,
  member: Users,
  users: Users,
  person: Users,
  no_route: Eye,
  eye: Eye,
  skip_route: Eye,
  risk: AlertTriangle,
  warning: AlertTriangle,
  traffic: Car,
  checkpoint: Shield,
  sensor: Radio,
  weather: Cloud,
  history: History,
  default: Minus,
};

export function resolveDataBasisIcon(iconKey: string | undefined): LucideIcon {
  const normalized = String(iconKey ?? 'default').toLowerCase().trim();
  return DATA_BASIS_ICON_KEYS[normalized] ?? DATA_BASIS_ICON_KEYS.default!;
}

/** 主标题：headline 优先，回退 title */
export function getOptionDisplayTitle(option: PlanningDecisionPackOption): string {
  return option.headline?.trim() || option.title?.trim() || '';
}

/** 「方案 A」角标 */
export function getOptionBadge(option: PlanningDecisionPackOption, index = 0): string {
  if (option.badge?.trim()) return option.badge.trim();
  const letter = option.letter?.trim() || String.fromCharCode(65 + index);
  return `方案 ${letter}`;
}

/** 从 decisionPack 取推荐项 */
export function getRecommendedOption(
  pack: PlanningDecisionPack | null | undefined,
): PlanningDecisionPackOption | null {
  return pickRecommendedOption(pack?.options);
}

export function getOptionLetter(option: PlanningDecisionPackOption, index = 0): string {
  return option.letter?.trim() || String.fromCharCode(65 + index);
}

/** 结构化 outcomeItems 优先，回退 outcomes[] */
export function resolveOptionOutcomeItems(
  option: PlanningDecisionPackOption,
): Array<{ id?: string; text: string; tone: 'good' | 'caution' | 'risk' | 'neutral' }> {
  if (option.outcomeItems?.length) {
    return option.outcomeItems.map((item) => ({
      ...(item.id ? { id: item.id } : {}),
      text: item.text,
      tone: normalizeItemTone(item.tone, 'good'),
    }));
  }
  return (option.outcomes ?? []).map((text) => ({ text, tone: 'good' as const }));
}

/** 结构化 costItems 优先，回退 costs[] */
export function resolveOptionCostItems(
  option: PlanningDecisionPackOption,
  optionKind?: string,
): Array<{ id?: string; text: string; tone: 'good' | 'caution' | 'risk' | 'neutral' }> {
  const defaultTone =
    String(optionKind ?? option.optionKind).toUpperCase() === 'ACCEPT_RISK' ? 'risk' : 'caution';

  if (option.costItems?.length) {
    return option.costItems.map((item) => ({
      ...(item.id ? { id: item.id } : {}),
      text: item.text,
      tone: normalizeItemTone(item.tone, defaultTone),
    }));
  }
  return (option.costs ?? []).map((text) => ({ text, tone: defaultTone }));
}

function normalizeItemTone(
  tone: string | undefined,
  fallback: 'good' | 'caution' | 'risk' | 'neutral',
): 'good' | 'caution' | 'risk' | 'neutral' {
  const raw = String(tone ?? '').toLowerCase();
  if (raw === 'good' || raw === 'success' || raw === 'allow') return 'good';
  if (raw === 'risk' || raw === 'danger' || raw === 'reject' || raw === 'error') return 'risk';
  if (raw === 'neutral' || raw === 'info') return 'neutral';
  if (raw === 'caution' || raw === 'warn' || raw === 'warning' || raw === 'confirm') return 'caution';
  return fallback;
}
