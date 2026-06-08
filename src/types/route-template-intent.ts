/**
 * Route Template Intent Match — §3.11
 * Schema: route_template_intent_v1
 */

export type RouteTemplateIntentVersion = 'route_template_intent_v1';

export type RouteTemplateMatchConfidence = 'highlight' | 'suggest';

export type RouteTemplateSlotAugmentation = {
  slotRole: string;
  expectedTagSuffix: string;
  reason: string;
};

export type RouteTemplatePrimaryMatch = {
  catalogId: string;
  routeDirectionName: string;
  durationDays?: number;
  titleZh: string;
  matchPercent: number;
  confidence: RouteTemplateMatchConfidence;
  launchRecruitmentAction?: 'confirm_template' | string;
  slotAugmentations?: RouteTemplateSlotAugmentation[];
};

/** POST /vibe-llm/parse → routeTemplateMatch */
export type RouteTemplateIntentMatchPlan = {
  version: RouteTemplateIntentVersion;
  associationHint?: string;
  primaryMatch?: RouteTemplatePrimaryMatch | null;
  suggestions?: RouteTemplatePrimaryMatch[];
};

/** §3.11 Phase 3 · Trip Vault 里程碑 */
export type RouteTemplateVaultMilestone = {
  id: string;
  day: number;
  label: string;
  lockAmountCents?: number;
  currency?: string;
};

/** Route Contract Lock 展示计划 — 由 catalog + 队长组队风格推导 */
export type RouteContractLockPlan = {
  templateTitle: string;
  catalogId: string;
  enabled: boolean;
  milestones: RouteTemplateVaultMilestone[];
  /** 仅全托管队长可发布 rollback */
  captainCanRollback: boolean;
  rollbackHint: string;
  contractSummary: string;
};
