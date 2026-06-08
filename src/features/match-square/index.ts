export { default as MatchSquarePlazaPage } from './pages/MatchSquarePlazaPage';
export { default as RecruitmentDetailPage } from './pages/RecruitmentDetailPage';
export { default as RecruitmentCreatePage } from './pages/RecruitmentCreatePage';
export { default as MyRecruitmentsPage } from './pages/MyRecruitmentsPage';
export { default as RecruitmentManagePage } from './pages/RecruitmentManagePage';

export { PendingReputationBanner } from './components/PendingReputationBanner';
export { ReputationGlobalPrompt } from './components/ReputationGlobalPrompt';
export { ReputationAssetsSection } from './components/ReputationAssetsSection';
export { MatchLearningDebugPanel } from './components/MatchLearningDebugPanel';

export {
  computeCompatibilityScore,
  computeMatchDimensionBreakdown,
  computeStructuralMatch,
  buildMatchInsights,
  detectPlanConflict,
} from './lib/matching';

export {
  calculateStructuralMatch,
  buildMatchEngineProfile,
  buildCaptainProfileFromPost,
  buildViewerProfileFromContext,
  serializeFeatureVector,
  generateConstraintSlotLabels,
} from './lib/match-engine';

export { VibeIntentComposer } from './components/VibeIntentComposer';
export { useVibeLlmParse } from './hooks/useVibeLlmParse';
