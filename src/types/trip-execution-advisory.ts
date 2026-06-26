/**
 * 行中「实时执行状态」读模型 — Runtime Assurance 产品层 DTO
 */

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
}
