import type { DecisionAction } from '@/types/unified-decision';
import type { ItineraryDiffEntry } from '@/types/feasibility-repair';
import type { DecisionMemberImpact } from '@/types/decision-problem';

/** 写回前摘要：将修改 N 个时间点… */
export function buildDecisionWriteSummary(input: {
  itineraryDiff?: ItineraryDiffEntry[];
  mutationLines?: string[];
  memberImpacts?: DecisionMemberImpact[];
  action?: DecisionAction | null;
}): string {
  const diff = input.itineraryDiff ?? [];
  const timeChanges = diff.filter((row) => row.changeType === 'time_changed').length;
  const routeRecalcs =
    diff.filter((row) => row.changeType === 'title_changed' || row.changeType === 'time_changed')
      .length || input.mutationLines?.length || 0;
  const affectedMembers = new Set(
    (input.memberImpacts ?? [])
      .map((impact) => impact.memberId ?? impact.memberName)
      .filter(Boolean),
  ).size;

  const parts: string[] = [];
  if (timeChanges > 0) {
    parts.push(`修改 ${timeChanges} 个时间点`);
  } else if (diff.length > 0) {
    parts.push(`调整 ${diff.length} 项行程`);
  }
  if (routeRecalcs > 0) {
    parts.push(`重新计算 ${Math.min(routeRecalcs, 4)} 段路线`);
  }
  if (affectedMembers > 0) {
    parts.push(`通知 ${affectedMembers} 位受影响成员`);
  }

  if (parts.length === 0) {
    const impact = input.action?.expectedImpact?.trim();
    if (impact) return impact;
    return '将按所选方案更新行程并重新检查冲突';
  }

  return `将${parts.join('，')}`;
}

/** 底栏主 CTA：应用方案 A · 更新第 N 天行程 */
export function buildDecisionApplyCtaLabel(input: {
  action?: DecisionAction | null;
  optionLetter?: string;
  dayLabel?: string | null;
}): string {
  const letter = input.optionLetter?.trim() || 'A';
  const title = input.action?.title?.trim() || input.action?.label?.trim();
  const shortTitle = title && title.length <= 18 ? title : null;
  const dayPart = input.dayLabel?.trim();

  if (shortTitle && dayPart) {
    return `应用方案 ${letter} · ${shortTitle}（${dayPart}）`;
  }
  if (dayPart) {
    return `应用方案 ${letter} · 更新${dayPart}行程`;
  }
  if (shortTitle) {
    return `应用方案 ${letter} · ${shortTitle}`;
  }
  return `应用方案 ${letter} · 更新行程`;
}
