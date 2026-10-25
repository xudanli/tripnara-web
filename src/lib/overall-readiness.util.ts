import type {
  OverallReadinessCardDto,
  OverallReadinessDimensionDetail,
  OverallReadinessReport,
  OverallReadinessState,
} from '@/types/overall-readiness';

export function isOverallReadinessBlocked(state: OverallReadinessState | undefined | null): boolean {
  return state === 'BLOCKED';
}

export function formatOverallReadinessMeta(card: Pick<
  OverallReadinessCardDto,
  'blockerCount' | 'pendingConfirmationCount'
>): string {
  const parts: string[] = [];
  if (card.blockerCount > 0) parts.push(`${card.blockerCount} 个阻塞`);
  if (card.pendingConfirmationCount > 0) {
    parts.push(`${card.pendingConfirmationCount} 个待确认`);
  }
  return parts.join(' · ') || '暂无阻塞项';
}

export function normalizeOverallReadinessDimensions(
  dimensions: OverallReadinessReport['dimensions'],
): OverallReadinessDimensionDetail[] {
  if (Array.isArray(dimensions)) return dimensions;
  if (dimensions && typeof dimensions === 'object') {
    return Object.values(dimensions);
  }
  return [];
}

export function dimensionLabelZh(code: string | undefined, fallback?: string): string {
  switch ((code ?? '').toUpperCase()) {
    case 'ROUTE':
      return '路线';
    case 'ACCOMMODATION':
      return '住宿';
    case 'TRANSPORT':
      return '交通';
    case 'ACTIVITY':
      return '活动';
    case 'MEMBER':
      return '成员';
    default:
      return fallback?.trim() || code || '维度';
  }
}

export function formatEvidenceTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function isEvidenceExpired(expiresAt?: string | null, now = Date.now()): boolean {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return Number.isFinite(t) && t < now;
}
