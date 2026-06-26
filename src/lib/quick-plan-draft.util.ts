import type {
  ConfirmPlanResponse,
  QuickPlanExistingRequest,
  QuickPlanQuickAction,
  QuickPlanResponse,
} from '@/types/quick-plan';
import type { DraftDay, TripDraftResponse } from '@/types/trip';

const QUICK_PLAN_CACHE_KEY = 'quick_plan_session';
const QUICK_PLAN_TTL_MS = 60 * 60 * 1000;

export const ASSUMPTION_LABELS: Record<string, string> = {
  destination: '目的地',
  days: '天数',
  date_range: '日期范围',
  transport: '交通方式',
  style: '旅行风格',
  intensity: '行程节奏',
};

export function countDraftPlaces(days: DraftDay[]): number {
  return days.reduce((total, day) => total + Object.keys(day.slots ?? {}).length, 0);
}

export function buildTripDraftFromQuickPlan(
  quickPlan: QuickPlanResponse,
  confirm: ConfirmPlanResponse
): TripDraftResponse {
  const dateRange = quickPlan.assumptions.date_range?.value;
  const draftDays = confirm.draft.days;

  return {
    destination: quickPlan.assumptions.destination.value || quickPlan.understanding.destination,
    days: quickPlan.assumptions.days.value || draftDays.length,
    startDate: dateRange?.start_date,
    endDate: dateRange?.end_date,
    draftDays,
    candidatesCount: countDraftPlaces(draftDays),
    validationWarnings: confirm.draft.warnings,
    metadata: {
      generationTime: quickPlan.metadata.estimatedGenerationTime,
    },
  };
}

export function formatAssumptionValue(key: string, value: unknown): string {
  if (value == null || value === '') return '待定';
  if (key === 'days') return `${value} 天`;
  if (key === 'date_range' && typeof value === 'object') {
    const range = value as { start_date?: string; end_date?: string };
    if (range.start_date && range.end_date) {
      return `${range.start_date} 至 ${range.end_date}`;
    }
    if (range.start_date) return `从 ${range.start_date}`;
    if (range.end_date) return `至 ${range.end_date}`;
    return '待定';
  }
  return String(value);
}

export function assumptionsToExistingRequest(
  quickPlan: QuickPlanResponse,
  overrides?: QuickPlanExistingRequest
): QuickPlanExistingRequest {
  const { assumptions } = quickPlan;
  const dateRange = assumptions.date_range?.value;

  return {
    destination: assumptions.destination.value,
    days: assumptions.days.value,
    date_range:
      dateRange?.start_date && dateRange?.end_date
        ? { start_date: dateRange.start_date, end_date: dateRange.end_date }
        : undefined,
    transport: assumptions.transport.value,
    style: assumptions.style.value,
    intensity: assumptions.intensity.value,
    ...overrides,
  };
}

export function applyQuickPlanAction(
  existingRequest: QuickPlanExistingRequest | undefined,
  action: QuickPlanQuickAction
): QuickPlanExistingRequest {
  const next: QuickPlanExistingRequest = { ...(existingRequest ?? {}) };
  const param = action.param?.trim();

  switch (action.action) {
    case 'increase_days':
    case 'add_day':
    case 'days_increase':
      next.days = Math.min(14, (next.days ?? 3) + (Number(param) || 1));
      break;
    case 'decrease_days':
    case 'remove_day':
    case 'days_decrease':
      next.days = Math.max(1, (next.days ?? 3) - (Number(param) || 1));
      break;
    case 'set_days':
      if (param) next.days = Math.min(14, Math.max(1, Number(param) || (next.days ?? 3)));
      break;
    case 'set_transport':
    case 'change_transport':
      if (param) next.transport = param;
      break;
    case 'set_style':
      if (param) next.style = param;
      break;
    case 'set_intensity':
      if (param) next.intensity = param;
      break;
    case 'set_destination':
      if (param) next.destination = param;
      break;
    default:
      if (param && action.action.startsWith('set_')) {
        const field = action.action.replace(/^set_/, '');
        next[field] = param;
      }
      break;
  }

  return next;
}

interface QuickPlanCacheEntry {
  quickPlanId: string;
  userInput: string;
  existingRequest?: QuickPlanExistingRequest;
  expiresAt: number;
}

export function cacheQuickPlanSession(
  quickPlanId: string,
  userInput: string,
  existingRequest?: QuickPlanExistingRequest
): void {
  const entry: QuickPlanCacheEntry = {
    quickPlanId,
    userInput,
    existingRequest,
    expiresAt: Date.now() + QUICK_PLAN_TTL_MS,
  };
  try {
    localStorage.setItem(QUICK_PLAN_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // ignore quota errors
  }
}

export function readQuickPlanSession(): QuickPlanCacheEntry | null {
  try {
    const raw = localStorage.getItem(QUICK_PLAN_CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as QuickPlanCacheEntry;
    if (!entry.quickPlanId || entry.expiresAt <= Date.now()) {
      localStorage.removeItem(QUICK_PLAN_CACHE_KEY);
      return null;
    }
    return entry;
  } catch {
    localStorage.removeItem(QUICK_PLAN_CACHE_KEY);
    return null;
  }
}

export function clearQuickPlanSession(): void {
  localStorage.removeItem(QUICK_PLAN_CACHE_KEY);
}
