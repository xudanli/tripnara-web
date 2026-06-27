import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getRepairOptions } from '@/api/feasibility-repair';
import { applyFeasibilityRepairOption, formatFeasibilityRepairApplyError } from '@/lib/feasibility-repair-apply';
import { filterFeasibilityRepairOptionsForTrip } from '@/lib/feasibility-repair-filter';
import {
  BUFFER_REPAIR_QUICK_ACTIONS,
  buildSyntheticInsertBufferDayOption,
  collectBufferRepairOptionsFromIssue,
  findBufferOptionByMinutes,
  findInsertBufferDayOption,
  findShiftDepartureOption,
  isAddBufferMinuteOption,
  isInsertBufferDayOption,
  dedupeBufferRepairOptions,
  pickBufferRepairOptions,
  sortBufferRepairOptions,
} from '@/lib/feasibility-buffer-repair.util';
import type { FeasibilityIssueDto, FeasibilityRepairOptionDto } from '@/types/trip-feasibility-report';
import type { TripDetail } from '@/types/trip';

function applySuccessMessage(option: FeasibilityRepairOptionDto): string {
  if (isInsertBufferDayOption(option)) {
    return '已插入缓冲日，行程已顺延';
  }
  if (isAddBufferMinuteOption(option)) {
    return '已增加缓冲时间';
  }
  if (option.actionType === 'shift_departure') {
    return '已推迟出发时间';
  }
  return '已应用调整';
}

function shouldRefreshScheduleAfterBufferRepair(option: FeasibilityRepairOptionDto): boolean {
  return (
    isInsertBufferDayOption(option) ||
    isAddBufferMinuteOption(option) ||
    option.actionType === 'shift_departure'
  );
}

export function useFeasibilityBufferRepair(
  tripId: string,
  issue: FeasibilityIssueDto,
  trip?: TripDetail | null,
) {
  const embedded = useMemo(() => collectBufferRepairOptionsFromIssue(issue), [issue]);
  const [loaded, setLoaded] = useState<FeasibilityRepairOptionDto[]>([]);
  const [loading, setLoading] = useState(false);

  const options = embedded.length > 0 ? embedded : loaded;

  const loadOptions = useCallback(async (): Promise<FeasibilityRepairOptionDto[]> => {
    if (embedded.length > 0) return embedded;
    setLoading(true);
    try {
      const res = await getRepairOptions(tripId, issue.id);
      const filtered = filterFeasibilityRepairOptionsForTrip(res.options, trip ?? null, issue);
      const bufferOpts = dedupeBufferRepairOptions(pickBufferRepairOptions(filtered));
      const sorted = sortBufferRepairOptions(bufferOpts);
      setLoaded(sorted);
      return sorted;
    } catch (e) {
      const message = e instanceof Error ? e.message : '加载修复方案失败';
      toast.error(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [tripId, issue, trip, embedded]);

  const applyOption = useCallback(
    async (option: FeasibilityRepairOptionDto, onApplied?: () => void | Promise<void>) => {
      setLoading(true);
      try {
        await applyFeasibilityRepairOption(tripId, issue, option);
        if (shouldRefreshScheduleAfterBufferRepair(option)) {
          window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
        }
        toast.success(applySuccessMessage(option));
        await onApplied?.();
      } catch (e) {
        toast.error(formatFeasibilityRepairApplyError(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [tripId, issue],
  );

  const applyQuickAction = useCallback(
    async (
      key: (typeof BUFFER_REPAIR_QUICK_ACTIONS)[number]['key'],
      onApplied?: () => void | Promise<void>,
    ) => {
      let opts = options;
      if (opts.length === 0) {
        opts = await loadOptions();
      }
      const quick = BUFFER_REPAIR_QUICK_ACTIONS.find((a) => a.key === key);
      if (!quick) return;

      let matched: FeasibilityRepairOptionDto | undefined;
      if (quick.key === 'insert-buffer-day') {
        matched = findInsertBufferDayOption(opts) ?? buildSyntheticInsertBufferDayOption(issue);
      } else if ('minutes' in quick) {
        matched = findBufferOptionByMinutes(opts, quick.minutes);
      } else if (quick.actionType === 'shift_departure') {
        matched = findShiftDepartureOption(opts);
      }

      if (!matched) {
        toast.error('后端尚未提供该修复方案，请稍后在可执行证明中查看或手动改时间轴');
        return;
      }
      await applyOption(matched, onApplied);
    },
    [options, loadOptions, applyOption, issue],
  );

  return {
    options,
    loading,
    loadOptions,
    applyOption,
    applyQuickAction,
  };
}
