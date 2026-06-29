import type { JourneyDiversion, JourneyMember } from './types';

/** 检查器 · 单活动上下文（Tab 共享） */
export interface JourneyInspectorActivityHeader {
  title: string;
  titleEn?: string;
  dayLabel: string;
  intensityLabel?: string;
  intensityLevel?: 'low' | 'medium' | 'high';
}

/** 参与人 Tab */
export interface JourneyInspectorMemberRow {
  member: JourneyMember;
  roleLabel?: string;
  tags?: string[];
  alternativePlan?: string;
  participating: boolean;
}

export interface JourneyInspectorFitAssessment {
  suitabilityPercent?: number;
  suitabilityLabel?: string;
  physicalRequirement?: string;
  physicalLevel?: 'low' | 'medium' | 'high';
  riskLevel?: string;
  weatherImpact?: string;
  suggestion?: string;
}

/** 分流 Tab */
export interface JourneyInspectorDiversionGroupDetail {
  label: string;
  badge?: string;
  activityType?: string;
  timeRange?: string;
  transport?: string;
  route?: string;
  estimatedCost?: string;
  riskLevel?: string;
  participantCount: number;
}

export interface JourneyInspectorDiversionDetail {
  diversion: JourneyDiversion;
  overview?: string;
  splitTime?: string;
  meetingPoint?: string;
  meetingTime?: string;
  emergencyContact?: string;
  emergencyNote?: string;
  groupA: JourneyInspectorDiversionGroupDetail;
  groupB: JourneyInspectorDiversionGroupDetail;
}

/** 证据 Tab */
export type JourneyInspectorEvidenceCategory =
  | 'weather'
  | 'road'
  | 'activity'
  | 'transport'
  | 'other';

export interface JourneyInspectorEvidenceSourceRow {
  id: string;
  name: string;
  category: JourneyInspectorEvidenceCategory;
  updatedAtLabel: string;
  confidencePercent?: number;
  status?: 'fresh' | 'stale';
}

export interface JourneyInspectorWeatherSnapshot {
  location: string;
  temperature?: string;
  condition?: string;
  wind?: string;
  precipitation?: string;
  visibility?: string;
  hourly?: Array<{ time: string; icon?: string; temp?: string; detail?: string }>;
}

export interface JourneyInspectorRouteEvidenceRow {
  label: string;
  provider: string;
  duration?: string;
  distance?: string;
  statusLabel?: string;
}

export interface JourneyInspectorActivitySourceRow {
  provider: string;
  activityName: string;
  statusLabel?: string;
  hours?: string;
  updatedAtLabel?: string;
}

export interface JourneyInspectorEvidenceConclusion {
  verdict: 'executable' | 'caution' | 'blocked';
  text: string;
}

/** 风险 Tab（BFF 可只返回 level / levelLabel / keyRisks，其余由前端补全） */
export interface JourneyInspectorRiskView {
  level: 'high' | 'medium' | 'low';
  levelLabel: string;
  score?: number;
  updatedAtLabel?: string;
  affectedCount?: number;
  totalCount?: number;
  keyRisks: string[];
  majorRisks?: Array<{ description: string; severity: string; severityTone: 'high' | 'medium' | 'low' }>;
  impactScope?: {
    hubs?: string;
    members?: string;
    time?: string;
    budget?: string;
  };
  mitigations?: string[];
}

/** BFF 扩展（`inspector.activityContexts[]`） */
export interface JourneyMapInspectorActivityContext {
  activityId: string;
  activityDetail?: JourneyInspectorActivityDetail;
  memberRows?: JourneyInspectorMemberRow[];
  fitAssessment?: JourneyInspectorFitAssessment;
  diversionDetail?: {
    activityId?: string;
    overview?: string;
    splitTime?: string;
    meetingPoint?: string;
    meetingTime?: string;
    emergencyContact?: string;
    emergencyNote?: string;
    groupA?: JourneyInspectorDiversionGroupDetail;
    groupB?: JourneyInspectorDiversionGroupDetail;
  };
  evidenceSources?: JourneyInspectorEvidenceSourceRow[];
  weatherSnapshot?: JourneyInspectorWeatherSnapshot;
  routeEvidence?: JourneyInspectorRouteEvidenceRow;
  activitySource?: JourneyInspectorActivitySourceRow;
  evidenceConclusion?: JourneyInspectorEvidenceConclusion;
  riskView?: JourneyInspectorRiskView;
}

/** 活动详情 Tab · BFF activityDetail */
export interface JourneyInspectorActivityDetail {
  activityId?: string;
  activityTypeLabel?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  durationHours?: number;
  transportMinutes?: number;
  equipment?: string[];
  weatherWindow?: string;
  guideInfo?: string;
  intensityScore?: number;
  intensity?: 'low' | 'medium' | 'high';
  summary?: string;
}
