/**
 * 行中「实时执行状态」读模型 — Runtime Assurance 产品层 DTO
 */

import type { CausalStoryChainNode } from '@/types/causal-trace';

export type ExecutionVerdictStatus =
  | 'ON_TRACK'
  | 'AT_RISK'
  | 'REPLAN_REQUIRED'
  | 'STOP';

export interface GeoPointDto {
  lat: number;
  lng: number;
}

export interface AffectedTripItemDto {
  itemId: string;
  title: string;
  status: 'completed' | 'active' | 'upcoming' | 'at_risk';
  projectedArrival?: string;
  note?: string;
}

export interface ExecutionAlternativeDto {
  id: string;
  label: string;
  description: string;
  isRecommended?: boolean;
  impactSummary?: string;
  estimatedHotelArrival?: string;
  drivingAfterDarkRisk?: number;
  actionType?: 'shorten' | 'skip' | 'reroute' | 'keep' | 'replace';
}

/** execution-advisory.causalInsight.primaryEnforcement */
export type ExecutionCausalPrimaryEnforcement = 'ADJUST_REQUIRED' | 'NOT_EXECUTABLE';

export interface ExecutionCausalStoryDto {
  chain: CausalStoryChainNode[];
  assessment: string;
}

/** P0 · 行中因果链（Abu + stepper） */
export interface ExecutionCausalInsightDto {
  guardianHeadline: string;
  primaryEnforcement: ExecutionCausalPrimaryEnforcement;
  causalStory: ExecutionCausalStoryDto;
  /** Tier-3 · GET …/decision-problems/:id/causal-trace */
  linkedProblemId?: string;
}

export interface TripExecutionAdvisoryDto {
  tripId: string;
  tripDayId?: string;
  dayNumber: number;
  date: string;
  routeSummary?: string;

  currentState: {
    currentTime: string;
    currentLocation?: GeoPointDto;
    activeItemId?: string;
    delayMinutes: number;
  };

  verdict: {
    status: ExecutionVerdictStatus;
    headline: string;
    validUntil?: string;
  };

  impacts: {
    affectedItems: AffectedTripItemDto[];
    estimatedHotelArrival?: string;
    drivingAfterDarkRisk?: number;
  };

  deviations: Array<{
    id: string;
    message: string;
    minutesImpact?: number;
  }>;

  recommendations: ExecutionAlternativeDto[];

  realtimeRisks: {
    road?: string;
    weather?: string;
    openingHours?: string;
    nextCheckAt?: string;
  };

  evidence: {
    weatherAsOf?: string;
    roadAsOf?: string;
    openingHoursAsOf?: string;
  };

  /** 技术依据折叠区（L3-PROOF 等），默认不首屏展示 */
  technicalFindings?: Array<{
    id: string;
    type: string;
    message: string;
    score?: number;
  }>;

  /** P0 · 行中因果链 */
  causalInsight?: ExecutionCausalInsightDto;
}

export type ExecutionScheduleMutationType = 'SHORTEN_STAY' | 'SKIP_ITEM' | 'REPLACE_ITEM';

export interface ExecutionScheduleMutationDto {
  type: ExecutionScheduleMutationType;
  itemId: string;
  deltaMinutes?: number;
}

export interface ApplyExecutionRecommendationRequest {
  confirm: true;
  clientTimestamp?: string;
}

export interface ApplyExecutionRecommendationResponse {
  applied: boolean;
  executionAdvisory: TripExecutionAdvisoryDto;
  scheduleMutations: ExecutionScheduleMutationDto[];
  updatedSchedule: {
    date: string;
    schedule: {
      items: Array<{
        placeId: number | string;
        placeName: string;
        startTime: string;
        endTime: string;
        status?: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
      }>;
    };
  };
}
