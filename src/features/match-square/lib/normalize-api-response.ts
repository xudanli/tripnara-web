import type {
  ApplicationStatus,
  ApplyPreview,
  BudgetRange,
  CaptainRadarResponse,
  DestinationRegionOption,
  MatchFlashPayload,
  MatchInsightDrawer,
  MatchSquareAccess,
  MatchSquareFilterOptions,
  PhysicalFitnessGate,
  PhysicalFitnessReport,
  PhysicalSurvivalQuizQuestion,
  PlanningStyle,
  PlazaFeedItem,
  PostListResponse,
  RadarHint,
  RecruitmentApplicationCard,
  RecruitmentPostCard,
  RecruitmentPostStatus,
  ReviewApplicationResult,
  StructuralMatchSnapshot,
  TeamPuzzle,
  TeamSlot,
  TeamStatus,
  TravelIntentStatus,
  TripMoodTag,
  TravelMode,
  CaptainRadarCandidate,
  VibeLlmCardBlock,
  ViewerPuzzleMatch,
} from '@/types/match-square';
import { normalizeRecruitingAttribution, normalizeRecruitingOutcome } from './normalize-recruiting-runtime';
import {
  formatFilledPuzzleSlotLabel,
  peelPuzzleOpenSlotDecorations,
} from './compact-puzzle-slot-label';
import { stripCaptainSelfMatchInsights } from './match-enrichment';
import { normalizeCompatibilityPercent } from './normalize-compatibility-percent';
import { PLANNING_STYLE_CAPSULES } from './constants';
import { buildClarifyDestinationRegions } from './destination-options';
import { sanitizeVibeBudgetCopy } from './vibe-budget-coherence';
import { normalizeVerifiedCredentials } from './verified-credentials';
import { formatDateRangeLabel } from './mock-data';
import { isApplicationStatus, normalizeApplicationStatus } from './application-status';
import {
  buildTrekkingOrchestrationPlan,
  normalizeTrekkingOrchestration,
} from './trekking-orchestration';
import { normalizePreMatchDecisionBrief } from './decision-engine/normalize-collaborative-tasks';
import { normalizeInstantiateTripResult } from './trip-instantiation/normalize-trip-instantiation';
import { normalizeSovereignForceLockRecord } from './sovereign-force-lock/normalize-sovereign-force-lock';
import { resolveApplicantRealName, resolveApplicantCardTitle } from './resolve-applicant-credentials';

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readNullableNumber(record: Record<string, unknown>, camel: string, snake: string): number | null {
  const value = readNumber(record[camel] ?? record[snake]);
  return value ?? null;
}

function readTripMoodTag(raw: unknown): TripMoodTag | null {
  if (raw === 'relax' || raw === 'adventure' || raw === 'healing' || raw === 'social') {
    return raw;
  }
  return null;
}

function readTravelMode(raw: unknown): TravelMode | null {
  if (raw === 'self_drive' || raw === 'public_transit' || raw === 'mixed' || raw === 'other') {
    return raw;
  }
  return null;
}

function normalizeBudgetRange(record: Record<string, unknown>): BudgetRange | null {
  const budgetRaw = record.budgetRange ?? record.budget_range;
  if (budgetRaw && typeof budgetRaw === 'object') {
    const budget = budgetRaw as Record<string, unknown>;
    const minCents = readNumber(budget.minCents ?? budget.min_cents);
    const maxCents = readNumber(budget.maxCents ?? budget.max_cents);
    if (minCents != null || maxCents != null) {
      return { minCents: minCents ?? null, maxCents: maxCents ?? null };
    }
  }

  const minTop = readNumber(record.budgetMinCents ?? record.budget_min_cents);
  const maxTop = readNumber(record.budgetMaxCents ?? record.budget_max_cents);
  if (minTop != null || maxTop != null) {
    return { minCents: minTop ?? null, maxCents: maxTop ?? null };
  }

  return null;
}

/** GET /match-square/access */
export function normalizeMatchSquareAccess(raw: unknown): MatchSquareAccess {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const readBool = (camel: string, snake: string): boolean | undefined => {
    const value = record[camel] ?? record[snake];
    if (value === true || value === 1 || value === 'true') return true;
    if (value === false || value === 0 || value === 'false') return false;
    return undefined;
  };

  const access: MatchSquareAccess = {
    canBrowse: readBool('canBrowse', 'can_browse') ?? true,
    canPost: readBool('canPost', 'can_post') ?? false,
    canApply: readBool('canApply', 'can_apply') ?? false,
    quizComplete: readBool('quizComplete', 'quiz_complete') ?? false,
  };
  // R0：公开发布需 PublishingPermission，忽略后端基于 quizComplete 的旧 canPost
  return { ...access, canPost: false };
}

function normalizeTeamStatus(raw: Record<string, unknown>): TeamStatus {
  const nested = (raw.teamStatus ?? raw.team_status) as Record<string, unknown> | undefined;
  const slotsNeeded =
    readNumber(nested?.slotsNeeded ?? nested?.slots_needed) ??
    readNumber(raw.slotsNeeded ?? raw.slots_needed) ??
    1;
  const slotsFilled =
    readNumber(nested?.slotsFilled ?? nested?.slots_filled) ??
    readNumber(raw.slotsFilled ?? raw.slots_filled) ??
    0;
  const slotsRemaining =
    readNumber(nested?.slotsRemaining ?? nested?.slots_remaining) ??
    Math.max(0, slotsNeeded - slotsFilled);

  return { slotsFilled, slotsNeeded, slotsRemaining };
}

function normalizeTeamPuzzle(raw: unknown): TeamPuzzle | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  if (!Array.isArray(record.slots)) return undefined;

  const slots: TeamSlot[] = record.slots.map((row, index) => {
    const slot = row as Record<string, unknown>;
    const backendKind = asString(slot.kind);
    const occupantLabel = asNullableString(slot.occupantLabel ?? slot.occupant_label);
    const occupantUserId = asNullableString(slot.occupantUserId ?? slot.occupant_user_id);
    const roleLabel = asString(slot.roleLabel ?? slot.role_label, '旅伴');

    let kind: TeamSlot['kind'] = 'open';
    if (backendKind === 'captain') kind = 'captain';
    else if (backendKind === 'filled' || Boolean(occupantLabel)) kind = 'filled';

    const label =
      kind === 'captain'
        ? occupantLabel
          ? `${roleLabel} · ${occupantLabel}`
          : roleLabel.startsWith('队长')
            ? roleLabel
            : `队长 · ${roleLabel}`
        : kind === 'filled'
          ? occupantLabel
            ? formatFilledPuzzleSlotLabel(occupantLabel, roleLabel)
            : peelPuzzleOpenSlotDecorations(roleLabel) || roleLabel
          : (() => {
              const openCore = peelPuzzleOpenSlotDecorations(roleLabel);
              return openCore ? `建议补位 · ${openCore}` : `虚位以待 · ${roleLabel}`;
            })();

    return {
      id: asString(slot.id ?? slot.slot_id, `slot-${index}`),
      kind,
      label,
      filledBy: occupantLabel,
      highlightForViewer: Boolean(slot.highlightForViewer ?? slot.highlight_for_viewer),
      slotIndex:
        typeof slot.slotIndex === 'number'
          ? slot.slotIndex
          : typeof slot.slot_index === 'number'
            ? slot.slot_index
            : index,
      roleLabel: roleLabel || undefined,
      occupantLabel: occupantLabel ?? undefined,
      occupantUserId: occupantUserId ?? undefined,
      aiRationale: asNullableString(slot.aiRationale ?? slot.ai_rationale) ?? undefined,
      deficitDimension:
        typeof slot.deficitDimension === 'string'
          ? (slot.deficitDimension as TeamSlot['deficitDimension'])
          : undefined,
      viewerMatchScore:
        typeof slot.viewerMatchScore === 'number' ? slot.viewerMatchScore : undefined,
    };
  });

  const viewerRaw = record.viewerPuzzleMatch ?? record.viewer_puzzle_match;
  let viewerPuzzleMatch: ViewerPuzzleMatch | null | undefined;
  if (viewerRaw && typeof viewerRaw === 'object') {
    const vm = viewerRaw as Record<string, unknown>;
    viewerPuzzleMatch = {
      isSoulPiece: vm.isSoulPiece === true,
      headline: asString(vm.headline, '你正是本队缺少的灵魂拼图'),
      matchedSlotIndex: typeof vm.matchedSlotIndex === 'number' ? vm.matchedSlotIndex : 0,
      matchedRoleLabel: asString(vm.matchedRoleLabel),
      aiRationale: asNullableString(vm.aiRationale),
    };
  }

  return {
    progressLabel: asString(record.progressLabel ?? record.progress_label, '车队拼图进度'),
    algorithm:
      record.algorithm === 'team_deficit_pomdp_v1' ? 'team_deficit_pomdp_v1' : undefined,
    slots,
    viewerPuzzleMatch,
  };
}

function normalizeRadarHint(raw: unknown): RadarHint | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const eligibleCount = readNumber(record.eligibleCount ?? record.eligible_count);
  if (eligibleCount == null) return undefined;
  return {
    eligibleCount,
    topPickDisplayName: asNullableString(
      record.topPickDisplayName ?? record.top_pick_display_name
    ),
  };
}

function normalizePlanningStyle(raw: unknown): PlanningStyle | null {
  if (raw === 'full_managed' || raw === 'co_planning' || raw === 'casual_play') return raw;
  return null;
}

function attachPlanningTeamwork(card: RecruitmentPostCard, record: Record<string, unknown>): void {
  const style =
    normalizePlanningStyle(record.planningStyle ?? record.planning_style ?? record.teamworkStyle) ??
    null;
  if (style) {
    card.planningStyle = style;
    card.teamworkStyle = style;
  }
  card.planningStyleLabel =
    asNullableString(record.planningStyleLabel ?? record.planning_style_label) ?? undefined;
  card.planningStyleDescription =
    asNullableString(record.planningStyleDescription ?? record.planning_style_description) ??
    undefined;
  const capsule = asNullableString(record.teamworkStyleCapsule ?? record.teamwork_style_capsule);
  card.teamworkStyleCapsule =
    capsule ?? (style ? PLANNING_STYLE_CAPSULES[style] : undefined) ?? undefined;
  if (record.teamworkMatchBlocked === true || record.teamwork_match_blocked === true) {
    card.teamworkMatchBlocked = true;
  }
  const blockReason = asNullableString(record.teamworkBlockReason ?? record.teamwork_block_reason);
  if (blockReason) card.teamworkBlockReason = blockReason;
}

export function normalizeMatchFlash(raw: unknown, post?: RecruitmentPostCard): MatchFlashPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const postId = asString(record.postId, post?.id ?? '');
  if (!postId) return null;

  const headline = asString(record.headline ?? record.verdictTitle);
  const aiVerdict = asString(record.aiVerdict ?? record.verdictBody);
  const bullets = Array.isArray(record.bullets)
    ? record.bullets.filter((x): x is string => typeof x === 'string')
    : undefined;

  return {
    postId,
    compatibilityPercent:
      typeof record.compatibilityPercent === 'number'
        ? record.compatibilityPercent
        : (post?.compatibilityPercent ?? 0),
    headline,
    aiVerdict,
    bullets,
    verdictTitle: headline || '算法发现：你与这个车队存在「宿命级同频」',
    verdictBody: aiVerdict,
    rarityTag: asNullableString(record.rarityTag) ?? undefined,
    ctaPrimary: asString(record.ctaPrimary, '⚡️ 闪速补位'),
    ctaSecondary: asString(record.ctaSecondary, '💬 勾搭一下'),
    ctaPrimaryAction: asNullableString(record.ctaPrimaryAction) ?? undefined,
    ctaSecondaryAction: asNullableString(record.ctaSecondaryAction) ?? undefined,
    theme:
      record.theme === 'shimmer_gradient' || record.theme === 'default'
        ? record.theme
        : 'shimmer_gradient',
    insertAfterIndex:
      typeof record.insertAfterIndex === 'number' ? record.insertAfterIndex : undefined,
  };
}

function normalizeFeedItem(raw: unknown): PlazaFeedItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const kind = record.kind === 'match_flash' ? 'match_flash' : 'post';

  if (kind === 'match_flash') {
    const post = normalizePostCard(record.post);
    const flash = normalizeMatchFlash(record.matchFlash ?? record.flash, post);
    if (!post.id || !flash) return null;
    return { kind: 'match_flash', post, flash };
  }

  const post = normalizePostCard(record.post ?? record);
  if (!post.id) return null;
  return { kind: 'post', post };
}

function attachTeamPuzzle(card: RecruitmentPostCard, record: Record<string, unknown>): void {
  const teamPuzzle = normalizeTeamPuzzle(record.teamPuzzle ?? record.team_puzzle);
  if (teamPuzzle) {
    card.teamPuzzle = teamPuzzle;
    card.teamSlots = teamPuzzle.slots;
  } else {
    const legacySlots = record.teamSlots ?? record.team_slots;
    if (Array.isArray(legacySlots)) {
      card.teamSlots = (legacySlots as TeamSlot[]).map((s, i) => ({
        id: s.id ?? `slot-${i}`,
        kind: s.kind === 'captain' ? 'captain' : s.kind === 'filled' ? 'filled' : 'open',
        label: s.label,
        filledBy: s.filledBy ?? null,
        highlightForViewer: Boolean(s.highlightForViewer),
      }));
    }
  }

  const radarHint = normalizeRadarHint(record.radarHint ?? record.radar_hint);
  if (radarHint) {
    card.radarHint = radarHint;
  }
}

function normalizeViewerApplicationStatus(record: Record<string, unknown>): ApplicationStatus | undefined {
  const direct = record.viewerApplicationStatus ?? record.applicationStatus ?? record.myApplicationStatus;
  if (typeof direct === 'string' && isApplicationStatus(direct)) return direct;

  const nested = record.viewerApplication ?? record.viewer_application ?? record.myApplication;
  if (nested && typeof nested === 'object') {
    const status = (nested as Record<string, unknown>).status;
    if (typeof status === 'string' && isApplicationStatus(status)) return status;
  }

  return undefined;
}

function normalizeMatchInsightDrawer(raw: unknown): MatchInsightDrawer | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const headline = asString(record.headline);
  if (!headline || !Array.isArray(record.lines)) return null;
  const lines = record.lines
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
    .map((row) => ({
      status:
        row.status === 'ok' || row.status === 'warn' || row.status === 'neutral'
          ? row.status
          : ('neutral' as const),
      label: asString(row.label),
      detail: asString(row.detail),
    }))
    .filter((l) => l.label);
  if (!lines.length) return null;
  return { headline, lines };
}

function normalizeStructuralMatch(raw: unknown): StructuralMatchSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.baseScore !== 'number') return null;
  return {
    baseScore: record.baseScore,
    teamworkFitPoints:
      typeof record.teamworkFitPoints === 'number' ? record.teamworkFitPoints : 0,
    stressFitPoints: typeof record.stressFitPoints === 'number' ? record.stressFitPoints : 0,
    mbtiSynergyPoints:
      typeof record.mbtiSynergyPoints === 'number' ? record.mbtiSynergyPoints : 0,
    algorithm: asString(record.algorithm, 'graph_cluster_csp_v1'),
  };
}

function normalizeVibeLlmBlock(raw: unknown): VibeLlmCardBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const chipsRaw = record.chips ?? record.vibe_chips;
  const visionText = asNullableString(record.visionText ?? record.vision_text);
  const contractHint = asNullableString(record.contractHint ?? record.contract_hint);

  const behavioralRaw = record.behavioralContracts ?? record.behavioral_contracts;
  const behavioralContracts = Array.isArray(behavioralRaw)
    ? behavioralRaw
        .filter((b): b is Record<string, unknown> => Boolean(b && typeof b === 'object'))
        .map((b) => ({
          title: asString(b.title ?? b.tag),
          clauses: Array.isArray(b.clauses)
            ? b.clauses.filter((x): x is string => typeof x === 'string')
            : typeof b.clause === 'string'
              ? [b.clause]
              : [],
        }))
        .filter((b) => b.title && b.clauses.length)
    : undefined;

  if (
    !Array.isArray(chipsRaw) &&
    !visionText &&
    !contractHint &&
    !behavioralContracts?.length
  ) {
    return null;
  }

  const chips = Array.isArray(chipsRaw)
    ? chipsRaw
        .map((c, i) => {
          if (typeof c === 'string') return { id: `chip_${i}`, label: c };
          const row = c as Record<string, unknown>;
          return { id: asString(row.id, `chip_${i}`), label: asString(row.label) };
        })
        .filter((c) => c.label)
    : [];

  return {
    chips,
    visionText,
    contractHint,
    teamworkContractModel: asNullableString(
      record.teamworkContractModel ?? record.teamwork_contract_model
    ),
    teamworkContractModelLabel: asNullableString(
      record.teamworkContractModelLabel ?? record.teamwork_contract_model_label
    ),
    hardGatesSummary: Array.isArray(record.hardGatesSummary)
      ? record.hardGatesSummary.filter((x): x is string => typeof x === 'string')
      : Array.isArray(record.hard_gates_summary)
        ? record.hard_gates_summary.filter((x): x is string => typeof x === 'string')
        : undefined,
    behavioralContracts,
    parseSource:
      record.parseSource === 'llm' || record.parse_source === 'llm' ? 'llm' : 'rules',
  };
}

function normalizeTeamworkCommitmentPrompt(raw: unknown): ApplyPreview['teamworkCommitmentPrompt'] {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const message = asString(record.message);
  if (!message) return null;
  const styleRaw = record.teamworkStyle ?? record.teamwork_style;
  const teamworkStyle =
    styleRaw === 'full_managed' || styleRaw === 'co_planning' || styleRaw === 'casual_play'
      ? styleRaw
      : 'casual_play';
  return {
    required: true,
    dimension: 'teamwork_style',
    teamworkStyle,
    message,
  };
}

function normalizePhysicalFitnessReport(raw: unknown): PhysicalFitnessReport | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const lines = Array.isArray(record.lines)
    ? record.lines.filter((x): x is string => typeof x === 'string')
    : undefined;
  return {
    fitPercent: typeof record.fitPercent === 'number' ? record.fitPercent : null,
    evidenceLabel: asNullableString(record.evidenceLabel ?? record.evidence_label),
    lines,
  };
}

function normalizePhysicalFitnessGate(raw: unknown): PhysicalFitnessGate | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const reportRaw = record.report ?? record.fitnessReport ?? record.fitness_report;
  return {
    blocked: record.blocked === true,
    blockReason: asNullableString(record.blockReason ?? record.block_reason),
    report: reportRaw ? normalizePhysicalFitnessReport(reportRaw) : null,
  };
}

function normalizePhysicalSurvivalQuiz(raw: unknown): PhysicalSurvivalQuizQuestion[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
    .map((row) => {
      const optionsRaw = row.options;
      const options = Array.isArray(optionsRaw)
        ? optionsRaw
            .filter((opt): opt is Record<string, unknown> => Boolean(opt && typeof opt === 'object'))
            .map((opt) => ({
              value: asString(opt.value ?? opt.id),
              label: asString(opt.label ?? opt.text),
            }))
            .filter((opt) => opt.value && opt.label)
        : [];
      return {
        id: asString(row.id ?? row.questionId ?? row.question_id),
        prompt: asString(row.prompt ?? row.question ?? row.text),
        options,
      };
    })
    .filter((q) => q.id && q.prompt && q.options.length > 0);
}

/** GET /posts/:id/apply-preview */
export function normalizeApplyPreview(raw: unknown): ApplyPreview {
  if (!raw || typeof raw !== 'object') {
    return { canApply: false, blockReason: '无法加载申请预览' };
  }

  const record = raw as Record<string, unknown>;
  const nested = record.existingApplication ?? record.viewerApplication;
  const nestedStatus =
    nested && typeof nested === 'object'
      ? (nested as Record<string, unknown>).status
      : undefined;
  const directStatus = record.existingApplicationStatus ?? record.applicationStatus ?? nestedStatus;
  const existingApplicationStatus =
    typeof directStatus === 'string' && isApplicationStatus(directStatus) ? directStatus : undefined;

  const blockedByExisting =
    existingApplicationStatus === 'pending' || existingApplicationStatus === 'approved';

  const teamworkBlocked = record.teamworkMatchBlocked === true || record.canApply === false;
  const physicalFitnessGate = normalizePhysicalFitnessGate(
    record.physicalFitnessGate ?? record.physical_fitness_gate
  );
  const physicalBlocked = physicalFitnessGate?.blocked === true;

  return {
    canApply:
      record.canApply !== false && !blockedByExisting && !teamworkBlocked && !physicalBlocked,
    blockReason:
      asNullableString(
        physicalBlocked
          ? physicalFitnessGate?.blockReason ?? record.blockReason ?? record.teamworkBlockReason
          : record.blockReason ?? record.teamworkBlockReason
      ) ?? undefined,
    physicalFitnessGate,
    physicalSurvivalQuiz: normalizePhysicalSurvivalQuiz(
      record.physicalSurvivalQuiz ?? record.physical_survival_quiz
    ),
    existingApplicationStatus,
    conflictPrompt:
      record.conflictPrompt && typeof record.conflictPrompt === 'object'
        ? (record.conflictPrompt as ApplyPreview['conflictPrompt'])
        : record.conflict_prompt && typeof record.conflict_prompt === 'object'
          ? (record.conflict_prompt as ApplyPreview['conflictPrompt'])
          : null,
    teamworkCommitmentPrompt: normalizeTeamworkCommitmentPrompt(
      record.teamworkCommitmentPrompt ?? record.teamwork_commitment_prompt
    ),
    compatibilityPercent:
      readNumber(record.compatibilityPercent ?? record.compatibility_percent) ?? undefined,
    highlights: Array.isArray(record.highlights)
      ? record.highlights.filter((x): x is string => typeof x === 'string')
      : undefined,
    warnings: Array.isArray(record.warnings)
      ? record.warnings.filter((x): x is string => typeof x === 'string')
      : undefined,
    vibeBehavioralContracts: normalizeVibeBehavioralContracts(
      record.vibeBehavioralContracts ?? record.vibe_behavioral_contracts ?? record.vibeBehaviorContracts
    ),
  };
}

function normalizeVibeBehavioralContracts(
  raw: unknown
): ApplyPreview['vibeBehavioralContracts'] {
  if (!Array.isArray(raw)) return undefined;
  const legacy = raw.every(
    (row) => row && typeof row === 'object' && 'tag' in row && 'clause' in row
  );
  if (legacy) {
    return raw
      .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
      .map((row) => ({
        title: asString(row.tag),
        clauses: [asString(row.clause)].filter(Boolean),
      }))
      .filter((c) => c.title && c.clauses.length);
  }
  return raw
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
    .map((row) => ({
      title: asString(row.title),
      clauses: Array.isArray(row.clauses)
        ? row.clauses.filter((x): x is string => typeof x === 'string')
        : [],
    }))
    .filter((c) => c.title && c.clauses.length);
}

/** 单条招募帖 — 兼容列表项与详情嵌套 post */
export function normalizePostCard(raw: unknown): RecruitmentPostCard {
  if (!raw || typeof raw !== 'object') {
    return {
      id: '',
      status: 'active',
      captainUserId: '',
      captainDisplayName: null,
      captainCardTitle: '',
      captainMbtiType: '',
      captainInteractionMode: '',
      captainInteractionModeLabel: '',
      captainReputationStars: null,
      compatibilityPercent: null,
      destination: '',
      departureLabel: null,
      startDate: '',
      endDate: '',
      teamStatus: { slotsFilled: 0, slotsNeeded: 1, slotsRemaining: 1 },
      captainMessage: null,
      itinerarySummary: '',
      budgetRange: null,
      tripMoodTag: null,
      travelMode: null,
      vehicleInfo: null,
      preferences: null,
      publishedAt: null,
    };
  }

  const record = raw as Record<string, unknown>;

  const card: RecruitmentPostCard & { isCaptain?: boolean } = {
    id: asString(record.id),
    status: (asString(record.status, 'active') as RecruitmentPostStatus) || 'active',
    captainUserId: asString(record.captainUserId ?? record.captain_user_id),
    captainDisplayName: asNullableString(record.captainDisplayName ?? record.captain_display_name),
    captainCardTitle: asString(record.captainCardTitle ?? record.captain_card_title),
    captainMbtiType: asString(record.captainMbtiType ?? record.captain_mbti_type),
    captainInteractionMode: asString(
      record.captainInteractionMode ?? record.captain_interaction_mode
    ),
    captainInteractionModeLabel: asString(
      record.captainInteractionModeLabel ?? record.captain_interaction_mode_label
    ),
    captainReputationStars: readNullableNumber(
      record,
      'captainReputationStars',
      'captain_reputation_stars'
    ),
    compatibilityPercent: readNullableNumber(record, 'compatibilityPercent', 'compatibility_percent'),
    destination: asString(record.destination),
    recruitmentVision: asNullableString(
      record.recruitmentVision ?? record.recruitment_vision ?? record.vibeFreeText ?? record.vibe_free_text
    ),
    title: asNullableString(record.title ?? record.postTitle ?? record.post_title),
    departureLabel: asNullableString(record.departureLabel ?? record.departure_label),
    startDate: asString(record.startDate ?? record.start_date),
    endDate: asString(record.endDate ?? record.end_date),
    teamStatus: normalizeTeamStatus(record),
    captainMessage: asNullableString(record.captainMessage ?? record.captain_message),
    itinerarySummary: asString(
      record.itineraryDetail ??
        record.fullItinerarySummary ??
        record.itinerarySummary ??
        record.itinerary_summary
    ),
    budgetRange: normalizeBudgetRange(record),
    tripMoodTag: readTripMoodTag(record.tripMoodTag ?? record.trip_mood_tag),
    travelMode: readTravelMode(record.travelMode ?? record.travel_mode),
    vehicleInfo: asNullableString(record.vehicleInfo ?? record.vehicle_info),
    preferences: asNullableString(
      record.preferences ?? record.preferenceNotes ?? record.preference_notes
    ),
    publishedAt: asNullableString(record.publishedAt ?? record.published_at),
  };

  if (record.isCaptain === true || record.is_captain === true) {
    card.isCaptain = true;
  } else if (record.isCaptain === false || record.is_captain === false) {
    card.isCaptain = false;
  }

  const highlights = record.matchHighlights ?? record.highlights;
  if (Array.isArray(highlights)) {
    card.matchHighlights = highlights.filter((x): x is string => typeof x === 'string');
  }
  const warnings = record.matchWarnings ?? record.warnings;
  if (Array.isArray(warnings)) {
    card.matchWarnings = warnings.filter((x): x is string => typeof x === 'string');
  }
  const breakdown = record.matchBreakdown ?? record.match_breakdown;
  if (breakdown && typeof breakdown === 'object') {
    card.matchBreakdown = breakdown as RecruitmentPostCard['matchBreakdown'];
  }

  const insightDrawer = normalizeMatchInsightDrawer(
    record.matchInsightDrawer ?? record.match_insight_drawer
  );
  if (insightDrawer) card.matchInsightDrawer = insightDrawer;

  const structural = normalizeStructuralMatch(record.structuralMatch ?? record.structural_match);
  if (structural) card.structuralMatch = structural;

  const vibeLlm = normalizeVibeLlmBlock(record.vibeLlm ?? record.vibe_llm);
  if (vibeLlm) card.vibeLlm = vibeLlm;

  attachTeamPuzzle(card, record);
  attachPlanningTeamwork(card, record);

  const credRaw =
    record.verifiedCredentials ??
    record.verified_credentials ??
    record.captainVerifiedCredentials ??
    record.captain_verified_credentials;
  const credentials = normalizeVerifiedCredentials(credRaw, {
    captainDisplayName: asNullableString(record.captainDisplayName ?? record.captain_display_name),
    captainReputationStars:
      typeof record.captainReputationStars === 'number' ? record.captainReputationStars : null,
    teamworkStyleCapsule: asNullableString(
      record.teamworkStyleCapsule ?? record.teamwork_style_capsule
    ),
    planningStyleLabel: asNullableString(record.planningStyleLabel ?? record.planning_style_label),
  });
  if (credentials) {
    card.verifiedCredentials = credentials;
    card.captainVerifiedCredentials = credentials;
    if (!card.captainDisplayName) {
      card.captainDisplayName =
        credentials.dossier?.displayName ??
        credentials.headline.identityHeadline.split(' · ')[0] ??
        null;
    }
  }

  if (record.recommendationHidden === true || record.recommendation_hidden === true) {
    card.recommendationHidden = true;
  }
  const hiddenReason = asNullableString(
    record.recommendationHiddenReason ?? record.recommendation_hidden_reason
  );
  if (hiddenReason) card.recommendationHiddenReason = hiddenReason;

  const viewerApplicationStatus = normalizeViewerApplicationStatus(record);
  if (viewerApplicationStatus) {
    card.viewerApplicationStatus = viewerApplicationStatus;
  }

  const routeDirectionIdRaw = record.routeDirectionId ?? record.route_direction_id;
  if (typeof routeDirectionIdRaw === 'number' && Number.isFinite(routeDirectionIdRaw)) {
    card.routeDirectionId = routeDirectionIdRaw;
  }
  const routeDirectionName = asNullableString(
    record.routeDirectionName ?? record.route_direction_name
  );
  if (routeDirectionName) card.routeDirectionName = routeDirectionName;

  const activityProfileRaw = asNullableString(record.activityProfile ?? record.activity_profile);
  if (
    activityProfileRaw === 'heavy_pack' ||
    activityProfileRaw === 'light_trek' ||
    activityProfileRaw === 'speed_ascent'
  ) {
    card.activityProfile = activityProfileRaw;
  }

  const trekkingRaw =
    record.trekkingOrchestration ??
    record.trekking_orchestration ??
    (record.captainPersonaSnapshot as Record<string, unknown> | undefined)?._trekkingOrchestration;
  let trekkingOrchestration = normalizeTrekkingOrchestration(trekkingRaw);
  if (!trekkingOrchestration && card.recruitmentVision) {
    trekkingOrchestration = buildTrekkingOrchestrationPlan({
      visionText: card.recruitmentVision,
      vibeChips: card.vibeLlm?.chips,
      activityProfile: card.activityProfile,
      routeDirectionId: card.routeDirectionId,
      routeDirectionName: card.routeDirectionName,
    });
  }
  if (trekkingOrchestration) {
    card.trekkingOrchestration = trekkingOrchestration;
  }

  const routeTemplateCatalogId = asNullableString(
    record.routeTemplateCatalogId ?? record.route_template_catalog_id
  );
  if (routeTemplateCatalogId) card.routeTemplateCatalogId = routeTemplateCatalogId;

  const routeTemplateIdRaw = record.routeTemplateId ?? record.route_template_id;
  if (typeof routeTemplateIdRaw === 'number' && Number.isFinite(routeTemplateIdRaw)) {
    card.routeTemplateId = routeTemplateIdRaw;
  }

  const bindingRaw = record.routeTemplateBinding ?? record.route_template_binding;
  if (bindingRaw && typeof bindingRaw === 'object') {
    const b = bindingRaw as Record<string, unknown>;
    const catalogId = asNullableString(b.catalogId ?? b.catalog_id);
    const rtId = b.routeTemplateId ?? b.route_template_id;
    if (catalogId) {
      card.routeTemplateBinding = {
        catalogId,
        routeTemplateId: typeof rtId === 'number' ? rtId : Number(rtId) || 0,
        titleZh: asString(b.titleZh ?? b.title_zh, catalogId),
      };
    }
  } else if (routeTemplateCatalogId && card.routeTemplateId) {
    card.routeTemplateBinding = {
      catalogId: routeTemplateCatalogId,
      routeTemplateId: card.routeTemplateId,
      titleZh: routeTemplateCatalogId,
    };
  }

  const vibeParseRaw = record.vibeParse ?? record.vibe_parse;
  if (vibeParseRaw && typeof vibeParseRaw === 'object') {
    card.vibeParse = vibeParseRaw as RecruitmentPostCard['vibeParse'];
  }

  const trekSpawnRaw = record.trekSpawnState ?? record.trek_spawn_state;
  if (trekSpawnRaw && typeof trekSpawnRaw === 'object') {
    const ts = trekSpawnRaw as Record<string, unknown>;
    card.trekSpawnState = {
      spawnedAt: asNullableString(ts.spawnedAt ?? ts.spawned_at),
      hikePlanId: asNullableString(ts.hikePlanId ?? ts.hike_plan_id),
      tripId: asNullableString(ts.tripId ?? ts.trip_id),
      routeDirectionId:
        typeof ts.routeDirectionId === 'number'
          ? ts.routeDirectionId
          : typeof ts.route_direction_id === 'number'
            ? ts.route_direction_id
            : null,
      routeDirectionKey: asNullableString(ts.routeDirectionKey ?? ts.route_direction_key),
    };
  }

  const tripInstRaw =
    record.tripInstantiationResult ??
    record.trip_instantiation_result ??
    (record.captainPersonaSnapshot as Record<string, unknown> | undefined)?._tripInstantiationResult;
  if (tripInstRaw && typeof tripInstRaw === 'object') {
    const normalized = normalizeInstantiateTripResult(tripInstRaw);
    if (normalized.tripId) {
      card.tripInstantiationResult = normalized;
    }
  }

  const sovereignRaw =
    record.sovereignLock ??
    record.sovereign_lock ??
    (record.captainPersonaSnapshot as Record<string, unknown> | undefined)?._sovereignForceLock_v1;
  if (sovereignRaw) {
    const sovereignLock = normalizeSovereignForceLockRecord(sovereignRaw);
    if (sovereignLock) card.sovereignLock = sovereignLock;
  }

  const outcome = normalizeRecruitingOutcome(record.outcome);
  if (outcome) card.outcome = outcome;

  syncRecruitmentVisionFields(card);
  reconcileVibeBudgetCoherence(card);

  return card;
}

function syncRecruitmentVisionFields(card: RecruitmentPostCard): void {
  if (card.recruitmentVision && card.vibeLlm && !card.vibeLlm.visionText) {
    card.vibeLlm = { ...card.vibeLlm, visionText: card.recruitmentVision };
  } else if (!card.recruitmentVision && card.vibeLlm?.visionText) {
    card.recruitmentVision = card.vibeLlm.visionText;
  }
}

function reconcileVibeBudgetCoherence(card: RecruitmentPostCard): void {
  if (card.recruitmentVision) {
    card.recruitmentVision = sanitizeVibeBudgetCopy(card.recruitmentVision, card);
  }
  if (!card.vibeLlm) return;
  if (card.vibeLlm.visionText) {
    card.vibeLlm.visionText = sanitizeVibeBudgetCopy(card.vibeLlm.visionText, card);
  }
  const hint = card.vibeLlm.contractHint;
  if (hint) {
    card.vibeLlm.contractHint = sanitizeVibeBudgetCopy(hint, card);
  }
  if (card.vibeLlm.hardGatesSummary?.length) {
    card.vibeLlm.hardGatesSummary = card.vibeLlm.hardGatesSummary.map((line) =>
      sanitizeVibeBudgetCopy(line, card)
    );
  }
}

/** GET /posts/:id — 后端可能返回 { post, access } 或 { id, post } */
export function normalizePostDetail(data: unknown): RecruitmentPostCard {
  if (!data || typeof data !== 'object') {
    return normalizePostCard(null);
  }
  const record = data as Record<string, unknown>;
  if (record.post && typeof record.post === 'object') {
    const post = normalizePostCard(record.post);
    const wrapperId = asString(record.id ?? record.postId ?? record.post_id, '');
    if (!post.id && wrapperId) {
      return { ...post, id: wrapperId };
    }
    return post;
  }
  const direct = normalizePostCard(record);
  if (!direct.id && typeof record.id === 'string') {
    return normalizePostCard({ ...record, id: record.id });
  }
  return direct;
}

/** 后端 list 接口可能返回 items / posts + feedItems + pagination */
export function normalizePostListResponse(data: unknown): PostListResponse {
  if (Array.isArray(data)) {
    const items = data.map((row) => normalizePostCard(row));
    return {
      items,
      total: items.length,
      feedItems: items.map((post) => ({ kind: 'post', post })),
    };
  }
  if (!data || typeof data !== 'object') {
    return { items: [], total: 0, feedItems: [] };
  }

  const record = data as Record<string, unknown>;

  let items: RecruitmentPostCard[] = [];
  if (Array.isArray(record.items)) {
    items = record.items.map((row) => normalizePostCard(row));
  } else if (Array.isArray(record.posts)) {
    items = record.posts.map((row) => normalizePostCard(row));
  }

  const total =
    typeof record.total === 'number'
      ? record.total
      : typeof (record.pagination as { total?: number } | undefined)?.total === 'number'
        ? (record.pagination as { total: number }).total
        : items.length;

  let feedItems: PlazaFeedItem[] | undefined;
  if (Array.isArray(record.feedItems)) {
    feedItems = record.feedItems
      .map((row) => normalizeFeedItem(row))
      .filter((row): row is PlazaFeedItem => row != null);
  }

  if (!items.length && feedItems?.length) {
    items = feedItems
      .filter((row): row is Extract<PlazaFeedItem, { kind: 'post' }> => row.kind === 'post')
      .map((row) => row.post)
      .filter((post) => Boolean(post.id));
  }

  if (!feedItems?.length && items.length) {
    feedItems = items.map((post) => ({ kind: 'post', post }));
  }

  const matchFlash =
    normalizeMatchFlash(record.matchFlash) ??
    feedItems?.find((item): item is Extract<PlazaFeedItem, { kind: 'match_flash' }> => item.kind === 'match_flash')
      ?.flash ??
    null;

  return { items, total, feedItems, matchFlash };
}

/** GET /my/posts — 队长视角帖列表，剔除无意义的「自匹配契合度」 */
export function normalizeMyPostListResponse(data: unknown): PostListResponse {
  const list = normalizePostListResponse(data);
  const items = list.items.map((post) => stripCaptainSelfMatchInsights(post, { force: true }));
  return {
    ...list,
    items,
    feedItems: list.feedItems?.map((entry) =>
      entry.kind === 'post' ? { kind: 'post' as const, post: items.find((p) => p.id === entry.post.id) ?? entry.post } : entry
    ),
  };
}

export function defaultTeamStatus(post: RecruitmentPostCard): TeamStatus {
  return (
    post.teamStatus ?? {
      slotsFilled: 0,
      slotsNeeded: 0,
      slotsRemaining: 0,
    }
  );
}

/** GET/POST /my/travel-intent — 兼容 intent 嵌套与 status/isActive 字段 */
function readTravelIntentRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const record = raw as Record<string, unknown>;
  if (record.intent && typeof record.intent === 'object') {
    return record.intent as Record<string, unknown>;
  }
  if (record.travelIntent && typeof record.travelIntent === 'object') {
    return record.travelIntent as Record<string, unknown>;
  }
  return record;
}

function normalizeTravelIntentActive(raw: Record<string, unknown>): boolean {
  const candidates = [raw];
  if (raw.intent && typeof raw.intent === 'object') {
    candidates.push(raw.intent as Record<string, unknown>);
  }

  for (const record of candidates) {
    if (record.active === true || record.active === 1 || record.active === 'true') return true;
    if (record.isActive === true || record.isActive === 1 || record.isActive === 'true') {
      return true;
    }
    const status = asNullableString(
      record.status ?? record.broadcastStatus ?? record.intentStatus
    );
    if (status === 'active' || status === 'broadcasting' || status === 'on') return true;
  }

  return false;
}

export function normalizeTravelIntent(raw: unknown): TravelIntentStatus {
  if (!raw || typeof raw !== 'object') {
    return { active: false, updatedAt: null };
  }

  const wrapper = raw as Record<string, unknown>;
  const record = readTravelIntentRecord(raw);
  const startDate = asNullableString(record.startDate) ?? undefined;
  const endDate = asNullableString(record.endDate) ?? undefined;
  const destinationScope =
    asNullableString(
      record.destinationScope ?? record.destination_scope ?? record.destination ?? record.destinationHint
    ) ?? undefined;
  const dateRangeLabel =
    asNullableString(record.dateRangeLabel) ??
    (startDate && endDate ? formatDateRangeLabel(startDate, endDate) : undefined) ??
    undefined;

  return {
    active: normalizeTravelIntentActive(wrapper) || normalizeTravelIntentActive(record),
    destinationScope,
    destinationHint: destinationScope,
    startDate,
    endDate,
    dateRangeLabel: dateRangeLabel ?? undefined,
    budgetFlex:
      record.budgetFlex === 'flexible' ||
      record.budgetFlex === 'moderate' ||
      record.budgetFlex === 'strict'
        ? record.budgetFlex
        : record.budgetFlexibility === 'flexible' ||
            record.budgetFlexibility === 'moderate' ||
            record.budgetFlexibility === 'strict'
          ? record.budgetFlexibility
          : undefined,
    budgetFlexibility:
      record.budgetFlex === 'flexible' ||
      record.budgetFlex === 'moderate' ||
      record.budgetFlex === 'strict'
        ? record.budgetFlex
        : record.budgetFlexibility === 'flexible' ||
            record.budgetFlexibility === 'moderate' ||
            record.budgetFlexibility === 'strict'
          ? record.budgetFlexibility
          : undefined,
    openToCarpool:
      record.openToCarpool === true || record.open_to_carpool === true ? true : undefined,
    note: asNullableString(record.note) ?? undefined,
    updatedAt: asNullableString(record.updatedAt ?? record.updated_at),
  };
}

function normalizeRadarCandidate(raw: unknown): CaptainRadarCandidate | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const userId = asString(record.userId ?? record.user_id);
  if (!userId) return null;
  const highlights = record.highlights;
  return {
    userId,
    displayName: asString(record.displayName ?? record.display_name, '旅伴'),
    cardTitle: asString(record.cardTitle ?? record.card_title, '旅行者'),
    compatibilityPercent:
      typeof record.compatibilityPercent === 'number'
        ? record.compatibilityPercent
        : typeof record.compatibility_percent === 'number'
          ? record.compatibility_percent
          : 0,
    departureLabel: asNullableString(record.departureLabel ?? record.departure_label),
    highlights: Array.isArray(highlights)
      ? highlights.filter((x): x is string => typeof x === 'string')
      : [],
    skills: Array.isArray(record.skills)
      ? record.skills.filter((x): x is string => typeof x === 'string')
      : undefined,
    oliveBranchSent: Boolean(record.oliveBranchSent ?? record.olive_branch_sent),
  };
}

/** GET /posts/:id/radar */
export function normalizeCaptainRadar(raw: unknown, postId?: string): CaptainRadarResponse {
  if (!raw || typeof raw !== 'object') {
    return { postId: postId ?? '', candidates: [], total: 0 };
  }
  const record = raw as Record<string, unknown>;
  const picksRaw = record.picks ?? record.candidates;
  const picks = Array.isArray(picksRaw)
    ? picksRaw.map(normalizeRadarCandidate).filter((x): x is CaptainRadarCandidate => x != null)
    : [];

  return {
    postId: asString(record.postId ?? record.post_id, postId ?? ''),
    candidates: picks,
    picks,
    total:
      typeof record.total === 'number'
        ? record.total
        : typeof record.eligibleCount === 'number'
          ? record.eligibleCount
          : picks.length,
    systemHint: asNullableString(record.systemHint ?? record.system_hint),
  };
}

/** 单条入队申请 */
export function normalizeApplicationCard(raw: unknown): RecruitmentApplicationCard {
  if (!raw || typeof raw !== 'object') {
    return {
      id: '',
      postId: '',
      status: 'pending',
      applicantUserId: '',
      applicantDisplayName: '',
      applicantCardTitle: '',
      applicantMbtiType: '',
      applicantInteractionMode: '',
      applicantInteractionModeLabel: '',
      applicantReputationStars: null,
      compatibilityPercent: 0,
      highlights: [],
      warnings: [],
      message: '',
      planningCommitmentAccepted: false,
      teamworkCommitmentAccepted: false,
      createdAt: '',
      decidedAt: null,
    };
  }

  const record = raw as Record<string, unknown>;
  const applicant = record.applicant as Record<string, unknown> | undefined;
  const personaSnapshotRaw =
    record.applicantPersonaSnapshot ?? record.applicant_persona_snapshot;
  const personaSnapshot =
    personaSnapshotRaw && typeof personaSnapshotRaw === 'object'
      ? (personaSnapshotRaw as Record<string, unknown>)
      : undefined;
  const profileCard =
    personaSnapshot?.profile && typeof personaSnapshot.profile === 'object'
      ? (personaSnapshot.profile as Record<string, unknown>).card
      : undefined;
  const profileCardTitle =
    profileCard && typeof profileCard === 'object'
      ? readStringFromRecord(profileCard as Record<string, unknown>, 'title')
      : null;
  const highlights = record.matchHighlights ?? record.highlights;
  const warnings = record.matchWarnings ?? record.warnings;
  const applicantReputationStars =
    typeof record.applicantReputationStars === 'number'
      ? record.applicantReputationStars
      : typeof record.applicant_reputation_stars === 'number'
        ? record.applicant_reputation_stars
        : typeof applicant?.reputationStars === 'number'
          ? applicant.reputationStars
          : null;

  const rawApplicantDisplayName = asString(
    record.applicantDisplayName ??
      record.applicant_display_name ??
      record.displayName ??
      applicant?.displayName,
    '旅伴'
  );
  const applicantVerifiedCredentials = normalizeVerifiedCredentials(
    record.applicantVerifiedCredentials ??
      record.applicant_verified_credentials ??
      applicant?.verifiedCredentials ??
      applicant?.verified_credentials,
    { captainReputationStars: applicantReputationStars }
  );

  return {
    id: asString(record.id),
    postId: asString(record.postId ?? record.post_id),
    status: normalizeApplicationStatus(record.status),
    applicantUserId: asString(record.applicantUserId ?? record.applicant_user_id ?? applicant?.userId),
    applicantDisplayName: resolveApplicantRealName(
      { applicantDisplayName: rawApplicantDisplayName, applicantVerifiedCredentials },
      applicantVerifiedCredentials
    ),
    applicantCardTitle: resolveApplicantCardTitle(
      {
        applicantCardTitle: asString(
          record.applicantCardTitle ??
            record.applicant_card_title ??
            personaSnapshot?.cardTitle ??
            personaSnapshot?.card_title ??
            profileCardTitle ??
            applicant?.cardTitle,
          '旅行者'
        ),
        applicantInteractionModeLabel: asString(
          record.applicantInteractionModeLabel ??
            record.applicant_interaction_mode_label ??
            personaSnapshot?.interactionModeLabel ??
            personaSnapshot?.interaction_mode_label ??
            applicant?.interactionModeLabel
        ),
        applicantVerifiedCredentials,
      },
      applicantVerifiedCredentials,
      profileCardTitle
    ),
    applicantMbtiType: asString(
      record.applicantMbtiType ?? record.applicant_mbti_type ?? applicant?.mbtiType
    ),
    applicantInteractionMode: asString(
      record.applicantInteractionMode ?? record.applicant_interaction_mode ?? applicant?.interactionMode
    ),
    applicantInteractionModeLabel: asString(
      record.applicantInteractionModeLabel ??
        record.applicant_interaction_mode_label ??
        personaSnapshot?.interactionModeLabel ??
        personaSnapshot?.interaction_mode_label ??
        applicant?.interactionModeLabel
    ),
    applicantReputationStars,
    applicantVerifiedCredentials,
    safetyWarning: asNullableString(record.safetyWarning ?? record.safety_warning),
    compatibilityPercent: (() => {
      const structural = record.structuralMatch ?? record.structural_match;
      const fromStructural =
        structural && typeof structural === 'object'
          ? (structural as Record<string, unknown>).baseScore ??
            (structural as Record<string, unknown>).base_score ??
            (structural as Record<string, unknown>).score
          : undefined;
      return normalizeCompatibilityPercent(
        record.compatibilityPercent ??
          record.compatibility_percent ??
          record.matchScore ??
          record.match_score ??
          fromStructural
      );
    })(),
    highlights: Array.isArray(highlights)
      ? highlights.filter((x): x is string => typeof x === 'string')
      : [],
    warnings: Array.isArray(warnings)
      ? warnings.filter((x): x is string => typeof x === 'string')
      : [],
    message: asString(record.message ?? record.applicationMessage),
    planningCommitmentAccepted: Boolean(
      record.planningCommitmentAccepted ?? record.planning_commitment_accepted
    ),
    teamworkCommitmentAccepted: Boolean(
      record.teamworkCommitmentAccepted ?? record.teamwork_commitment_accepted
    ),
    createdAt: asString(record.createdAt ?? record.created_at),
    decidedAt: asNullableString(record.decidedAt ?? record.decided_at),
    targetSlotIndex:
      typeof record.targetSlotIndex === 'number'
        ? record.targetSlotIndex
        : typeof record.target_slot_index === 'number'
          ? record.target_slot_index
          : null,
    targetSlotId:
      asNullableString(record.targetSlotId ?? record.target_slot_id) ?? undefined,
    targetSlotLabel:
      asNullableString(record.targetSlotLabel ?? record.target_slot_label ?? record.slotIntentLabel) ??
      undefined,
    decisionBrief: normalizePreMatchDecisionBrief(record.decisionBrief ?? record.decision_brief),
    physicalFitnessReport: (() => {
      const briefRaw = record.decisionBrief ?? record.decision_brief;
      const fromBrief =
        briefRaw && typeof briefRaw === 'object'
          ? (briefRaw as Record<string, unknown>).physicalFitnessReport ??
            (briefRaw as Record<string, unknown>).physical_fitness_report
          : null;
      return normalizePhysicalFitnessReport(
        record.physicalFitnessReport ?? record.physical_fitness_report ?? fromBrief
      );
    })(),
    attribution: normalizeRecruitingAttribution(record.attribution),
  };
}

/** PATCH .../applications/:id — approve 响应含 teamPuzzle（§8） */
export function normalizeReviewApplicationResponse(raw: unknown): ReviewApplicationResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid review application response');
  }
  const record = raw as Record<string, unknown>;
  const applicationRaw = record.application ?? record.data ?? raw;
  const teamPuzzleRaw = record.teamPuzzle ?? record.team_puzzle;
  return {
    application: normalizeApplicationCard(applicationRaw),
    teamPuzzle: teamPuzzleRaw ? normalizeTeamPuzzle(teamPuzzleRaw) ?? null : undefined,
  };
}

/** GET /posts/:id/applications · GET /my/applications */
export function normalizeApplicationsList(data: unknown): RecruitmentApplicationCard[] {
  if (Array.isArray(data)) {
    return data.map(normalizeApplicationCard).filter((item) => Boolean(item.id));
  }
  if (!data || typeof data !== 'object') return [];

  const record = data as Record<string, unknown>;
  const list =
    record.items ??
    record.applications ??
    record.pendingApplications ??
    record.pending_applications;

  if (Array.isArray(list)) {
    return list.map(normalizeApplicationCard).filter((item) => Boolean(item.id));
  }

  return [];
}

/** GET /users/:userId/credentials → 内部 VerifiedCredentials */
export function normalizeUserCredentialsResponse(raw: unknown): {
  userId: string;
  cardTitle: string;
  mbtiType: string;
  credentials: ReturnType<typeof normalizeVerifiedCredentials>;
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const userId = asString(record.userId ?? record.user_id);
  if (!userId) return null;

  const credRaw =
    record.verifiedCredentials ?? record.verified_credentials ?? record.credentials;
  const reputationStars =
    typeof record.reputationStars === 'number'
      ? record.reputationStars
      : typeof record.reputation_stars === 'number'
        ? record.reputation_stars
        : null;

  const credentials = normalizeVerifiedCredentials(credRaw, {
    captainDisplayName: readStringFromRecord(record, 'displayName', 'display_name') ?? undefined,
    captainReputationStars: reputationStars,
  });

  const enrichedCredentials =
    credentials && reputationStars != null
      ? {
          ...credentials,
          dossier: credentials.dossier
            ? { ...credentials.dossier, reputationStars: credentials.dossier.reputationStars ?? reputationStars }
            : credentials.dossier,
        }
      : credentials;

  return {
    userId,
    cardTitle: asString(record.cardTitle ?? record.card_title, '旅行者'),
    mbtiType: asString(record.mbtiType ?? record.mbti_type),
    credentials: enrichedCredentials,
  };
}

function readStringFromRecord(
  record: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

function normalizeDestinationSubScopes(raw: unknown): DestinationRegionOption['subScopes'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
      if (!record) return null;
      const id = asString(record.id);
      const label = asString(record.label);
      if (!id || !label) return null;
      const scope = asNullableString(record.scope ?? record.destination_scope);
      return { id, label, ...(scope ? { scope } : {}) };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);
}

function normalizeDestinationRegions(raw: unknown): DestinationRegionOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
      if (!record) return null;
      const id = asString(record.id);
      const label = asString(record.label);
      if (!id || !label) return null;
      const hint = asNullableString(record.hint) ?? undefined;
      const subScopes = normalizeDestinationSubScopes(record.subScopes ?? record.sub_scopes);
      return { id, label, ...(hint ? { hint } : {}), subScopes };
    })
    .filter((item): item is DestinationRegionOption => item != null);
}

/** GET /match-square/filters/options */
export function normalizeFilterOptions(raw: unknown): MatchSquareFilterOptions {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const destinationRegions = normalizeDestinationRegions(
    record.destinationRegions ?? record.destination_regions
  );

  const base: MatchSquareFilterOptions = {
    personaQuadrants: Array.isArray(record.personaQuadrants)
      ? (record.personaQuadrants as MatchSquareFilterOptions['personaQuadrants'])
      : Array.isArray(record.persona_quadrants)
        ? (record.persona_quadrants as MatchSquareFilterOptions['personaQuadrants'])
        : [],
    interactionModes: Array.isArray(record.interactionModes)
      ? (record.interactionModes as MatchSquareFilterOptions['interactionModes'])
      : Array.isArray(record.interaction_modes)
        ? (record.interaction_modes as MatchSquareFilterOptions['interactionModes'])
        : [],
    personaTypes: Array.isArray(record.personaTypes)
      ? (record.personaTypes as MatchSquareFilterOptions['personaTypes'])
      : Array.isArray(record.persona_types)
        ? (record.persona_types as MatchSquareFilterOptions['personaTypes'])
        : undefined,
    teamworkStyles: Array.isArray(record.teamworkStyles)
      ? (record.teamworkStyles as MatchSquareFilterOptions['teamworkStyles'])
      : Array.isArray(record.teamwork_styles)
        ? (record.teamwork_styles as MatchSquareFilterOptions['teamworkStyles'])
        : undefined,
    destinationRegions: destinationRegions.length
      ? destinationRegions
      : buildClarifyDestinationRegions(),
  };

  return base;
}

