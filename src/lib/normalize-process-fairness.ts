import type {
  ActivePreferenceRoundResponse,
  PreferenceRoundDetail,
  PreferenceRoundHeardRate,
  PreferenceRoundIntervention,
  PreferenceRoundListItem,
  PreferenceRoundListResponse,
  PreferenceRoundStatus,
  PreferenceRoundUtterance,
  ProcessFairnessClientNavigation,
  ProcessFairnessPayload,
  ProcessFairnessStatus,
  UtteranceModality,
  VoiceGuardIntervention,
  VoiceGuardMember,
  VoiceGuardStatus,
} from '@/types/process-fairness';
import type { TripDomain } from '@/types/trip-domain-influence';

const DOMAIN_VALUES: TripDomain[] = [
  'destination_route',
  'main_transport',
  'accommodation',
  'activities',
  'dining',
  'local_transport',
  'shopping',
  'insurance_visa',
];

const ROUND_STATUSES: PreferenceRoundStatus[] = ['collecting', 'synthesizing', 'closed'];
const MODALITIES: UtteranceModality[] = ['text', 'voice', 'image', 'link'];

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function normalizeDomain(raw: unknown): TripDomain {
  const s = asString(raw);
  return DOMAIN_VALUES.includes(s as TripDomain) ? (s as TripDomain) : 'accommodation';
}

function normalizeRoundStatus(raw: unknown): PreferenceRoundStatus {
  const s = asString(raw, 'collecting');
  return ROUND_STATUSES.includes(s as PreferenceRoundStatus) ? (s as PreferenceRoundStatus) : 'collecting';
}

function normalizeModality(raw: unknown): UtteranceModality {
  const s = asString(raw, 'text');
  return MODALITIES.includes(s as UtteranceModality) ? (s as UtteranceModality) : 'text';
}

function nullableString(raw: unknown): string | null {
  return typeof raw === 'string' ? raw : null;
}

export function normalizeUtterance(raw: unknown): PreferenceRoundUtterance | null {
  const r = asRecord(raw);
  if (!r) return null;
  const id = asString(r.id);
  if (!id) return null;

  return {
    id,
    userId: asString(r.userId ?? r.user_id),
    displayName: asString(r.displayName ?? r.display_name, '成员'),
    turnIndex: asNumber(r.turnIndex ?? r.turn_index),
    modality: normalizeModality(r.modality),
    content: asString(r.content),
    reason: nullableString(r.reason),
    viaProxy: asBool(r.viaProxy ?? r.via_proxy),
    createdAt: asString(r.createdAt ?? r.created_at, new Date().toISOString()),
  };
}

function normalizeHeardRate(raw: unknown): PreferenceRoundHeardRate | null {
  const r = asRecord(raw);
  if (!r) return null;
  return {
    userId: asString(r.userId ?? r.user_id),
    displayName: asString(r.displayName ?? r.display_name, '成员'),
    heardRate: asNumber(r.heardRate ?? r.heard_rate),
  };
}

function normalizeIntervention(raw: unknown): PreferenceRoundIntervention | null {
  const r = asRecord(raw);
  if (!r) return null;
  return {
    targetUserId: asString(r.targetUserId ?? r.target_user_id),
    displayName: asString(r.displayName ?? r.display_name, '成员'),
    heardRate: asNumber(r.heardRate ?? r.heard_rate),
    messageCN: asString(r.messageCN ?? r.message_cn),
  };
}

export function normalizePreferenceRoundDetail(raw: unknown): PreferenceRoundDetail | null {
  const r = asRecord(raw);
  if (!r) return null;
  const id = asString(r.id);
  if (!id) return null;

  const utterancesRaw = r.utterances;
  const utterances = Array.isArray(utterancesRaw)
    ? utterancesRaw.map(normalizeUtterance).filter((x): x is PreferenceRoundUtterance => x != null)
    : [];

  const heardRatesRaw = r.heardRates ?? r.heard_rates;
  const heardRates = Array.isArray(heardRatesRaw)
    ? heardRatesRaw.map(normalizeHeardRate).filter((x): x is PreferenceRoundHeardRate => x != null)
    : heardRatesRaw === null
      ? null
      : null;

  const interventionsRaw = r.interventions;
  const interventions = Array.isArray(interventionsRaw)
    ? interventionsRaw.map(normalizeIntervention).filter((x): x is PreferenceRoundIntervention => x != null)
    : [];

  return {
    id,
    tripId: asString(r.tripId ?? r.trip_id),
    domain: normalizeDomain(r.domain),
    decisionNode: asString(r.decisionNode ?? r.decision_node),
    status: normalizeRoundStatus(r.status),
    statusLabel: asString(r.statusLabel ?? r.status_label, '收集团队意见…'),
    turnOrder: Array.isArray(r.turnOrder ?? r.turn_order)
      ? (r.turnOrder ?? r.turn_order as unknown[]).map((x) => asString(x)).filter(Boolean)
      : [],
    currentTurn: asNumber(r.currentTurn ?? r.current_turn),
    currentSpeakerUserId: nullableString(r.currentSpeakerUserId ?? r.current_speaker_user_id),
    currentSpeakerDisplayName: nullableString(r.currentSpeakerDisplayName ?? r.current_speaker_display_name),
    closesAt: nullableString(r.closesAt ?? r.closes_at),
    closedAt: nullableString(r.closedAt ?? r.closed_at),
    utterances,
    heardRates,
    interventions,
    canSpeak: asBool(r.canSpeak ?? r.can_speak),
    canSubmitHeardVotes: asBool(r.canSubmitHeardVotes ?? r.can_submit_heard_votes),
    myHeardVotesSubmitted: asBool(r.myHeardVotesSubmitted ?? r.my_heard_votes_submitted),
  };
}

export function normalizePreferenceRoundListItem(raw: unknown): PreferenceRoundListItem | null {
  const r = asRecord(raw);
  if (!r) return null;
  const id = asString(r.id);
  if (!id) return null;

  return {
    id,
    tripId: asString(r.tripId ?? r.trip_id),
    domain: normalizeDomain(r.domain),
    decisionNode: asString(r.decisionNode ?? r.decision_node),
    status: normalizeRoundStatus(r.status),
    statusLabel: asString(r.statusLabel ?? r.status_label),
    closesAt: nullableString(r.closesAt ?? r.closes_at),
    utteranceCount: asNumber(r.utteranceCount ?? r.utterance_count),
    memberCount: asNumber(r.memberCount ?? r.member_count),
  };
}

export function normalizePreferenceRoundListResponse(raw: unknown): PreferenceRoundListResponse {
  const r = asRecord(raw);
  if (!r) return { items: [], count: 0 };

  const itemsRaw = r.items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map(normalizePreferenceRoundListItem).filter((x): x is PreferenceRoundListItem => x != null)
    : [];

  return { items, count: asNumber(r.count, items.length) };
}

export function normalizeActivePreferenceRound(raw: unknown): ActivePreferenceRoundResponse {
  const r = asRecord(raw);
  if (!r) return { domain: '', activeRoundId: null };

  const activeRoundId = r.activeRoundId ?? r.active_round_id;
  return {
    domain: asString(r.domain),
    activeRoundId: typeof activeRoundId === 'string' ? activeRoundId : null,
  };
}

function normalizeVoiceGuardMember(raw: unknown): VoiceGuardMember | null {
  const r = asRecord(raw);
  if (!r) return null;
  return {
    userId: asString(r.userId ?? r.user_id),
    displayName: asString(r.displayName ?? r.display_name, '成员'),
    preferenceSubmits: asNumber(r.preferenceSubmits ?? r.preference_submits),
    voteParticipations: asNumber(r.voteParticipations ?? r.vote_participations),
    discussionUtterances: asNumber(r.discussionUtterances ?? r.discussion_utterances),
    consecutiveSilentRounds: asNumber(r.consecutiveSilentRounds ?? r.consecutive_silent_rounds),
    lastSpokeAt: nullableString(r.lastSpokeAt ?? r.last_spoke_at),
    engagementScore: asNumber(r.engagementScore ?? r.engagement_score),
  };
}

function normalizeVoiceGuardIntervention(raw: unknown): VoiceGuardIntervention | null {
  const r = asRecord(raw);
  if (!r) return null;
  return {
    userId: asString(r.userId ?? r.user_id),
    displayName: asString(r.displayName ?? r.display_name, '成员'),
    reason: asString(r.reason),
    privateMessageCN: asString(r.privateMessageCN ?? r.private_message_cn),
    groupMessageCN: asString(r.groupMessageCN ?? r.group_message_cn),
    severity: asString(r.severity, 'medium'),
  };
}

export function normalizeVoiceGuardStatus(raw: unknown): VoiceGuardStatus | null {
  const r = asRecord(raw);
  if (!r) return null;

  const membersRaw = r.members;
  const members = Array.isArray(membersRaw)
    ? membersRaw.map(normalizeVoiceGuardMember).filter((x): x is VoiceGuardMember => x != null)
    : [];

  const interventionsRaw = r.interventions;
  const interventions = Array.isArray(interventionsRaw)
    ? interventionsRaw.map(normalizeVoiceGuardIntervention).filter((x): x is VoiceGuardIntervention => x != null)
    : [];

  return {
    tripId: asString(r.tripId ?? r.trip_id),
    memberCount: asNumber(r.memberCount ?? r.member_count, members.length),
    averageEngagementScore: asNumber(r.averageEngagementScore ?? r.average_engagement_score),
    members,
    interventions,
  };
}

function normalizeClientNavigation(raw: unknown): ProcessFairnessClientNavigation | undefined {
  const r = asRecord(raw);
  if (!r) return undefined;
  const route = asString(r.route);
  const tripId = asString(r.tripId ?? r.trip_id);
  const roundId = asString(r.roundId ?? r.round_id);
  if (!route || !tripId || !roundId) return undefined;
  return {
    route,
    tripId,
    roundId,
    domain: asString(r.domain),
  };
}

function normalizeProcessFairnessStatus(raw: unknown): ProcessFairnessStatus | undefined {
  const s = asString(raw).toUpperCase();
  if (!s) return undefined;
  return s as ProcessFairnessStatus;
}

export function normalizeProcessFairnessPayload(raw: unknown): ProcessFairnessPayload | null {
  const r = asRecord(raw);
  if (!r) return null;

  const triggered = asBool(r.triggered);
  const status = normalizeProcessFairnessStatus(r.status);
  // SCAFFOLD：单人行程成功返回讨论框架，未必带 triggered=true
  if (!triggered && status !== 'SCAFFOLD') return null;

  const roundRaw = r.round;
  const round = roundRaw ? normalizePreferenceRoundDetail(roundRaw) ?? undefined : undefined;

  return {
    triggered,
    status,
    decisionNode: asString(r.decisionNode ?? r.decision_node) || undefined,
    roundId: asString(r.roundId ?? r.round_id) || undefined,
    round: round ?? undefined,
    agentIntroZh: asString(r.agentIntroZh ?? r.agent_intro_zh) || undefined,
    clientNavigation: normalizeClientNavigation(r.clientNavigation ?? r.client_navigation),
  };
}

export function pickProcessFairnessFromPayload(
  payload: Record<string, unknown> | undefined | null,
): ProcessFairnessPayload | null {
  if (!payload) return null;
  return normalizeProcessFairnessPayload(payload.process_fairness ?? payload.processFairness);
}
