import type { RouteAndRunResponse } from '@/api/agent';
import { applyTtsProsody, applyVoiceTone } from '@/lib/emotional-prosody';
import {
  EMOTIONAL_CONTEXT_CLIENT_SCHEMA,
  isAcceptedEmotionalContextSchema,
  normalizeEmotionalContextSchema,
} from '@/lib/emotional-context-schema';
import { applyProactivityGate } from '@/lib/proactivity-gate';
import { getEmotionContextStoreState } from '@/store/emotionContextStore';
import type {
  AudioProsody,
  AudioProsodyPitch,
  EmotionalContextClient,
  ProactivityGate,
} from '@/types/emotional-context';
import type { SharedMilestoneUiCard } from '@/types/shared-milestone';
import { applyVoicePayloadSideEffects, pickVoicePayloadFromRouteRun } from '@/lib/voice-payload-ui';
import {
  applyAccommodationHealthSideEffects,
  pickAccommodationHealthFromRouteRun,
} from '@/lib/accommodation-health-ui';
import type { JourneyState } from '@/api/assistant';
import type { RouteAndRunTaskSsePayload } from '@/types/route-and-run-task-sse';

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

  const schemaRaw = raw.schema;
  if (!isAcceptedEmotionalContextSchema(schemaRaw)) {
    if (import.meta.env.DEV) {
      console.warn('[emotional-context] rejected schema:', schemaRaw);
    }
    return null;
  }
  const schema = normalizeEmotionalContextSchema(schemaRaw);

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
    ...(schema ? { schema } : {}),
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
    !ctx.schema &&
    !ctx.anxietyTriggered &&
    !ctx.voiceToneModifier &&
    !ctx.proactivityGate &&
    !ctx.audioProsody &&
    !ctx.userFriendlySummary &&
    !ctx.ambienceSignals
  ) {
    return null;
  }

  if (!ctx.schema && import.meta.env.DEV) {
    // legacy 无 schema 出站：标注为 client@v1 便于调试
    ctx.schema = EMOTIONAL_CONTEXT_CLIENT_SCHEMA;
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

function pickEmotionalContextFromRecord(record: Record<string, unknown> | undefined): unknown {
  if (!record) return undefined;
  return record.emotional_context ?? record.emotionalContext;
}

function pickRawEmotionalContextFromPayload(payload: Record<string, unknown> | undefined): unknown {
  if (!payload) return undefined;

  // 1) 展示层优先
  const uiDisplay = isRecord(payload.ui_display) ? payload.ui_display : undefined;
  const fromUi = pickEmotionalContextFromRecord(uiDisplay);
  if (fromUi != null) return fromUi;

  // 2) payload.metadata 镜像（assembler 回放）
  const payloadMeta = isRecord(payload.metadata) ? payload.metadata : undefined;
  const fromPayloadMeta = pickEmotionalContextFromRecord(payloadMeta);
  if (fromPayloadMeta != null) return fromPayloadMeta;

  // 3) orchestrationResult.state / state.metadata
  const orch = isRecord(payload.orchestrationResult) ? payload.orchestrationResult : undefined;
  const state = isRecord(orch?.state) ? (orch.state as Record<string, unknown>) : undefined;
  const fromState = pickEmotionalContextFromRecord(state);
  if (fromState != null) return fromState;

  const stateMeta = isRecord(state?.metadata) ? (state.metadata as Record<string, unknown>) : undefined;
  const fromStateMeta = pickEmotionalContextFromRecord(stateMeta);
  if (fromStateMeta != null) return fromStateMeta;

  // 4) narration 兜底
  const narration = isRecord(payload.narration) ? payload.narration : undefined;
  return pickEmotionalContextFromRecord(narration);
}

function pickRawEmotionalContextFromRouteRun(response: RouteAndRunResponse): unknown {
  const payload = response.result?.payload as Record<string, unknown> | undefined;
  const fromPayload = pickRawEmotionalContextFromPayload(payload);
  if (fromPayload != null) return fromPayload;

  // observability / meta 顶层 metadata 镜像
  for (const root of [
    response.observability as Record<string, unknown> | undefined,
    response.meta as Record<string, unknown> | undefined,
    isRecord(response.meta?.observability)
      ? (response.meta!.observability as Record<string, unknown>)
      : undefined,
  ]) {
    if (!root) continue;
    const meta = isRecord(root.metadata) ? (root.metadata as Record<string, unknown>) : root;
    const fromObs = pickEmotionalContextFromRecord(meta);
    if (fromObs != null) return fromObs;
  }

  return undefined;
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

/** ui_display.emotional_context 优先；次选 metadata / state 镜像 */
export function pickEmotionalContextFromRouteRun(
  response: RouteAndRunResponse
): EmotionalContextClient | null {
  if (response.result?.status !== 'OK') return null;

  return normalizeEmotionalContext(pickRawEmotionalContextFromRouteRun(response));
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
    ctx.anxietyTriggered === true ||
    ctx.voiceToneModifier === 'professional_authoritative' ||
    ctx.voiceToneModifier === 'empathetic_reassurance'
  );
}

export function isReassuranceEmotionalContext(ctx: EmotionalContextClient | null | undefined): boolean {
  if (!ctx) return false;
  return ctx.voiceToneModifier === 'empathetic_reassurance';
}

/** route_and_run OK 终态：写 store + 里程碑卡 + 暖心语音/住宿健康度 */
export function applyEmotionalContextFromRouteRun(response: RouteAndRunResponse): {
  emotionalContext: EmotionalContextClient | null;
  sharedMilestoneCards: SharedMilestoneUiCard[];
  voicePayload: import('@/types/voice-payload').VoicePayload | null;
  accommodationHealth: import('@/types/accommodation-health').AccommodationHealthPayload | null;
} {
  const emotionalContext = pickEmotionalContextFromRouteRun(response);
  const sharedMilestoneCards = pickSharedMilestoneCardsFromRouteRun(response);
  const voicePayload = pickVoicePayloadFromRouteRun(response);
  const accommodationHealth = pickAccommodationHealthFromRouteRun(response);

  if (emotionalContext) applyEmotionalContextSideEffects(emotionalContext);
  if (voicePayload) applyVoicePayloadSideEffects(voicePayload);
  else applyVoicePayloadSideEffects(null);
  if (accommodationHealth) applyAccommodationHealthSideEffects(accommodationHealth);
  else applyAccommodationHealthSideEffects(null);
  if (sharedMilestoneCards.length > 0) {
    getEmotionContextStoreState().setMilestoneCards(sharedMilestoneCards);
  }

  return { emotionalContext, sharedMilestoneCards, voicePayload, accommodationHealth };
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
