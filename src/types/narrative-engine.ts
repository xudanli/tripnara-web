/**
 * TravelStoryform & Narrative Engine V1
 * @see docs/api/narrative-engine-v1-api-spec.md
 * Schema Version: 1
 */

// ==================== Arc & intake enums ====================

/** V1 可用弧线；V2 增加 'hero' | 'transformation' */
export type NarrativeArcTemplate =
  | 'exploration'
  | 'healing'
  | 'connection'
  | 'neutral';

/** V2+ 反思模式；V1 仅存储默认值 */
export type ReflectionMode = 'analytical' | 'resonance' | 'silent';

/** Q2 旅行动机选项 */
export type TravelMotivation =
  | 'rest'
  | 'discovery'
  | 'connection'
  | 'challenge'
  | 'celebration'
  | 'closure'
  | 'unsure';

/** 旅伴结构 */
export type CompanionContext = 'solo' | 'couple' | 'group' | 'family';

export type ThemeConfidence = 'high' | 'medium' | 'low';

// ==================== Intent bridge (V2) ====================

/** V1: opaque；V2 与后端 CompiledIntent 对齐 */
export type CompiledIntent = Record<string, unknown>;

export type NarrativePacePreference = 'SLOW' | 'MODERATE' | 'FAST';

export type NarrativeMobilityPreference = 'WALKING' | 'DRIVING' | 'MIXED';

// ==================== Intake ====================

export interface NarrativeIntakeInput {
  /** Q1: 最近状态 / 感受 */
  recentState?: string;
  /** Q2: 旅行目的（可多选） */
  motivations?: TravelMotivation[];
  /** Q3: 期待气质标签，最多 3 个 */
  moodKeywords?: string[];
  /** 可选：自由补充 */
  freeText?: string;
}

export interface NarrativeIntakeRequest {
  intake: NarrativeIntakeInput;
  locale?: string;
}

// ==================== Theme candidates ====================

export interface ThemeCandidate {
  id: string;
  title: string;
  tagline: string;
  arcTemplate: NarrativeArcTemplate;
  resonanceHint?: string;
  confidence: ThemeConfidence;
  fallbackGenerated: boolean;
}

export interface GenerateCandidatesResult {
  tripId: string;
  candidates: ThemeCandidate[];
  generationRequestId: string;
  regenerateCount: number;
  expiresAt: string;
}

// ==================== Storyform ====================

export interface NarrativeChapter {
  dayIndex: number;
  date?: string;
  title: string;
  emotionalBeat: 'opening' | 'rising' | 'challenge' | 'turn' | 'resolution' | 'quiet';
  motifs: string[];
  sceneConstraints?: SceneConstraint[];
}

export interface SceneConstraint {
  preferPoiCategories?: string[];
  avoidPoiCategories?: string[];
  maxDailyDriveHoursOverride?: number;
  aweMomentSlot?: boolean;
}

export interface TravelStoryform {
  schemaVersion: 1;
  objective: {
    compiledIntent?: CompiledIntent;
    destination?: string;
    tripDays?: number;
  };
  protagonist: {
    paceProfile?: NarrativePacePreference;
    mobilityPreference?: NarrativeMobilityPreference;
    selfDescription?: string;
    emotionalBaseline?: string;
  };
  catalyst: {
    motivations: TravelMotivation[];
    recentState?: string;
    lifeChapter?: string;
  };
  relational: {
    companionContext?: CompanionContext;
    connectionIntent?: string[];
  };
  narrativePreferences: {
    arcTemplate: NarrativeArcTemplate;
    reflectionMode: ReflectionMode;
    moodKeywords?: string[];
  };
  selectedTheme?: {
    themeId: string;
    title: string;
    tagline: string;
    selectedAt: string;
  };
  chapters?: NarrativeChapter[];
  meta: {
    generationRequestId?: string;
    regenerateCount: number;
    intakeSnapshot?: NarrativeIntakeInput;
    updatedAt: string;
  };
}

/** 写入 Trip.metadata.narrativeTheme */
export interface TripNarrativeThemeMetadata {
  schemaVersion: 1;
  selectedThemeId: string;
  title: string;
  tagline: string;
  arcTemplate: NarrativeArcTemplate;
  reflectionMode: ReflectionMode;
  intakeSnapshot?: NarrativeIntakeInput;
  selectedAt: string;
  generationRequestId?: string;
  regenerateCount: number;
}

// ==================== API requests / responses ====================

export interface SelectThemeRequest {
  themeId: string;
  generationRequestId: string;
}

export interface RegenerateThemeRequest {
  generationRequestId: string;
}

export interface SelectThemeResponse {
  tripId: string;
  theme: TripNarrativeThemeMetadata;
}

export interface GetThemeResponse {
  tripId: string;
  theme: TripNarrativeThemeMetadata | null;
  storyform: TravelStoryform | null;
}

export interface ClearThemeResponse {
  tripId: string;
  cleared: boolean;
}

// ==================== Error codes ====================

export const NARRATIVE_THEME_ERROR_CODES = {
  DISABLED: 'NARRATIVE_THEME_DISABLED',
  TRIP_NOT_FOUND: 'TRIP_NOT_FOUND',
  REGENERATE_LIMIT: 'NARRATIVE_REGENERATE_LIMIT',
  GENERATION_FAILED: 'NARRATIVE_GENERATION_FAILED',
  THEME_NOT_FOUND: 'NARRATIVE_THEME_NOT_FOUND',
  GENERATION_EXPIRED: 'NARRATIVE_GENERATION_EXPIRED',
} as const;

export type NarrativeThemeErrorCode =
  (typeof NARRATIVE_THEME_ERROR_CODES)[keyof typeof NARRATIVE_THEME_ERROR_CODES];
