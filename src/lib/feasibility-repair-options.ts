import type { FeasibilityRepairOptionDto } from '@/types/trip-feasibility-report';
import { isSyntheticPlanBRepairOption } from '@/lib/feasibility-proof-plan-b';

/** preview/apply 报错：选项不属于当前阻塞项 repair-options */
export function parseInvalidRepairOptionFromError(message: string): string | null {
  const match = message.match(/选项\s+(\S+)\s+不属于/);
  return match?.[1] ?? null;
}

export function isRepairOptionNotInBlockerListError(message: string): boolean {
  return /不属于阻塞项|不属于.*修复列表/.test(message);
}

/**
 * repair-options API 成功返回后，只展示权威列表。
 * 报告内嵌 / Plan B 种子项仅作 API 空响应时的占位，避免 preview 400。
 */
export function mergeAuthoritativeRepairOptions(
  apiOptions: FeasibilityRepairOptionDto[],
  seedOptions: FeasibilityRepairOptionDto[] = [],
): FeasibilityRepairOptionDto[] {
  if (apiOptions.length > 0) {
    return apiOptions.filter(
      (option, index, arr) => arr.findIndex((o) => o.id === option.id) === index,
    );
  }

  return seedOptions.filter(
    (option, index, arr) =>
      arr.findIndex((o) => o.id === option.id) === index &&
      !isSyntheticPlanBRepairOption(option),
  );
}

export function partitionRepairOptionsForWorkflow(
  apiOptions: FeasibilityRepairOptionDto[],
  seedOptions: FeasibilityRepairOptionDto[] = [],
): {
  interactive: FeasibilityRepairOptionDto[];
  guidanceOnly: FeasibilityRepairOptionDto[];
} {
  const interactive = mergeAuthoritativeRepairOptions(apiOptions, seedOptions);
  if (apiOptions.length > 0) {
    const interactiveIds = new Set(interactive.map((option) => option.id));
    const guidanceOnly = seedOptions.filter(
      (option) =>
        !interactiveIds.has(option.id) &&
        (isSyntheticPlanBRepairOption(option) ||
          Boolean(option.description?.trim()) ||
          Boolean(option.label?.trim())),
    );
    return { interactive, guidanceOnly };
  }

  const guidanceOnly = seedOptions.filter((option) => isSyntheticPlanBRepairOption(option));
  return { interactive, guidanceOnly };
}
