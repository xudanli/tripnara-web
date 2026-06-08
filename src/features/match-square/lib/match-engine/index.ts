export type {
  MatchEngineProfile,
  StructuralMatchResult,
  StructuralMatchInsight,
  CalculateStructuralMatchOptions,
  ControlStyleBand,
  MatchTripWindow,
} from './types';

export {
  scoreEducationE1,
  scoreEducationE2,
  computeSocialScore,
  socialScoreToTier,
  extractCredentialScalars,
} from './credentials-scoring';

export {
  resolveStressTraits,
  resolveControlStyleBand,
  loadStoredPremiumStressAnswers,
} from './stress-traits';

export { computeMbtiSynergy, idealMemberArchetypes } from './mbti-synergy';

export {
  buildMatchEngineProfile,
  buildCaptainProfileFromPost,
  buildViewerProfileFromContext,
  serializeFeatureVector,
} from './build-profile';

export {
  calculateStructuralMatch,
  controlStyleLabel,
} from './calculate-match';

export {
  generateConstraintSlotLabels,
  slotLabelMatchesViewer,
} from './puzzle-slots';

export { computeTripOverlapDays, passesSocialBandwidthGate } from './hard-gates';
