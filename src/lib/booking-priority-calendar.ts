import type { BookingPriorityItem } from '@/types/booking-priority-list';

/** 剥离 HTML 标签，用于 ICS 描述与折叠指南纯文本展示 */
export function stripHtml(html: string | undefined): string {
  if (!html?.trim()) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatIcsUtc(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T` +
    `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function downloadIcs(params: {
  title: string;
  start: string;
  description?: string;
  url?: string;
}): void {
  const startUtc = formatIcsUtc(params.start);
  if (!startUtc) return;

  const endDate = new Date(params.start);
  endDate.setHours(endDate.getHours() + 1);
  const endUtc = formatIcsUtc(endDate.toISOString());
  if (!endUtc) return;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TripNara//Booking Priority//EN',
    'BEGIN:VEVENT',
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${escapeIcsText(params.title)}`,
  ];
  if (params.description?.trim()) {
    lines.push(`DESCRIPTION:${escapeIcsText(params.description.trim())}`);
  }
  if (params.url?.trim()) {
    lines.push(`URL:${params.url.trim()}`);
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${params.title.replace(/[^\w\u4e00-\u9fff-]+/g, '_').slice(0, 40) || 'reminder'}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface OpenCalendarReminderOptions {
  tripId?: string | null;
  /** delivery_artifacts 中 kind=calendar 的 api_action.path，缺省走 Google Calendar sync */
  calendarSyncPath?: string;
  onSyncSuccess?: () => void;
  onSyncError?: (message: string) => void;
}

/**
 * Phase-4c 日历 Deeplink：
 * A) Google Calendar URL 直接打开
 * B) Dashboard 深链 → 可选 POST calendar sync（Phase-4d 扩展 body）
 * C) Web 降级 → .ics 下载
 */
export async function openCalendarReminder(
  item: BookingPriorityItem,
  options?: OpenCalendarReminderOptions
): Promise<'google' | 'sync' | 'ics'> {
  const deeplink = item.action_payload.calendar_reminder_deeplink?.trim();
  if (!deeplink) {
    downloadIcsFallback(item);
    return 'ics';
  }

  if (deeplink.startsWith('https://calendar.google.com/')) {
    window.open(deeplink, '_blank', 'noopener,noreferrer');
    return 'google';
  }

  const tripId = options?.tripId?.trim();
  const syncPath =
    options?.calendarSyncPath?.trim() ||
    (tripId ? `/google-calendar/trips/${tripId}/sync` : undefined);

  if (syncPath && tripId && deeplink.includes('action=calendar_reminder')) {
    try {
      const { default: apiClient } = await import('@/api/client');
      await apiClient.post(syncPath, {
        booking_id: item.id,
        opens_at: item.timing.opens_at_local ?? item.timing.book_by_date,
        book_by: item.timing.book_by_date,
        title: item.title,
      });
      options?.onSyncSuccess?.();
      return 'sync';
    } catch (err) {
      const msg = err instanceof Error ? err.message : '日历同步失败';
      options?.onSyncError?.(msg);
    }
  }

  downloadIcsFallback(item);
  return 'ics';
}

function downloadIcsFallback(item: BookingPriorityItem): void {
  const start = item.timing.opens_at_local ?? item.timing.book_by_date;
  downloadIcs({
    title: item.title,
    start,
    description: stripHtml(item.action_payload.booking_guide_html),
    url: item.action_payload.official_booking_url,
  });
}
