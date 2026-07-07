/** tripnara.impact_scope@v1 — 本体论连锁影响范围（文案由前端 i18n 渲染） */

export interface ImpactScopeNarrative {
  templateKey: string;
  params?: Record<string, unknown>;
}

export type ImpactScopeChainKind =
  | 'trigger'
  | 'route'
  | 'arrangement'
  | 'consequence'
  | (string & {});

export type ImpactScopeConsequenceKind =
  | 'DAILY_DRIVING_LOAD'
  | 'CHECKIN_AND_RESERVATION_TIMING'
  | (string & {});

export interface ImpactScopeChainLink {
  kind?: ImpactScopeChainKind;
  /** 路线段 entity ref（后端原始标识，非拼接中文） */
  entityRef?: string;
  consequenceKind?: ImpactScopeConsequenceKind;
  /** @deprecated 后端不再返回预渲染文案 */
  label?: string;
  detail?: string;
}

export type ImpactScopeArrangementKind =
  | 'POI'
  | 'HOTEL'
  | 'MEAL'
  | 'TRANSPORT'
  | 'ACTIVITY'
  | (string & {});

export interface ImpactScopeArrangement {
  id?: string;
  /** Place 真名 / note 首行 / itemId */
  label: string;
  dayIndex?: number;
  isDirect?: boolean;
  arrangementKind?: ImpactScopeArrangementKind;
}

export type ImpactScopeTriggerCapability =
  | 'ROAD_SEGMENT_UNAVAILABLE'
  | 'WEATHER_RESTRICTION'
  | 'EXCESSIVE_DAILY_LOAD'
  | (string & {});

export type ImpactScopeSubjectKind = 'ROAD' | 'WEATHER' | 'DAY' | (string & {});

export interface ImpactScopeTrigger {
  capability?: ImpactScopeTriggerCapability;
  subjectKind?: ImpactScopeSubjectKind;
  subjectId?: string;
  /** 1-based 显示天次（与 narrative.primaryDayIndex 对齐） */
  dayIndex?: number;
  status?: string;
  /** @deprecated 后端不再返回预渲染文案 */
  kind?: string;
  label?: string;
  detail?: string;
}

export interface ImpactScopeView {
  schemaId?: string;
  narrative: ImpactScopeNarrative;
  detailNarrative?: ImpactScopeNarrative;
  chain?: ImpactScopeChainLink[];
  arrangements?: ImpactScopeArrangement[];
  trigger?: ImpactScopeTrigger;
}
