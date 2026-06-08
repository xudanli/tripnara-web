import { normalizeActiveTripPath } from '@/features/active-trip/lib/normalize-active-trip-path';
import type {
  SovereignForceLockCommitResult,
  SovereignForceLockCrewMember,
  SovereignForceLockDroppedSlot,
  SovereignForceLockPreview,
  SovereignForceLockRecord,
  SovereignForceLockVaultRecalc,
} from '@/types/sovereign-force-lock';
import { normalizeInstantiateTripResult } from '../trip-instantiation/normalize-trip-instantiation';

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeCrewMember(raw: unknown): SovereignForceLockCrewMember | null {
  const r = asRecord(raw);
  if (!r) return null;
  const userId = asString(r.userId ?? r.user_id);
  if (!userId) return null;
  return {
    userId,
    role: asString(r.role),
    slotLabel: asString(r.slotLabel ?? r.slot_label),
    displayName: asString(r.displayName ?? r.display_name),
    applicationId: asNullableString(r.applicationId ?? r.application_id),
  };
}

function normalizeDroppedSlot(raw: unknown): SovereignForceLockDroppedSlot | null {
  const r = asRecord(raw);
  if (!r) return null;
  const slotId = asString(r.slotId ?? r.slot_id);
  if (!slotId) return null;
  return {
    slotIndex: asNumber(r.slotIndex ?? r.slot_index),
    slotId,
    roleLabel: asString(r.roleLabel ?? r.role_label),
    deficitTag: asString(r.deficitTag ?? r.deficit_tag),
  };
}

function normalizeVaultRecalc(raw: unknown): SovereignForceLockVaultRecalc {
  const r = asRecord(raw);
  const budgetRaw = r?.budgetPerPersonCents ?? r?.budget_per_person_cents;
  return {
    previousSplitBase: asNumber(r?.previousSplitBase ?? r?.previous_split_base, 1),
    actualSplitBase: asNumber(r?.actualSplitBase ?? r?.actual_split_base, 1),
    budgetPerPersonCents:
      typeof budgetRaw === 'number' && Number.isFinite(budgetRaw) ? budgetRaw : null,
    summaryLine: asString(r?.summaryLine ?? r?.summary_line),
  };
}

function normalizeStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export function normalizeSovereignForceLockRecord(raw: unknown): SovereignForceLockRecord | null {
  const r = asRecord(raw);
  if (!r) return null;

  const droppedRaw = r.droppedOpenSlots ?? r.dropped_open_slots;
  const droppedOpenSlots = Array.isArray(droppedRaw)
    ? droppedRaw.map(normalizeDroppedSlot).filter((x): x is SovereignForceLockDroppedSlot => x != null)
    : [];

  return {
    originalSlotsNeeded: asNumber(r.originalSlotsNeeded ?? r.original_slots_needed),
    effectiveSlotsNeeded: asNumber(r.effectiveSlotsNeeded ?? r.effective_slots_needed),
    droppedOpenSlots,
    physicalDeficits: normalizeStringList(r.physicalDeficits ?? r.physical_deficits),
    vaultRecalc: normalizeVaultRecalc(r.vaultRecalc ?? r.vault_recalc),
    resilienceScore: asNumber(r.resilienceScore ?? r.resilience_score, 100),
    pendingApplicationsRejected: asNumber(
      r.pendingApplicationsRejected ?? r.pending_applications_rejected
    ),
    taskRebalanceNote: asNullableString(r.taskRebalanceNote ?? r.task_rebalance_note),
    lockedAt: asNullableString(r.lockedAt ?? r.locked_at),
    note: asNullableString(r.note),
  };
}

export function normalizeSovereignForceLockPreview(raw: unknown): SovereignForceLockPreview {
  const r = asRecord(raw);
  if (!r) {
    return {
      postId: '',
      canForceLock: false,
      blockReason: '预览数据无效',
      currentCrew: [],
      droppedOpenSlots: [],
      physicalDeficits: [],
      resilienceScore: 100,
      vaultRecalc: normalizeVaultRecalc(null),
      pendingApplicationsToReject: 0,
      confirmHeadline: '',
      confirmLines: [],
    };
  }

  const crewRaw = r.currentCrew ?? r.current_crew;
  const droppedRaw = r.droppedOpenSlots ?? r.dropped_open_slots;

  return {
    postId: asString(r.postId ?? r.post_id),
    canForceLock: r.canForceLock === true || r.can_force_lock === true,
    blockReason: asNullableString(r.blockReason ?? r.block_reason),
    currentCrew: Array.isArray(crewRaw)
      ? crewRaw.map(normalizeCrewMember).filter((x): x is SovereignForceLockCrewMember => x != null)
      : [],
    droppedOpenSlots: Array.isArray(droppedRaw)
      ? droppedRaw.map(normalizeDroppedSlot).filter((x): x is SovereignForceLockDroppedSlot => x != null)
      : [],
    physicalDeficits: normalizeStringList(r.physicalDeficits ?? r.physical_deficits),
    resilienceScore: asNumber(r.resilienceScore ?? r.resilience_score, 100),
    vaultRecalc: normalizeVaultRecalc(r.vaultRecalc ?? r.vault_recalc),
    pendingApplicationsToReject: asNumber(
      r.pendingApplicationsToReject ?? r.pending_applications_to_reject
    ),
    confirmHeadline: asString(r.confirmHeadline ?? r.confirm_headline),
    confirmLines: normalizeStringList(r.confirmLines ?? r.confirm_lines),
  };
}

export function normalizeSovereignForceLockCommitResult(raw: unknown): SovereignForceLockCommitResult {
  const r = asRecord(raw);
  if (!r) {
    return {
      postId: '',
      sovereignLock: {
        originalSlotsNeeded: 0,
        effectiveSlotsNeeded: 0,
        droppedOpenSlots: [],
        physicalDeficits: [],
        vaultRecalc: normalizeVaultRecalc(null),
        resilienceScore: 100,
        pendingApplicationsRejected: 0,
      },
      rejectedApplicationIds: [],
      instantiation: null,
      activeTripPath: null,
      dnaScheduled: false,
    };
  }

  const rejectedRaw = r.rejectedApplicationIds ?? r.rejected_application_ids;
  const instantiationRaw = r.instantiation ?? r.tripInstantiationResult ?? r.trip_instantiation_result;
  const instantiation = instantiationRaw ? normalizeInstantiateTripResult(instantiationRaw) : null;
  const tripId = instantiation?.tripId ?? null;
  const activeTripPath = normalizeActiveTripPath(
    asNullableString(r.activeTripPath ?? r.active_trip_path) ?? instantiation?.activeTripPath,
    tripId
  );

  return {
    postId: asString(r.postId ?? r.post_id),
    sovereignLock:
      normalizeSovereignForceLockRecord(r.sovereignLock ?? r.sovereign_lock) ?? {
        originalSlotsNeeded: 0,
        effectiveSlotsNeeded: 0,
        droppedOpenSlots: [],
        physicalDeficits: [],
        vaultRecalc: normalizeVaultRecalc(null),
        resilienceScore: 100,
        pendingApplicationsRejected: 0,
      },
    rejectedApplicationIds: Array.isArray(rejectedRaw)
      ? rejectedRaw.map((id) => String(id)).filter(Boolean)
      : [],
    instantiation,
    activeTripPath,
    dnaScheduled: r.dnaScheduled === true || r.dna_scheduled === true,
  };
}
