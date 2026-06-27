/** BFF 投影：route_and_run NEED_MORE_INFO 松弛建议（tripnara.relaxation_suggestion@v1） */

export type RelaxationSuggestionKind =
  | 'relaxation'
  | 'proceed_at_own_risk'
  | 'accept_no_solution'
  | 'manual_relax_constraints';

export type RelaxationSuggestionConfidence =
  | 'high_probability_fixed'
  | 'needs_more_changes';

export type RelaxationSuggestionPathGroup = 'path_a' | 'path_b' | 'other';

export interface RelaxationSuggestionMetadataV1 {
  fixed_conflict_types?: string[];
  violations_before?: number;
  violations_after?: number;
}

export interface RelaxationSuggestionV1 {
  schema: 'tripnara.relaxation_suggestion@v1';
  actionId: string;
  labelZh: string;
  descriptionZh: string;
  kind: RelaxationSuggestionKind;
  confidence?: RelaxationSuggestionConfidence;
  score?: number;
  pathGroup?: RelaxationSuggestionPathGroup;
  recommended?: boolean;
  metadata?: RelaxationSuggestionMetadataV1;
}

export type RelaxationSelectionMode = 'single' | 'multi';

export interface RelaxationSuggestionsContextV1 {
  schema: 'tripnara.relaxation_suggestions@v1';
  questionId: string;
  selectionMode: RelaxationSelectionMode;
  headlineZh?: string;
  riskLevel?: string;
  conflictType?: string;
  failureRiskScore?: number;
  failureProbHintZh?: string;
}

export interface RelaxationSuggestionsBundle {
  suggestions: RelaxationSuggestionV1[];
  context: RelaxationSuggestionsContextV1;
}
