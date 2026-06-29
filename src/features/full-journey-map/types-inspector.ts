import type { CoverageMapResponse, ScoreFinding, ScoreRisk } from '@/api/readiness';
import type { JourneyMapDecisionItem, JourneyMapInspectorActivityContextDto } from '@/api/journey-map';
import type {
  DecisionCheckerEvidenceDto,
  DecisionCheckerImpactDto,
} from '@/types/decision-checker';

export type JourneyMapEvidenceSource = 'bff' | 'coverage' | 'demo' | 'none';

export interface JourneyMapInspectorBundle {
  evidence: DecisionCheckerEvidenceDto | null;
  evidenceSource: JourneyMapEvidenceSource;
  evidenceLoading: boolean;
  evidenceUnavailable: boolean;
  evidenceError: string | null;
  impact: DecisionCheckerImpactDto | null;
  scoreRisks: ScoreRisk[];
  scoreFindings: ScoreFinding[];
  coverage: CoverageMapResponse | null;
  /** 二段 `include=inspector` 后前端优先消费；缺字段再 fallback */
  activityContexts?: JourneyMapInspectorActivityContextDto[];
  /** `include=inspector` 时返回 open 决策事项 */
  decisionItems?: JourneyMapDecisionItem[];
}

export const EMPTY_INSPECTOR_BUNDLE: JourneyMapInspectorBundle = {
  evidence: null,
  evidenceSource: 'none',
  evidenceLoading: false,
  evidenceUnavailable: true,
  evidenceError: null,
  impact: null,
  scoreRisks: [],
  scoreFindings: [],
  coverage: null,
};
