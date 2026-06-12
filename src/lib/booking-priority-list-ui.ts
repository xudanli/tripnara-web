import type { RouteAndRunResponse } from '@/api/agent';
import type {
  BookingPriorityItem,
  BookingPriorityListPayload,
  BookingPriorityUrgency,
} from '@/types/booking-priority-list';
import { isBookingPriorityList } from '@/types/booking-priority-list';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function pickStr(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

function pickNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
}

const URGENCY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
};

function normalizeUrgency(v: unknown): BookingPriorityUrgency {
  const s = pickStr(v);
  if (s === 'CRITICAL' || s === 'HIGH' || s === 'MEDIUM') return s;
  return 'MEDIUM';
}

function normalizeTiming(v: unknown): BookingPriorityItem['timing'] | null {
  if (!isRecord(v)) return null;
  const book_by_date =
    pickStr(v.book_by_date) ?? pickStr(v.bookByDate);
  if (!book_by_date) return null;

  const countdown_seconds =
    pickNum(v.countdown_seconds) ??
    pickNum(v.countdownSeconds) ??
    0;

  return {
    book_by_date,
    ...(pickStr(v.opens_at_local) ?? pickStr(v.opensAtLocal)
      ? { opens_at_local: pickStr(v.opens_at_local) ?? pickStr(v.opensAtLocal) }
      : {}),
    countdown_seconds,
  };
}

function normalizeActionPayload(v: unknown): BookingPriorityItem['action_payload'] | null {
  if (!isRecord(v)) return null;
  const official_booking_url =
    pickStr(v.official_booking_url) ??
    pickStr(v.officialBookingUrl);
  const calendar_reminder_deeplink =
    pickStr(v.calendar_reminder_deeplink) ??
    pickStr(v.calendarReminderDeeplink) ??
    '';

  if (!official_booking_url) return null;

  return {
    official_booking_url,
    calendar_reminder_deeplink,
    ...(pickStr(v.booking_guide_html) ?? pickStr(v.bookingGuideHtml)
      ? { booking_guide_html: pickStr(v.booking_guide_html) ?? pickStr(v.bookingGuideHtml) }
      : {}),
  };
}

export function normalizeBookingPriorityItem(v: unknown, index: number): BookingPriorityItem | null {
  if (!isRecord(v)) return null;

  const title = pickStr(v.title);
  if (!title) return null;

  const timing = normalizeTiming(v.timing);
  const action_payload = normalizeActionPayload(v.action_payload ?? v.actionPayload);
  if (!timing || !action_payload) return null;

  const id = pickStr(v.id) ?? `booking-priority-${index}`;
  const associated_day_number =
    pickNum(v.associated_day_number) ??
    pickNum(v.associatedDayNumber) ??
    0;

  const categoryRaw = pickStr(v.category) ?? 'ATTRACTION_TICKET';

  return {
    id,
    category: categoryRaw,
    title,
    associated_day_number,
    urgency_level: normalizeUrgency(v.urgency_level ?? v.urgencyLevel),
    timing,
    action_payload,
  };
}

/** 后端已排序；若缺失则按 urgency + countdown 兜底 */
export function sortBookingPriorityItems(items: BookingPriorityItem[]): BookingPriorityItem[] {
  return [...items].sort((a, b) => {
    const ua = URGENCY_ORDER[a.urgency_level] ?? 99;
    const ub = URGENCY_ORDER[b.urgency_level] ?? 99;
    if (ua !== ub) return ua - ub;
    return a.timing.countdown_seconds - b.timing.countdown_seconds;
  });
}

export function normalizeBookingPriorityList(raw: unknown): BookingPriorityListPayload | null {
  if (!isBookingPriorityList(raw)) return null;

  const items = raw.items
    .map((item, idx) => normalizeBookingPriorityItem(item, idx))
    .filter(Boolean) as BookingPriorityItem[];

  if (!items.length) return null;

  const trip_id =
    pickStr(raw.trip_id) ??
    pickStr(raw.tripId) ??
    '';
  const generated_at =
    pickStr(raw.generated_at) ??
    pickStr(raw.generatedAt) ??
    new Date().toISOString();

  return {
    schema: 'tripnara.booking_priority_list@v1',
    trip_id,
    generated_at,
    items: sortBookingPriorityItems(items),
  };
}

function pickRawBookingPriorityList(payload: Record<string, unknown> | undefined): unknown {
  if (!payload) return undefined;

  const uiDisplay = isRecord(payload.ui_display) ? payload.ui_display : undefined;
  const fromUi = uiDisplay?.booking_priority_list;
  if (fromUi != null) return fromUi;

  const narration = isRecord(payload.narration) ? payload.narration : undefined;
  return narration?.booking_priority_list;
}

/** ui_display.booking_priority_list 优先；次选 narration.booking_priority_list（流式 NARRATE） */
export function pickBookingPriorityListFromRouteRun(
  response: RouteAndRunResponse
): BookingPriorityListPayload | null {
  if (response.result?.status !== 'OK') return null;

  const payload = response.result?.payload as Record<string, unknown> | undefined;
  const raw = pickRawBookingPriorityList(payload);
  return normalizeBookingPriorityList(raw);
}

export function hasBookingPriorityListUi(
  list: BookingPriorityListPayload | null | undefined
): boolean {
  return Boolean(list?.items?.length);
}

/** 由 generated_at + countdown_seconds 计算截止时刻 */
export function bookingPriorityDeadlineMs(list: BookingPriorityListPayload): number {
  const base = new Date(list.generated_at).getTime();
  if (Number.isNaN(base)) return Date.now();
  const first = list.items[0];
  if (!first) return base;
  return base + first.timing.countdown_seconds * 1000;
}

export function remainingSecondsFromGeneratedAt(
  generatedAt: string,
  countdownSeconds: number,
  nowMs: number = Date.now()
): number {
  const base = new Date(generatedAt).getTime();
  if (Number.isNaN(base)) return Math.max(0, countdownSeconds);
  const deadline = base + countdownSeconds * 1000;
  return Math.max(0, Math.floor((deadline - nowMs) / 1000));
}

export function formatCountdownLabel(totalSeconds: number): string {
  if (totalSeconds <= 0) return '需立即处理';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days} 天 ${hours} 小时`;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
