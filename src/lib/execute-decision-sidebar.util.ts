import type { FallbackPlan } from '@/api/execution';
import type { TripExecutionAdvisoryDto } from '@/types/trip-execution-advisory';

export type ExecutePlanBSafetyLevel = 'low' | 'medium' | 'high' | 'very_high';

export interface ExecutePlanBCardModel {
  id: string;
  index: number;
  code: string;
  title: string;
  description: string;
  recommended?: boolean;
  isCurrentPlan?: boolean;
  safetyLabel: string;
  safetyLevel: ExecutePlanBSafetyLevel;
  experiencePercent?: number;
  timeImpact: string;
}

export type ExecuteEmergencyContactKind = 'guide' | 'rescue' | 'insurance';

export interface ExecuteEmergencyContactModel {
  id: string;
  label: string;
  subtitle?: string;
  phone: string;
  kind?: ExecuteEmergencyContactKind;
}

export interface ExecuteAiSuggestionModel {
  primary: string;
  secondary?: string;
  evidenceLabel?: string;
}

export interface ExecuteDecisionSidebarModel {
  plans: ExecutePlanBCardModel[];
  contacts: ExecuteEmergencyContactModel[];
  aiSuggestion: ExecuteAiSuggestionModel;
}

const DEFAULT_PLANS: ExecutePlanBCardModel[] = [
  {
    id: 'plan-b-1',
    index: 1,
    code: 'Plan B-1',
    title: '推迟徒步 · 等风减弱',
    description: '延后至 14:30 重新评估风况后再执行。',
    recommended: true,
    safetyLabel: '高',
    safetyLevel: 'high',
    experiencePercent: 85,
    timeImpact: '+1h',
  },
  {
    id: 'plan-b-2',
    index: 2,
    code: 'Plan B-2',
    title: '改为温泉 + 观景',
    description: '取消冰川徒步，改为观景点 + 布迪尔温泉。',
    safetyLabel: '很高',
    safetyLevel: 'very_high',
    experiencePercent: 70,
    timeImpact: '+0.5h',
  },
  {
    id: 'plan-b-3',
    index: 3,
    code: 'Plan B-3',
    title: '分流执行（当前方案）',
    description: '徒步组尝试执行，休息组改为咖啡馆 / 酒店。',
    isCurrentPlan: true,
    safetyLabel: '中',
    safetyLevel: 'medium',
    experiencePercent: 75,
    timeImpact: '+0h',
  },
];

const DEFAULT_CONTACTS: ExecuteEmergencyContactModel[] = [
  { id: 'guide', kind: 'guide', label: '导游', subtitle: 'Patriksjor', phone: '+3541234567' },
  { id: 'rescue', kind: 'rescue', label: '当地救援', phone: '112' },
  { id: 'insurance', kind: 'insurance', label: '保险援助', subtitle: 'AIG', phone: '+864008208858' },
];

function mapRiskToSafety(risk?: 'low' | 'medium' | 'high'): {
  label: string;
  level: ExecutePlanBSafetyLevel;
} {
  if (risk === 'low') return { label: '很高', level: 'very_high' };
  if (risk === 'medium') return { label: '中', level: 'medium' };
  if (risk === 'high') return { label: '高', level: 'high' };
  return { label: '中', level: 'medium' };
}

function mapAdvisoryPlans(recs: TripExecutionAdvisoryDto['recommendations']): ExecutePlanBCardModel[] {
  return recs
    .filter((rec) => rec.actionType !== 'keep')
    .slice(0, 3)
    .map((rec, idx) => {
      const safety = rec.isRecommended
        ? { label: '高', level: 'high' as const }
        : { label: '中', level: 'medium' as const };
      return {
        id: rec.id,
        index: idx + 1,
        code: `Plan B-${idx + 1}`,
        title: rec.label,
        description: rec.description,
        recommended: rec.isRecommended,
        safetyLabel: safety.label,
        safetyLevel: safety.level,
        experiencePercent:
          rec.drivingAfterDarkRisk != null
            ? Math.round((1 - rec.drivingAfterDarkRisk) * 100)
            : undefined,
        timeImpact: rec.impactSummary ?? '—',
      };
    });
}

function mapFallbackPlans(plan: FallbackPlan): ExecutePlanBCardModel[] {
  return (plan.solutions ?? []).slice(0, 3).map((solution, idx) => {
    const safety = mapRiskToSafety(solution.impact.riskChange);
    return {
      id: solution.id,
      index: idx + 1,
      code: `Plan B-${idx + 1}`,
      title: solution.title,
      description: solution.description,
      recommended: solution.recommended,
      isCurrentPlan: solution.type === 'minimal' && !solution.recommended && idx === 2,
      safetyLabel: safety.label,
      safetyLevel: safety.level,
      experiencePercent:
        solution.impact.missingPlaces === 0
          ? 85
          : Math.max(60, 90 - solution.impact.missingPlaces * 10),
      timeImpact: solution.impact.arrivalTime?.includes('+')
        ? solution.impact.arrivalTime.match(/\+[^)]+/)?.[0] ?? solution.impact.arrivalTime
        : solution.impact.arrivalTime ?? '—',
    };
  });
}

function buildAiSuggestion(input: {
  advisory?: TripExecutionAdvisoryDto | null;
  plans: ExecutePlanBCardModel[];
}): ExecuteAiSuggestionModel {
  const recommended = input.plans.find((plan) => plan.recommended) ?? input.plans[0];
  if (input.advisory?.verdict.headline) {
    return {
      primary: input.advisory.realtimeRisks.weather
        ? `建议优先采用「${recommended?.title ?? '推荐方案'}」。${input.advisory.realtimeRisks.weather}`
        : `建议优先采用「${recommended?.title ?? '推荐方案'}」。${input.advisory.verdict.headline}`,
      secondary: input.advisory.deviations[0]?.message,
      evidenceLabel: '查看预测证据',
    };
  }

  return {
    primary:
      '建议优先采用 Plan B-1（推迟徒步），14:00 后风况显著改善的概率为 68%。',
    secondary: '若 12:30 风速仍 >20 m/s，请切换至 Plan B-2。',
    evidenceLabel: '查看预测证据',
  };
}

export function buildExecuteDecisionSidebarModel(input: {
  advisory?: TripExecutionAdvisoryDto | null;
  fallbackPlan?: FallbackPlan | null;
}): ExecuteDecisionSidebarModel {
  const plans = input.fallbackPlan?.solutions?.length
    ? mapFallbackPlans(input.fallbackPlan)
    : input.advisory?.recommendations?.length
      ? mapAdvisoryPlans(input.advisory.recommendations)
      : DEFAULT_PLANS;

  return {
    plans: plans.length > 0 ? plans : DEFAULT_PLANS,
    contacts: DEFAULT_CONTACTS,
    aiSuggestion: buildAiSuggestion({ advisory: input.advisory, plans }),
  };
}

export function safetyToneClass(level: ExecutePlanBSafetyLevel): string {
  if (level === 'very_high' || level === 'high') return 'text-success';
  if (level === 'medium') return 'text-warning';
  return 'text-muted-foreground';
}
