/** §3.10 · 约束模板注册表 — 机器可读 SSOT 类型 */

export const SOLVER_RULE_KINDS = [
  'time_window',
  'daily_count',
  'time_budget',
  'lodging_continuity',
  'budget',
  'route_shape',
  'poi_preference',
  'crowd_avoidance',
] as const;

export type SolverRuleKind = (typeof SOLVER_RULE_KINDS)[number];

export type ConstraintTemplateRegistryType = 'HARD' | 'SOFT';

export type ConstraintTemplateSectionKey = 'hard_must_satisfy' | 'soft_prefer';

export type ConstraintTemplateHardCategory =
  | 'TIME'
  | 'BUDGET'
  | 'MEMBER'
  | 'RISK'
  | 'PLACE';

export interface ConstraintTemplateScopeDefault {
  type: 'TRIP' | 'DAY' | 'MEMBER' | 'MEMBER_GROUP' | 'ROUTE_SEGMENT' | string;
  dayIndex?: number;
  memberIds?: string[];
  segmentId?: string;
  fromItemId?: string;
  toItemId?: string;
}

export interface ConstraintTemplateRegistryEntry {
  templateId: string;
  constraintId: string;
  defaultName: string;
  defaultDescription: string;
  type: ConstraintTemplateRegistryType;
  sectionKey: ConstraintTemplateSectionKey;
  category?: ConstraintTemplateHardCategory;
  /**
   * 新建实例默认 scope（前端 SSOT 字段名）。
   * 后端 GET /constraints/catalog 同语义字段名为 `scope`。
   */
  defaultScope?: ConstraintTemplateScopeDefault;
  defaultPriority?: number;
  defaultIntensity?: number;
  solverRuleKind: SolverRuleKind;
  /** true = 仅 PATCH / 专用 API，禁止 catalog POST */
  legacyPatchOnly: boolean;
  /** SOFT · compiledWeights.legacy canonical 键 */
  canonicalWeightKey?: string;
}

export interface ConstraintTemplateCatalog {
  schemaVersion: '1.0.0';
  hardCount: number;
  softCount: number;
  templateCount: number;
  solverRuleKinds: SolverRuleKind[];
  templates: ConstraintTemplateRegistryEntry[];
}
