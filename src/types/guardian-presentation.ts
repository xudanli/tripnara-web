/** 三人格 Guardian 单主角表达层 — 与后端 guardian-presentation.types 对齐 */

export type GuardianExpressionPhase = 'planning' | 'in_trip';

export type PersonaDisplayStyle = 'design_advisory' | 'execution_brief';

export type LeadSpeakerPersona = 'ABU' | 'DR_DRE' | 'NEPTUNE';

export type LeadSpeakerScenario =
  | 'SAFETY_BLOCK'
  | 'SAFETY_WARN'
  | 'PACE_COST'
  | 'INTENT_REPAIR'
  | 'MULTI_FACTOR'
  | 'ALL_CLEAR';

export type GuardianAction = 'BLOCK' | 'ADJUST' | 'REPAIR' | 'CHOOSE';

export type GuardianActionSlot = 'abu' | 'dre' | 'neptune' | 'user';

export type AbuExistenceStatus =
  | 'PASS'
  | 'WARN'
  | 'REQUIRE_CONFIRMATION'
  | 'BLOCK'
  | 'UNKNOWN';

export type DreCostStatus =
  | 'COMFORTABLE'
  | 'BALANCED'
  | 'STRETCHED'
  | 'OVERLOADED'
  | 'TEAM_CONFLICT';

export interface GuardianSupportingLine {
  persona: LeadSpeakerPersona;
  icon: string;
  name: string;
  role: 'evidence' | 'pace' | 'repair';
  text: string;
}

export interface PersonaStructuredStatus {
  abu?: { existence: string; action?: GuardianAction };
  dre?: { cost: string; action?: GuardianAction };
  neptune?: { action?: GuardianAction };
  user?: { action: 'CHOOSE' };
}

export interface GuardianPersonaPresentation {
  mode: 'single_lead' | 'decision_committee';
  scenario: LeadSpeakerScenario;
  leadSpeaker: LeadSpeakerPersona;
  headline: string;
  narrative: string;
  briefLines?: string[];
  expressionPhase: GuardianExpressionPhase;
  displayStyle: PersonaDisplayStyle;
  supportingLines: GuardianSupportingLine[];
  actions: Partial<Record<GuardianActionSlot, GuardianAction>>;
  structuredStatus: PersonaStructuredStatus;
  /** 后端结构化硬约束门控（优先于 scenario 推断） */
  hardConstraintBlocked?: boolean;
}

/** decision-log metadata P2 扩展 */
export interface GuardianDecisionLogMetadata {
  guardianExpressionPhase?: GuardianExpressionPhase;
  guardianLeadSpeaker?: LeadSpeakerPersona;
  guardianScenario?: LeadSpeakerScenario;
  guardianStructuredStatus?: PersonaStructuredStatus;
  guardianActions?: Partial<Record<GuardianActionSlot, GuardianAction>>;
  revalidationPass?: 'POST_NEPTUNE_REPAIR';
}
