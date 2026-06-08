/**
 * ItineraryItemCard：时间窗展示、时长中文、类型粗分（图标 / compact 行用）
 */

import { formatHmInDestinationTimezone } from '@/utils/opening-hours-schedule-check';

const TIME_IN_STR = /(\d{1,2}):(\d{1,2})/;

/** 从 ISO 或任意含 HH:mm 的字符串抽出 HH:mm（24h）；优先按目的地时区转换 UTC 存储 */
export function extractHmFromWindow(
  s: string | undefined,
  timezone?: string
): string | undefined {
  if (!s || typeof s !== 'string') return undefined;
  const t = s.trim();
  if (timezone && /[Tt]\d/.test(t)) {
    const hm = formatHmInDestinationTimezone(t, timezone);
    if (hm) return hm;
  }
  const m = t.match(TIME_IN_STR);
  if (m) return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`;
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return undefined;
}

/** 安全展示 HH:mm（支持 ISO、09:00、09:00:00 等） */
export function formatScheduleTime(time?: string | null): string {
  if (!time) return '';
  return extractHmFromWindow(time) ?? time;
}

/** 安全展示时间区间，如 09:00 - 11:30 */
export function formatScheduleTimeRange(start?: string | null, end?: string | null): string {
  const startLabel = formatScheduleTime(start);
  const endLabel = formatScheduleTime(end);
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  return startLabel || endLabel;
}

function minutesFromHm(hm: string): number | null {
  const m = hm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 同一天内 end - start，输出如「1小时55分钟」；跨日或无法解析则 undefined */
export function formatDurationBetweenWindows(
  startWindow?: string,
  endWindow?: string
): string | undefined {
  const a = extractHmFromWindow(startWindow);
  const b = extractHmFromWindow(endWindow);
  if (!a || !b) return undefined;
  const ma = minutesFromHm(a);
  const mb = minutesFromHm(b);
  if (ma == null || mb == null) return undefined;
  let diff = mb - ma;
  if (diff < 0) diff += 24 * 60;
  if (diff <= 0 || diff > 36 * 60) return undefined;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}小时`);
  if (m > 0) parts.push(`${m}分钟`);
  return parts.length ? parts.join('') : undefined;
}

export function osmStaticMapThumbUrl(lat: number, lng: number, w = 160, h = 160): string {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=${w}x${h}&maptype=mapnik`;
}

/** 英文/后端 type → 简短中文 pill（无则返回 undefined） */
export function categoryLabelZh(categoryOrType: string | undefined): string | undefined {
  if (!categoryOrType?.trim()) return undefined;
  const raw = categoryOrType.trim();
  const u = raw.toUpperCase().replace(/\s+/g, '_');

  const table: Record<string, string> = {
    RESTAURANT: '餐厅',
    MEAL: '用餐',
    FOOD: '美食',
    ATTRACTION: '景点',
    POI: '景点',
    SCENIC: '景点',
    HOTEL: '酒店',
    ACCOMMODATION: '住宿',
    TRANSIT: '交通',
    TRANSPORT: '交通',
    TRANSFER: '接驳',
    DRIVE: '自驾',
    RAIL: '铁路',
    FLIGHT: '航班',
    ACTIVITY: '活动',
    SHOPPING: '购物',
    REST: '休息',
  };
  if (table[u]) return table[u];
  if (/餐|食|饭|restaurant|dining/i.test(raw)) return '餐厅';
  if (/景|游|attraction|sight/i.test(raw)) return '景点';
  if (/酒|宿|hotel/i.test(raw)) return '酒店';
  if (/交通|车程|transit|transfer|rail|flight|drive/i.test(raw)) return '交通';
  return raw.length <= 8 ? raw : undefined;
}

export function isTransitLikeItemType(type?: string): boolean {
  if (!type?.trim()) return false;
  const u = type.toUpperCase();
  return (
    /TRANSIT|TRANSPORT|DRIVE|RAIL|FLIGHT|TRANSFER|COMMUTE|连接/.test(u) ||
    /交通|车程|航班|火车|自驾|转机|接驳|移动/.test(type)
  );
}
