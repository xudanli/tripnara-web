import type {
  DomainNegotiationTask,
  DomainNegotiationTaskStatus,
} from '@/types/domain-negotiation-task';
import type { DomainCrossLevel, TripDomain } from '@/types/trip-domain-influence';

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

const STATUS_LABELS: Record<DomainNegotiationTaskStatus, string> = {
  pending: '待开始',
  in_discussion: '讨论中',
  consensus_reached: '已达成共识',
};

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function normalizeDomain(raw: unknown): TripDomain | null {
  const s = asString(raw);
  return DOMAIN_VALUES.includes(s as TripDomain) ? (s as TripDomain) : null;
}

function normalizeCrossLevel(raw: unknown): DomainCrossLevel {
  const s = asString(raw, 'medium');
  if (s === 'low' || s === 'high') return s;
  return 'medium';
}

function normalizeStatus(raw: unknown): DomainNegotiationTaskStatus {
  const s = asString(raw, 'pending');
  if (s === 'in_discussion' || s === 'consensus_reached') return s;
  return 'pending';
}

export function isDomainNegotiationTaskRaw(raw: unknown): boolean {
  const r = asRecord(raw);
  return Boolean(r && normalizeDomain(r.domain));
}

export function normalizeDomainNegotiationTask(raw: unknown): DomainNegotiationTask | null {
  const r = asRecord(raw);
  if (!r) return null;

  const domain = normalizeDomain(r.domain);
  if (!domain) return null;

  const status = normalizeStatus(r.status);
  const title = asString(r.title, domain);

  const activeRoundRaw = r.activeRoundId ?? r.active_round_id;

  return {
    id: asString(r.id, `task:${domain}`),
    domain,
    title,
    status,
    statusLabel: asString(r.statusLabel ?? r.status_label, STATUS_LABELS[status]),
    crossLevel: normalizeCrossLevel(r.crossLevel ?? r.cross_level),
    closesAt:
      typeof r.closesAt === 'string'
        ? r.closesAt
        : typeof r.closes_at === 'string'
          ? r.closes_at
          : null,
    description: typeof r.description === 'string' ? r.description : undefined,
    activeRoundId: typeof activeRoundRaw === 'string' ? activeRoundRaw : null,
    claimCount: typeof r.claimCount === 'number' ? r.claimCount : typeof r.claim_count === 'number' ? r.claim_count : undefined,
    leaderDisplayName:
      typeof r.leaderDisplayName === 'string'
        ? r.leaderDisplayName
        : typeof r.leader_display_name === 'string'
          ? r.leader_display_name
          : undefined,
    endorsementSummary:
      typeof r.endorsementSummary === 'string'
        ? r.endorsementSummary
        : typeof r.endorsement_summary === 'string'
          ? r.endorsement_summary
          : undefined,
    weightSource:
      typeof r.weightSource === 'string'
        ? r.weightSource
        : typeof r.weight_source === 'string'
          ? r.weight_source
          : undefined,
  };
}

export function normalizeDomainNegotiationTasksResponse(raw: unknown): DomainNegotiationTask[] {
  const r = asRecord(raw);
  if (!r) return [];

  const tasksRaw = r.tasks ?? r.negotiationTasks ?? r.negotiation_tasks;
  if (!Array.isArray(tasksRaw)) return [];

  return tasksRaw
    .filter(isDomainNegotiationTaskRaw)
    .map(normalizeDomainNegotiationTask)
    .filter((x): x is DomainNegotiationTask => x != null);
}
