import type { HikePlanRecord, HikePlanStatus } from '@/types/hike-plan';
import type { HikePlanSummaryEmbed } from '@/types/trip-hiking-summary';

const VALID_STATUS = new Set<HikePlanStatus>([
  'planning',
  'ready',
  'in_progress',
  'completed',
  'cancelled',
]);

function normalizeStatus(raw: string): HikePlanStatus {
  if (raw === 'prep') return 'planning';
  if (VALID_STATUS.has(raw as HikePlanStatus)) return raw as HikePlanStatus;
  return 'planning';
}

/** 将 hiking-summary 内嵌 hikePlan 转为列表/卡片可用的 HikePlanRecord */
export function hikePlanFromSummaryEmbed(
  embed: HikePlanSummaryEmbed,
  segment?: { routeDirectionId?: number; startDate?: string; label?: string }
): HikePlanRecord {
  const now = new Date().toISOString();
  return {
    id: embed.id,
    routeDirectionId: embed.routeDirectionId ?? segment?.routeDirectionId ?? 0,
    plannedDate: embed.plannedDate ?? segment?.startDate ?? '',
    status: normalizeStatus(String(embed.status)),
    checklistCompleted: embed.checklistComplete ?? embed.checklistCompleted,
    permitsObtained: embed.permitsComplete ?? embed.permitsObtained,
    nameCN: segment?.label,
    createdAt: now,
    updatedAt: now,
  };
}
