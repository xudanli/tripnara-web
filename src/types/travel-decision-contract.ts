/** 旅行决策合同 · 前台 SSOT */

/** 前台维度（UI） */
export type TravelGoalDimension =
  | 'safety'
  | 'pace'
  | 'experience'
  | 'budget'
  | 'lodging'
  | 'flexibility'
  | 'coverage'
  | 'photography'
  | 'family_comfort';

/** BFF contract.objectives.rankedPrinciples */
export type TripObjectivePrinciple =
  | 'SAFETY'
  | 'PACE'
  | 'CORE_EXPERIENCE'
  | 'BUDGET'
  | 'FEWER_HOTEL_CHANGES'
  | 'FEWER_LODGING_CHANGES'
  | 'FLEXIBILITY'
  | 'COVERAGE'
  | 'PHOTOGRAPHY'
  | 'FAMILY_COMFORT'
  | string;

export type AutomationDefaultLevel =
  | 'INFORM_ONLY'
  | 'SUGGEST'
  | 'AUTO_REPAIR_LOW_RISK'
  | 'AUTO_EXECUTE_CONDITIONAL'
  | string;

export type ChangeStrategyArchetype = 'CONSERVATIVE' | 'BALANCED' | 'EXPLORATORY' | string;

export interface TravelGoalDefinition {
  id: TravelGoalDimension;
  /** 用户可见原则文案 */
  label: string;
  /** 一句话说明 */
  description: string;
  /** BFF principle 枚举 */
  apiPrinciple: TripObjectivePrinciple;
}

export interface TravelGoalRankEntry {
  id: TravelGoalDimension;
  rank: number;
}

/** @deprecated intent.metadata / localStorage 兜底 */
export interface TravelGoalRankState {
  orderedIds: TravelGoalDimension[];
  updatedAt?: string;
}
