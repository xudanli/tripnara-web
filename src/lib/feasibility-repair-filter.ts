import type { TripDetail } from '@/types/trip';
import { parseTravelRouteFromMessage } from '@/lib/feasibility-travel-route-parse';
import { isUltraLongDriveIssue, preferStructuralLongDriveRepairOptions } from '@/lib/feasibility-ultra-long-drive';
import { isPlanClassAction } from '@/lib/feasibility-repair-plan-class';
import { isSelfDriveTripContext } from '@/lib/trip-self-drive';
import type { FeasibilityIssueDto, FeasibilityRepairOptionDto } from '@/types/trip-feasibility-report';

const SELF_DRIVE_INAPPLICABLE_RE =
  /预订交通|预订租车|提前预订租车|包车|拼车|当地向导|联系.*向导|查看替代路线|替代路线|预订.*交通/i;

/** 预订交通 / 租车类修复（自驾行程下通常不适用） */
export function isBookTransportRepairOption(option: FeasibilityRepairOptionDto): boolean {
  if (option.actionType === 'book_transport') return true;
  if (/预订交通/i.test(option.label)) return true;
  const desc = option.description ?? '';
  if (/预订租车|提前预订租车|包车服务|拼车服务/i.test(desc)) return true;
  return false;
}

/** 自驾语境下不适用的泛化交通预订 / 向导类修复 */
export function isInapplicableSelfDriveRepairOption(option: FeasibilityRepairOptionDto): boolean {
  if (isBookTransportRepairOption(option)) return true;
  if (isPlanClassAction(option.actionType)) return false;
  const text = `${option.label} ${option.description ?? ''}`;
  return SELF_DRIVE_INAPPLICABLE_RE.test(text);
}

function isScheduleTimingRepairOption(option: FeasibilityRepairOptionDto): boolean {
  if (
    option.actionType === 'adjust_time' ||
    option.actionType === 'reorder_pois' ||
    option.actionType === 'move_to_day'
  ) {
    return true;
  }
  return /改时间|调整时间|推迟|提前|时间轴/.test(`${option.label} ${option.description ?? ''}`);
}

function isTimingOnlyTravelIssue(issue: FeasibilityIssueDto): boolean {
  if (isUltraLongDriveIssue(issue)) return false;
  if (issue.issueKind === 'inter_day_travel' || issue.issueKind === 'same_day_travel') {
    return true;
  }
  return parseTravelRouteFromMessage(issue.message) != null;
}

/** 按行程出行方式过滤不适用的修复建议 */
export function filterFeasibilityRepairOptionsForTrip(
  options: FeasibilityRepairOptionDto[] | undefined,
  trip: TripDetail | null | undefined,
  issue?: FeasibilityIssueDto,
): FeasibilityRepairOptionDto[] {
  if (!options?.length) return [];

  let filtered = options;

  if (isSelfDriveTripContext(trip)) {
    filtered = filtered.filter((option) => !isInapplicableSelfDriveRepairOption(option));
  }

  if (issue && isTimingOnlyTravelIssue(issue) && isSelfDriveTripContext(trip)) {
    const timingRepairs = filtered.filter((option) => isScheduleTimingRepairOption(option));
    return timingRepairs.length > 0 ? timingRepairs : [];
  }

  if (issue && isUltraLongDriveIssue(issue)) {
    return preferStructuralLongDriveRepairOptions(filtered, issue);
  }

  return filtered;
}

/** 是否展示「建议方案」工作流（不因交通卡片而整块隐藏） */
export function shouldShowFeasibilityRepairWorkflow(input: {
  issue: FeasibilityIssueDto;
  repairOptionCount: number;
  repairLoading?: boolean;
  prefersRepairWorkflow?: boolean;
}): boolean {
  const { issue, repairOptionCount, repairLoading, prefersRepairWorkflow } = input;
  if (repairOptionCount > 0 || repairLoading || prefersRepairWorkflow) return true;
  if (issue.priority === 'must_handle' || issue.priority === 'suggest_adjust') return true;
  if (issue.uiHints?.primaryAction === 'open_repair') return true;
  return false;
}
