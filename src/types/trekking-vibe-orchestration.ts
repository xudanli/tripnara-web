/**
 * Trekking & DNA Integration — Match Square Vibe LLM × TripNARA Hiking
 * Schema: trekking_orchestration_v1
 */

export type TrekkingOrchestrationVersion = 'trekking_orchestration_v1';

export type TrekkingRecruitmentScriptId =
  | 'chuanxi_heavy_trek'
  | 'light_trek_dyl_retreat'
  | 'weekend_fast_light_trek';

export type TrekkingSceneCategory = 'premium_trekking';

export type RouteDirectionAvailability = 'live' | 'planned';

export type TrekkingRouteDirectionCandidate = {
  routeDirectionKey: string;
  label: string;
  availability: RouteDirectionAvailability;
  /** 与 RouteDirection 数字 id 对齐（live 时可用） */
  routeDirectionId?: number;
};

export type TrekkingWorldModelProfile =
  | 'heavy_offline_dem'
  | 'light_dyl_retreat'
  | 'weekend_fast_light';

export type TrekkingWorldModel = {
  profile: TrekkingWorldModelProfile;
  offlineDataPreloadRequired: boolean;
  demGridMetres?: number;
  routeDirectionCandidates: TrekkingRouteDirectionCandidate[];
  /** 轻装场景：剔除的重装约束 */
  excludedConstraints?: string[];
  /** 速攀：单日爆发等物理约束 */
  physicalConstraints?: string[];
};

export type TrekkingSharedGearDeficit = {
  item: string;
  reason: string;
};

export type TrekkingEventStreamMilestone = {
  id: string;
  label: string;
  trigger: string;
};

export type TrekkingToolchainItem = {
  id: string;
  label: string;
};

export type TrekkingDnaAmbiguityHint = 'minimize' | 'neutral' | 'embrace';

export type TrekkingDnaEvolution = {
  ambiguityToleranceHint?: TrekkingDnaAmbiguityHint;
  silentFlow?: boolean;
  filterPersonalityTags?: string[];
  preferenceEvolutionReasons?: Array<
    'TREK_VIBE_CONFIRMED' | 'TREK_READINESS_ACK' | 'TREK_POST_RATING_FIVE_STAR'
  >;
};

export type TrekkingRegionFocus =
  | 'iceland'
  | 'chuanxi'
  | 'yunnan'
  | 'xinjiang'
  | 'zhejiang'
  | 'generic';

/** POST /vibe-llm/parse · GET /posts/:id */
export type TrekkingVibeOrchestrationPlan = {
  version: TrekkingOrchestrationVersion;
  scriptId: TrekkingRecruitmentScriptId;
  sceneCategory: TrekkingSceneCategory;
  recruitmentScriptId?: TrekkingRecruitmentScriptId;
  recruitmentSceneCategory?: TrekkingSceneCategory;
  /** 规则推断的区域焦点 — 驱动标题与路线过滤 */
  regionFocus?: TrekkingRegionFocus;
  /** UI 展示标题（非硬编码川西） */
  displayHeadline?: string;
  worldModel: TrekkingWorldModel;
  sharedGearDeficits?: TrekkingSharedGearDeficit[];
  eventStreamMilestones?: TrekkingEventStreamMilestone[];
  toolchain?: TrekkingToolchainItem[];
  dnaEvolution?: TrekkingDnaEvolution;
};
