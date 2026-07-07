import { format, isToday, isYesterday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type {
  AiActivityLogFilterTag,
  AiActivityLogTimelineItem,
} from '@/api/ai-activity-log.types';

export type AiActivityLogTab = AiActivityLogFilterTag;

export const AI_ACTIVITY_LOG_TABS: Array<{ id: AiActivityLogTab; label: string }> = [
  { id: 'ALL', label: '全部' },
  { id: 'AUTO', label: '自动执行' },
  { id: 'WAITING_CONFIRM', label: '等待确认' },
  { id: 'WRITTEN_BACK', label: '已写回' },
  { id: 'CANCELLED', label: '已撤销' },
];

export function filterAiActivityLogItems(
  items: AiActivityLogTimelineItem[],
  tab: AiActivityLogTab,
): AiActivityLogTimelineItem[] {
  if (tab === 'ALL') return items;
  return items.filter((item) => item.filterTags.includes(tab));
}

export function formatAiActivityLogTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const clock = format(date, 'HH:mm', { locale: zhCN });
  if (isToday(date)) return `${clock} 今天`;
  if (isYesterday(date)) return `${clock} 昨天`;
  return format(date, 'HH:mm · M月d日', { locale: zhCN });
}

export function formatAiActivityLogDelta(delta?: number): string | null {
  if (typeof delta !== 'number' || delta === 0) return null;
  return delta > 0 ? `较昨日 +${delta}` : `较昨日 ${delta}`;
}

/** BFF href → dashboard 内链 */
export function resolveAiActivityLogHref(href?: string | null): string | null {
  if (!href) return null;
  if (href.startsWith('/dashboard/')) return href;
  if (href.startsWith('/trips/')) return `/dashboard${href}`;
  if (href.startsWith('/api/trips/')) {
    return href.replace(/^\/api/, '/dashboard');
  }
  return href;
}

export function aiActivityLogCategoryIconKey(category?: string): string {
  switch (category) {
    case 'MONITORING':
      return 'monitoring';
    case 'TIME_ROUTE':
      return 'time_route';
    case 'ACTIVITY':
      return 'activity';
    case 'BUDGET_BOOKING':
      return 'budget';
    case 'SAFETY':
      return 'safety';
    case 'TEAM_PRIVACY':
      return 'team';
    case 'VALIDATION':
      return 'validation';
    default:
      return 'other';
  }
}

export function aiActivityLogStatusTone(
  statusTag?: string,
): 'auto' | 'confirm' | 'neutral' | 'cancelled' {
  switch (statusTag) {
    case 'AUTO_EXECUTED':
    case 'WRITTEN_BACK':
      return 'auto';
    case 'WAITING_CONFIRM':
      return 'confirm';
    case 'CANCELLED':
      return 'cancelled';
    case 'USER_CONFIRMED':
    default:
      return 'neutral';
  }
}
