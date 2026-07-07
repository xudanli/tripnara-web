/** tripnara.candidate_comparison@v1 — Decision Core 候选对比视图 */

export type ComparisonDimensionStatus =
  | 'PASS'
  | 'FAIL'
  | 'WARN'
  | 'OVERLOADED'
  | (string & {});

export interface ComparisonDimensionCell {
  status?: ComparisonDimensionStatus;
  label: string;
  note?: string;
}

export interface ComparisonCostCell {
  label: string;
}

export interface CandidateComparisonRow {
  schemeLabel: string;
  candidateId: string;
  title: string;
  recommended?: boolean;
  selectable?: boolean;
  safety?: ComparisonDimensionCell;
  pace?: ComparisonDimensionCell;
  experienceRetentionLabel?: string;
  cost?: ComparisonCostCell;
  drivingDeltaMinutes?: number;
}

export interface CandidateComparisonOriginalIntent {
  intentRefs?: string[];
  labels?: string[];
  narrative?: string;
}

export interface CandidateComparisonRejection {
  candidateId?: string;
  reasonCodes?: string[];
  message: string;
}

export interface CandidateComparisonView {
  schemaId?: string;
  originalIntent?: CandidateComparisonOriginalIntent;
  recommendedCandidateId?: string;
  headline?: string;
  rows: CandidateComparisonRow[];
  rejections?: CandidateComparisonRejection[];
}
