export { PREMIUM_TREKKING_SCENE, PREMIUM_TREKKING_MENU_KEY, VIBE_CHIP_LABEL_TO_ID } from './premium-trekking.config';
export { TREKKING_SCRIPT_WORLD_BINDINGS } from './trekking-vibe-world-model.config';
export {
  buildTrekkingOrchestrationPlan,
  isPremiumTrekkingVision,
  type BuildTrekkingOrchestrationInput,
} from './trekking-vibe-orchestration.engine';
export { normalizeTrekkingOrchestration } from './normalize-orchestration';
export {
  normalizeSpawnTrekTripPreview,
  normalizeSpawnTrekTripResult,
  buildSpawnPreviewFromOrchestration,
} from './normalize-spawn-trek-trip';
export {
  mockGetSpawnTrekTripPreview,
  mockSpawnTrekTrip,
  getMockTrekSpawnState,
} from './spawn-trek-trip-mock';
export {
  inferTrekRegionFocus,
  filterRouteCandidatesForRegion,
  orchestrationDisplayHeadline,
} from './trek-region-inference';
export type { TrekRegionFocus } from './trek-region-inference';
export {
  ACTIVITY_PROFILE_TO_SCRIPT_ID,
  SCRIPT_ID_TO_ACTIVITY_PROFILE,
  scriptIdFromActivityProfile,
  activityProfileFromScriptId,
} from './script-id-map';
