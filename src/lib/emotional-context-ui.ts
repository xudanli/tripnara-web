import type { RouteAndRunResponse } from '@/api/agent';
import { applyTtsProsody, applyVoiceTone } from '@/lib/emotional-prosody';
import { applyProactivityGate } from '@/lib/proactivity-gate';
import { getEmotionContextStoreState } from '@/store/emotionContextStore';
import type {
  AudioProsody,
  AudioProsodyPitch,
  EmotionalContextClient,
  ProactivityGate,
} from '@/types/emotional-context';
import type { SharedMilestoneUiCard } from '@/types/shared-milestone';
import type { JourneyState } from '@/api/assistant';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function pickStr(o: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  if (!o) return undefined;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function normalizeAudioProsodyPitch(v: unknown): AudioProsodyPitch {
  if (v === 'low' || v === 'high' || v === 'mid') return v;
  return 'mid';
}

function normalizeAudioProsody(raw: unknown): AudioProsody | undefined {
  if (!isRecord(raw)) return undefined;
  const speedRaw = raw.speedFactor ?? raw.speed_factor;
  const speedFactor =
    typeof speedRaw === 'number' && Number.isFinite(speedRaw) ? speedRaw : undefined;
  const pitch = normalizeAudioProsodyPitch(raw.pitch);
  if (speedFactor == null) return undefined;
  return { speedFactor, pitch };
}

function normalizeProactivityGate(v: unknown): ProactivityGate | undefined {
  if (v === 'SILENT' || v === 'GENTLE' || v === 'ACTIVE' || v === 'FULL') return v;
  return undefined;
}

export function normalizeEmotionalContext(raw: unknown): EmotionalContextClient | null {
  if (!isRecord(raw)) return null;

  const proactivityGate = normalizeProactivityGate(
    raw.proactivityGate ?? raw.proactivity_gate
  );
  const audioProsody = normalizeAudioProsody(raw.audioProsody ?? raw.audio_prosody);
  const ambienceRaw = raw.ambienceSignals ?? raw.ambience_signals;
  const ambienceSignals = isRecord(ambienceRaw)
    ? {
        weatherWindLockActive:
          ambienceRaw.weatherWindLockActive === true ||
          ambienceRaw.weather_wind_lock_active === true,
        ...ambienceRaw,
      }
    : undefined;

  const ctx: EmotionalContextClient = {
    ...(raw.anxietyTriggered === true || raw.anxiety_triggered === true
      ? { anxietyTriggered: true }
      : {}),
    ...(pickStr(raw, 'voiceToneModifier', 'voice_tone_modifier')
      ? { voiceToneModifier: pickStr(raw, 'voiceToneModifier', 'voice_tone_modifier') }
      : {}),
    ...(proactivityGate ? { proactivityGate } : {}),
    ...(audioProsody ? { audioProsody } : {}),
    ...(ambienceSignals ? { ambienceSignals } : {}),
    ...(pickStr(raw, 'userFriendlySummary', 'user_friendly_summary')
      ? { userFriendlySummary: pickStr(raw, 'userFriendlySummary', 'user_friendly_summary') }
      : {}),
  };

  if (
    !ctx.anxietyTriggered &&
    !ctx.voiceToneModifier &&
    !ctx.proactivityGate &&
    !ctx.audioProsody &&
    !ctx.userFriendlySummary &&
    !ctx.ambienceSignals
  ) {
    return null;
  }

  return ctx;
}

function normalizeSharedMilestoneCard(raw: unknown): SharedMilestoneUiCard | null {
  if (!isRecord(raw)) return null;
  const title =
    pickStr(raw, 'title_zh', 'titleZh', 'title') ??
    pickStr(raw, 'headline_zh', 'headlineZh');
  const summary =
    pickStr(raw, 'summary_zh', 'summaryZh', 'summary', 'body_zh', 'bodyZh') ?? title;
  if (!summary && !title) return null;

  const tagsRaw = raw.tags_zh ?? raw.tagsZh ?? raw.tags;
  const tags_zh = Array.isArray(tagsRaw)
    ? tagsRaw.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : undefined;

  const sentimentRaw = raw.sentiment ?? raw.polarity;
  const sentiment =
    typeof sentimentRaw === 'string' && sentimentRaw.trim() ? sentimentRaw.trim() : undefined;

  return {
    ...(typeof raw.card_id === 'string' ? { card_id: raw.card_id } : {}),
    ...(typeof raw.cardId === 'string' ? { card_id: raw.cardId } : {}),
    ...(sentiment ? { sentiment } : {}),
    ...(title ? { title_zh: title } : {}),
    ...(summary ? { summary_zh: summary } : {}),
    ...(tags_zh?.length ? { tags_zh } : {}),
    ...(pickStr(raw, 'when_label_zh', 'whenLabelZh')
      ? { when_label_zh: pickStr(raw, 'when_label_zh', 'whenLabelZh') }
      : {}),
    ...(typeof raw.priority === 'number' ? { priority: raw.priority } : {}),
  };
}

export function normalizeSharedMilestoneCards(raw: unknown): SharedMilestoneUiCard[] {
  if (!Array.isArray(raw)) return [];
  const cards: SharedMilestoneUiCard[] = [];
  for (const item of raw) {
    const card = normalizeSharedMilestoneCard(item);
    if (card) cards.push(card);
  }
  return cards.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
}

function pickRawEmotionalContext(payload: Record<string, unknown> | undefined): unknown {
  if (!payload) return undefined;

  const uiDisplay = isRecord(payload.ui_display) ? payload.ui_display : undefined;
  const fromUi = uiDisplay?.emotional_context ?? uiDisplay?.emotionalContext;
  if (fromUi != null) return fromUi;

  const narration = isRecord(payload.narration) ? payload.narration : undefined;
  return narration?.emotional_context ?? narration?.emotionalContext;
}

function pickRawSharedMilestoneCards(payload: Record<string, unknown> | undefined): unknown {
  if (!payload) return undefined;

  const uiDisplay = isRecord(payload.ui_display) ? payload.ui_display : undefined;
  const fromUi = uiDisplay?.shared_milestone_cards ?? uiDisplay?.sharedMilestoneCards;
  if (fromUi != null) return fromUi;

  return undefined;
}

/** 副作用：写 store + 门控 + TTS 韵律 */
export function applyEmotionalContextSideEffects(ctx: EmotionalContextClient | null): void {
  if (!ctx) return;
  getEmotionContextStoreState().set(ctx);
  if (ctx.proactivityGate) applyProactivityGate(ctx.proactivityGate);
  if (ctx.audioProsody) applyTtsProsody(ctx.audioProsody);
  if (ctx.voiceToneModifier) applyVoiceTone(ctx.voiceToneModifier);
}

/** ui_display.emotional_context 优先 */
export function pickEmotionalContextFromRouteRun(
  response: RouteAndRunResponse
): EmotionalContextClient | null {
  if (response.result?.status !== 'OK') return null;

  const payload = response.result?.payload as Record<string, unknown> | undefined;
  return normalizeEmotionalContext(pickRawEmotionalContext(payload));
}

export function pickSharedMilestoneCardsFromRouteRun(
  response: RouteAndRunResponse
): SharedMilestoneUiCard[] {
  if (response.result?.status !== 'OK') return [];

  const payload = response.result?.payload as Record<string, unknown> | undefined;
  const raw = pickRawSharedMilestoneCards(payload);
  if (raw == null) return [];
  return normalizeSharedMilestoneCards(raw);
}

export function hasSharedMilestoneCardsUi(
  cards: SharedMilestoneUiCard[] | null | undefined
): boolean {
  return Boolean(cards?.length);
}

export function isAnchoringEmotionalContext(ctx: EmotionalContextClient | null | undefined): boolean {
  if (!ctx) return false;
  return (
    ctx.anxietyTriggered === true || ctx.voiceToneModifier === 'professional_authoritative'
  );
}

/** route_and_run OK 终态：写 store + 里程碑卡 */
export function applyEmotionalContextFromRouteRun(response: RouteAndRunResponse): {
  emotionalContext: EmotionalContextClient | null;
  sharedMilestoneCards: SharedMilestoneUiCard[];
} {
  const emotionalContext = pickEmotionalContextFromRouteRun(response);
  const sharedMilestoneCards = pickSharedMilestoneCardsFromRouteRun(response);

  if (emotionalContext) applyEmotionalContextSideEffects(emotionalContext);
  if (sharedMilestoneCards.length > 0) {
    getEmotionContextStoreState().setMilestoneCards(sharedMilestoneCards);
  }

  return { emotionalContext, sharedMilestoneCards };
}

/** journeyState.emotionalContext / emotional_context */
export function pickEmotionalContextFromJourneyState(
  state: JourneyState | null | undefined
): EmotionalContextClient | null {
  if (!state) return null;
  const raw =
    (state as { emotionalContext?: unknown }).emotionalContext ??
    (state as { emotional_context?: unknown }).emotional_context;
  return normalizeEmotionalContext(raw);
}

export function applyEmotionalContextFromJourneyState(
  state: JourneyState | null | undefined
): EmotionalContextClient | null {
  const ctx = pickEmotionalContextFromJourneyState(state);
  if (ctx) applyEmotionalContextSideEffects(ctx);
  return ctx;
}

/** SSE PHASE：NARRATE 阶段提前切换 TTS / 门控 */
export function applyEmotionalContextFromSsePayload(payload: RouteAndRunTaskSsePayload): void {
  if (payload.current_phase !== 'NARRATE') return;

  const raw = payload.emotional_context ?? payload.emotionalContext;
  const ctx = normalizeEmotionalContext(raw);
  if (!ctx) return;

  applyEmotionalContextSideEffects(ctx);
}
