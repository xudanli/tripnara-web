/** RFC-003 view names — GET /travel-contexts/:contextId/views/:view */
export const TRAVEL_CONTEXT_VIEW_NAMES = [
  'overview',
  'exploration',
  'plan',
  'decisions',
  'monitoring',
  'participants',
  'feasibility',
  'assistant',
] as const;

export type TravelContextViewName = (typeof TRAVEL_CONTEXT_VIEW_NAMES)[number];

/** V1 intent types — POST /travel-contexts/:contextId/intents */
export const TRAVEL_CONTEXT_INTENT_TYPES = [
  'CHANGE_EXPLORATION_CONDITIONS',
  'SET_PRINCIPLES',
  'GENERATE_CANDIDATES',
  'SELECT_ROUTE',
  'MATERIALIZE_TRIP',
  'RUN_FEASIBILITY_CHECK',
  'ACCEPT_DECISION_OPTION',
  'APPLY_DECISION',
] as const;

export type TravelContextIntentType = (typeof TRAVEL_CONTEXT_INTENT_TYPES)[number];

export const TRAVEL_CONTEXT_STAGES = [
  'EXPLORATION',
  'PLANNING',
  'EXECUTION',
  'MONITORING',
] as const;

export type TravelContextStage = (typeof TRAVEL_CONTEXT_STAGES)[number];
