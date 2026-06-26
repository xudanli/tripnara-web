import type {
  BudgetAllocations,
  BudgetStructure,
  BudgetStructureMode,
  SpendingPersona,
  StructureVsActual,
  TripBudgetIntent,
} from '@/types/trip-budget';
import type { CostCategory, TripCostSummary } from '@/types/trip';
import type { LucideIcon } from 'lucide-react';
import { Plane, Building2, Ticket, Utensils, MoreHorizontal } from 'lucide-react';

const STORAGE_KEY = (tripId: string) => `trip_budget_structure_${tripId}`;

export const BUDGET_INTENT_PRESETS = [5000, 10000, 30000] as const;

export const STRUCTURE_CATEGORY_META: Array<{
  key: keyof BudgetAllocations;
  labelZh: string;
  labelEn: string;
  costCategory: CostCategory;
  icon: LucideIcon;
}> = [
  { key: 'transportation', labelZh: '机票/交通', labelEn: 'Transport', costCategory: 'TRANSPORTATION', icon: Plane },
  { key: 'accommodation', labelZh: '酒店/住宿', labelEn: 'Stay', costCategory: 'ACCOMMODATION', icon: Building2 },
  { key: 'experience', labelZh: '体验/活动', labelEn: 'Experience', costCategory: 'ACTIVITIES', icon: Ticket },
  { key: 'food', labelZh: '餐饮', labelEn: 'Food', costCategory: 'FOOD', icon: Utensils },
  { key: 'other', labelZh: '其他', labelEn: 'Other', costCategory: 'OTHER', icon: MoreHorizontal },
];

export const SPENDING_PERSONA_PRESETS: Array<{
  persona: SpendingPersona;
  labelZh: string;
  labelEn: string;
  percentages: BudgetAllocations;
}> = [
  {
    persona: 'experience',
    labelZh: '体验型',
    labelEn: 'Experience-first',
    percentages: { transportation: 25, accommodation: 5, experience: 50, food: 20, other: 0 },
  },
  {
    persona: 'quality',
    labelZh: '品质型',
    labelEn: 'Quality stay',
    percentages: { transportation: 20, accommodation: 40, experience: 25, food: 15, other: 0 },
  },
  {
    persona: 'frugal',
    labelZh: '节俭型',
    labelEn: 'Frugal',
    percentages: { transportation: 25, accommodation: 15, experience: 15, food: 45, other: 0 },
  },
  {
    persona: 'efficiency',
    labelZh: '效率型',
    labelEn: 'Time is money',
    percentages: { transportation: 40, accommodation: 20, experience: 25, food: 15, other: 0 },
  },
];

export const SPENDING_PERSONA_LABEL: Record<SpendingPersona, { zh: string; en: string }> = {
  experience: { zh: '体验型', en: 'Experience-first' },
  quality: { zh: '品质型', en: 'Quality stay' },
  frugal: { zh: '节俭型', en: 'Frugal' },
  efficiency: { zh: '效率型', en: 'Efficiency' },
  balanced: { zh: '均衡型', en: 'Balanced' },
};

export function emptyAllocations(): BudgetAllocations {
  return { transportation: 0, accommodation: 0, experience: 0, food: 0, other: 0 };
}

export function equalAllocations(total: number): BudgetAllocations {
  const base = Math.floor(total / 4);
  const remainder = total - base * 4;
  return {
    transportation: base + (remainder > 0 ? 1 : 0),
    accommodation: base + (remainder > 1 ? 1 : 0),
    experience: base + (remainder > 2 ? 1 : 0),
    food: base,
    other: 0,
  };
}

export function allocationsFromPercentages(total: number, percentages: BudgetAllocations): BudgetAllocations {
  const keys = Object.keys(percentages) as (keyof BudgetAllocations)[];
  const raw = keys.map((k) => ({ k, v: (total * percentages[k]) / 100 }));
  const floored = raw.map(({ k, v }) => ({ k, v: Math.floor(v) }));
  let sum = floored.reduce((s, x) => s + x.v, 0);
  let i = 0;
  while (sum < total && floored.length > 0) {
    floored[i % floored.length].v += 1;
    sum += 1;
    i += 1;
  }
  return floored.reduce((acc, { k, v }) => ({ ...acc, [k]: v }), emptyAllocations());
}

export function allocationsToPercentages(total: number, allocations: BudgetAllocations): BudgetAllocations {
  if (total <= 0) return emptyAllocations();
  return {
    transportation: Math.round((allocations.transportation / total) * 1000) / 10,
    accommodation: Math.round((allocations.accommodation / total) * 1000) / 10,
    experience: Math.round((allocations.experience / total) * 1000) / 10,
    food: Math.round((allocations.food / total) * 1000) / 10,
    other: Math.round((allocations.other / total) * 1000) / 10,
  };
}

export function sumAllocations(allocations: BudgetAllocations): number {
  return (
    allocations.transportation +
    allocations.accommodation +
    allocations.experience +
    allocations.food +
    allocations.other
  );
}

export function inferSpendingPersona(
  allocations: BudgetAllocations,
  total: number,
): { persona: SpendingPersona; confidence: number } {
  if (total <= 0) return { persona: 'balanced', confidence: 0 };

  const pct = allocationsToPercentages(total, allocations);
  const ranked = (Object.entries(pct) as [keyof BudgetAllocations, number][])
    .filter(([k]) => k !== 'other')
    .sort((a, b) => b[1] - a[1]);
  const top = ranked[0];
  const second = ranked[1];
  const confidence = Math.min(1, Math.max(0, (top[1] - (second?.[1] ?? 0)) / 40));

  if (pct.experience >= 35 && top[0] === 'experience') return { persona: 'experience', confidence };
  if (pct.accommodation >= 35 && top[0] === 'accommodation') return { persona: 'quality', confidence };
  if (pct.accommodation <= 15 && pct.experience <= 20) return { persona: 'frugal', confidence: 0.7 };
  if (pct.transportation >= 30 && pct.experience <= 25) return { persona: 'efficiency', confidence: 0.75 };
  return { persona: 'balanced', confidence: 0.5 };
}

export function buildBudgetStructure(
  mode: BudgetStructureMode,
  input: { allocations?: BudgetAllocations; percentages?: BudgetAllocations },
  total: number,
): BudgetStructure {
  const allocations =
    mode === 'percent' && input.percentages
      ? allocationsFromPercentages(total, input.percentages)
      : input.allocations ?? emptyAllocations();
  const { persona, confidence } = inferSpendingPersona(allocations, total);
  return {
    mode,
    allocations,
    percentages: allocationsToPercentages(total, allocations),
    spendingPersona: persona,
    personaConfidence: confidence,
    updatedAt: new Date().toISOString(),
  };
}

export function validateStructureSum(allocations: BudgetAllocations, total: number): boolean {
  return Math.abs(sumAllocations(allocations) - total) <= 1;
}

export function loadBudgetStructureLocal(tripId: string): BudgetStructure | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(tripId));
    if (!raw) return null;
    return JSON.parse(raw) as BudgetStructure;
  } catch {
    return null;
  }
}

export function saveBudgetStructureLocal(tripId: string, structure: BudgetStructure): void {
  localStorage.setItem(STORAGE_KEY(tripId), JSON.stringify(structure));
}

export function costSummaryToBreakdown(summary: TripCostSummary | null): BudgetAllocations {
  if (!summary?.byCategory) return emptyAllocations();
  const c = summary.byCategory;
  return {
    transportation: c.TRANSPORTATION?.estimated ?? 0,
    accommodation: c.ACCOMMODATION?.estimated ?? 0,
    experience: c.ACTIVITIES?.estimated ?? 0,
    food: c.FOOD?.estimated ?? 0,
    other: (c.OTHER?.estimated ?? 0) + (c.SHOPPING?.estimated ?? 0),
  };
}

export function computeStructureVsActual(
  structure: BudgetStructure | null,
  summary: TripCostSummary | null,
): Partial<StructureVsActual> | undefined {
  if (!structure || !summary?.byCategory) return undefined;
  const result = {} as StructureVsActual;
  for (const meta of STRUCTURE_CATEGORY_META) {
    const intent = structure.allocations[meta.key];
    const cat = summary.byCategory[meta.costCategory];
    const estimated = cat?.estimated ?? 0;
    const actual = cat?.actual ?? 0;
    const variance = estimated - intent;
    const variancePercent = intent > 0 ? (variance / intent) * 100 : estimated > 0 ? 100 : 0;
    result[meta.key] = { intent, estimated, actual, variance, variancePercent };
  }
  return result;
}

export function intentFromConstraint(
  total: number | undefined,
  currency: string | undefined,
): TripBudgetIntent | null {
  if (!total || total <= 0) return null;
  return {
    total,
    currency: currency ?? 'CNY',
    source: 'imported',
    setAt: new Date().toISOString(),
  };
}
