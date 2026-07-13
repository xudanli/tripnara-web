import type { FallbackPlan } from '@/api/execution';
import type { TripExecutionAdvisoryDto } from '@/types/trip-execution-advisory';
import type { TripDetail } from '@/types/trip';

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

function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[],
): string | undefined {
  if (!metadata) return undefined;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

/** 从行程 metadata 解析导游电话（供快捷操作与紧急联系人复用） */
export function resolveExecuteGuidePhone(trip?: TripDetail | null): string | undefined {
  const metadata = trip?.metadata as Record<string, unknown> | undefined;
  return readMetadataString(metadata, [
    'guidePhone',
    'guideContactPhone',
    'guideTel',
    'emergencyGuidePhone',
  ]);
}

export function resolveExecuteEmergencyContacts(
  trip?: TripDetail | null,
): ExecuteEmergencyContactModel[] {
  const metadata = trip?.metadata as Record<string, unknown> | undefined;
  const contacts: ExecuteEmergencyContactModel[] = [];

  const guidePhone = resolveExecuteGuidePhone(trip);
  const guideName = readMetadataString(metadata, ['guideName', 'guideContactName']);
  if (guidePhone) {
    contacts.push({
      id: 'guide',
      kind: 'guide',
      label: '导游',
      subtitle: guideName,
      phone: guidePhone,
    });
  }

  const rescuePhone = readMetadataString(metadata, [
    'localRescuePhone',
    'rescuePhone',
    'emergencyPhone',
  ]);
  if (rescuePhone) {
    contacts.push({
      id: 'rescue',
      kind: 'rescue',
      label: '当地救援',
      phone: rescuePhone,
    });
  }

  const insurancePhone = readMetadataString(metadata, [
    'insurancePhone',
    'insuranceAssistancePhone',
    'insuranceContactPhone',
  ]);
  const insuranceName = readMetadataString(metadata, [
    'insuranceProvider',
    'insuranceCompany',
    'insuranceName',
  ]);
  if (insurancePhone) {
    contacts.push({
      id: 'insurance',
      kind: 'insurance',
      label: '保险援助',
      subtitle: insuranceName,
      phone: insurancePhone,
    });
  }

  return contacts;
}

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

  if (recommended) {
    return {
      primary: `建议优先采用「${recommended.title}」。`,
      secondary: recommended.description,
      evidenceLabel: input.advisory ? '查看预测证据' : undefined,
    };
  }

  return {
    primary: '暂无实时建议。当系统检测到风险或产生替代方案时，建议将显示在这里。',
  };
}

export function buildExecuteDecisionSidebarModel(input: {
  advisory?: TripExecutionAdvisoryDto | null;
  fallbackPlan?: FallbackPlan | null;
  trip?: TripDetail | null;
}): ExecuteDecisionSidebarModel {
  const plans = input.fallbackPlan?.solutions?.length
    ? mapFallbackPlans(input.fallbackPlan)
    : input.advisory?.recommendations?.length
      ? mapAdvisoryPlans(input.advisory.recommendations)
      : [];

  return {
    plans,
    contacts: resolveExecuteEmergencyContacts(input.trip),
    aiSuggestion: buildAiSuggestion({ advisory: input.advisory, plans }),
  };
}

export function safetyToneClass(level: ExecutePlanBSafetyLevel): string {
  if (level === 'very_high' || level === 'high') return 'text-success';
  if (level === 'medium') return 'text-warning';
  return 'text-muted-foreground';
}
