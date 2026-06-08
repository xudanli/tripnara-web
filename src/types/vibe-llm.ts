/**
 * Vibe LLM Engine — 动态意图解析输出契约
 * @see docs/match-square-frontend-integration-guide.md §7.0
 */

import type { PlanningStyle, TravelMode, TripMoodTag } from '@/types/match-square';
import type { RouteTemplateIntentMatchPlan } from '@/types/route-template-intent';
import type { TrekkingVibeOrchestrationPlan } from '@/types/trekking-vibe-orchestration';

/** POST /vibe-llm/parse · suggestedFields */
export type VibeSuggestedFields = {
  destination?: string | null;
  /** 与 GET /filters/options → destinationRegions[].id 对齐 */
  destinationRegionId?: string | null;
  /** 与 destinationRegions[].subScopes[].id 对齐 */
  destinationSubScopeId?: string | null;
  budgetMinCents?: number | null;
  budgetMaxCents?: number | null;
  travelMode?: TravelMode | null;
  tripMoodTag?: TripMoodTag | null;
  preferenceNotes?: string | null;
};

/** 集成指南 §7.0 契约模型命名 */
export type TeamworkContractModelApi =
  | 'Full-Service'
  | 'Co-Creation'
  | 'Improvisational';

/** 内部 / 规则引擎命名（兼容） */
export type TeamworkContractModel =
  | TeamworkContractModelApi
  | 'Full-Managed'
  | 'Casual-Play';

export type VibeEducationBaseline = 'None' | 'Bachelor' | 'Master' | 'Doctorate';

export type VibeSecurityLevel = 'Standard' | 'Medium' | 'High';

export type VibeHardGates = {
  education_baseline?: VibeEducationBaseline;
  industry_preference?: string[];
  security_level?: VibeSecurityLevel;
  budget_range?: { min?: number; max?: number } | string;
};

export type VibeChipApi = {
  id: string;
  label: string;
};

export type VibeSlotDefinition = {
  slot_id: number;
  expected_tag: string;
  reason: string;
};

export type VibeBehaviorContract = {
  tag: string;
  clause: string;
};

export type VibeBehavioralContractApi = {
  title: string;
  clauses: string[];
};

/** POST /vibe-llm/parse · payload 内层结构 */
export type VibeLlmParsePayload = {
  vibe_chips: VibeChipApi[] | string[];
  teamwork_contract_model: TeamworkContractModel;
  hard_gates: VibeHardGates;
  slot_definitions: VibeSlotDefinition[];
  behavioral_contracts?: VibeBehavioralContractApi[];
  behavior_contracts?: VibeBehaviorContract[];
  contract_hint?: string;
  confidence?: number;
};

/** 规则引擎 / 客户端内部扁平结构 */
export type VibeLlmParseResult = {
  vibe_chips: string[];
  teamwork_contract_model: TeamworkContractModel;
  hard_gates: VibeHardGates;
  slot_definitions: VibeSlotDefinition[];
  behavior_contracts: VibeBehaviorContract[];
  contract_hint?: string;
  confidence?: number;
};

export type VibeLlmParseRequest = {
  /** 集成指南字段 */
  freeText: string;
  /** @deprecated 使用 freeText */
  text?: string;
  slotsNeeded?: number;
  captainContext?: {
    mbtiType?: string;
    personaTitle?: string;
  };
};

/** POST /vibe-llm/parse 响应 data */
export type VibeLlmParseApiData = {
  payload: VibeLlmParsePayload;
  suggestedPlanningStyle?: PlanningStyle;
  teamworkContractModelLabel?: string;
  suggestedItinerarySummary?: string;
  suggestedCaptainMessage?: string;
  suggestedFields?: VibeSuggestedFields;
  realtime_ready?: boolean;
  parseSource?: 'rules' | 'llm';
  trekkingOrchestration?: TrekkingVibeOrchestrationPlan | null;
  routeTemplateMatch?: RouteTemplateIntentMatchPlan | null;
};

export type VibeLlmParseResponse = {
  payload: VibeLlmParsePayload;
  suggestedPlanningStyle: PlanningStyle;
  teamworkContractModelLabel: string;
  suggestedItinerarySummary?: string;
  suggestedCaptainMessage?: string;
  suggestedFields?: VibeSuggestedFields | null;
  realtime_ready: boolean;
  parseSource: 'rules' | 'llm';
  /** 扁平化供 UI 使用 */
  parse: VibeLlmParseResult;
  source: 'live_llm' | 'rule_mock';
  /** §3.10 Premium Trekking 编排计划 */
  trekkingOrchestration?: TrekkingVibeOrchestrationPlan | null;
  /** §3.11 Intent-to-Template 匹配 */
  routeTemplateMatch?: RouteTemplateIntentMatchPlan | null;
};

export function teamworkModelToPlanningStyle(model: TeamworkContractModel): PlanningStyle {
  switch (model) {
    case 'Full-Service':
    case 'Full-Managed':
      return 'full_managed';
    case 'Improvisational':
    case 'Casual-Play':
      return 'casual_play';
    default:
      return 'co_planning';
  }
}

export function planningStyleToTeamworkModel(style: PlanningStyle): TeamworkContractModelApi {
  switch (style) {
    case 'full_managed':
      return 'Full-Service';
    case 'casual_play':
      return 'Improvisational';
    default:
      return 'Co-Creation';
  }
}

export function chipLabelsFromPayload(payload: VibeLlmParsePayload | VibeLlmParseResult): string[] {
  const raw = payload.vibe_chips;
  if (!raw?.length) return [];
  if (typeof raw[0] === 'string') return raw as string[];
  return (raw as VibeChipApi[]).map((c) => c.label);
}

export function flattenParsePayload(payload: VibeLlmParsePayload): VibeLlmParseResult {
  const chips = chipLabelsFromPayload(payload);
  const behavior_contracts: VibeBehaviorContract[] =
    payload.behavior_contracts ??
    (payload.behavioral_contracts ?? []).flatMap((bc) =>
      bc.clauses.map((clause) => ({ tag: bc.title, clause }))
    );

  return {
    vibe_chips: chips,
    teamwork_contract_model: payload.teamwork_contract_model,
    hard_gates: payload.hard_gates,
    slot_definitions: payload.slot_definitions,
    behavior_contracts,
    contract_hint: payload.contract_hint,
    confidence: payload.confidence,
  };
}

export function toApiPayload(parse: VibeLlmParseResult): VibeLlmParsePayload {
  return {
    vibe_chips: parse.vibe_chips.map((label, i) => ({
      id: label.replace(/[^\w]/g, '').slice(0, 24) || `chip_${i}`,
      label,
    })),
    teamwork_contract_model: parse.teamwork_contract_model,
    hard_gates: parse.hard_gates,
    slot_definitions: parse.slot_definitions,
    behavior_contracts: parse.behavior_contracts,
    contract_hint: parse.contract_hint,
    confidence: parse.confidence,
  };
}
