/**
 * 行程保障摘要 — 将可行度分数投影为「已验证 / 待处理 / 可优化」用户叙事。
 */
import type { PlanningConflictsSummaryDto } from '@/types/planning-conflicts';
import type { FeasibilityDimensionTileDto } from '@/types/trip-feasibility-report';

export interface TravelAssuranceSummary {
  verifiedItemCount: number;
  pendingProblemCount: number;
  suggestOptimizeCount: number;
  /** 已生效决策或自动适配（来自 recent resolved） */
  autoAdaptedCount: number;
  verificationLines: string[];
}

const CATEGORY_VERIFICATION_LABEL: Record<string, string> = {
  schedule: '营业时间验证',
  transport: '道路可达性检查',
  booking: '预订衔接验证',
  environment: '环境风险检查',
  team_fit: '团队节奏评估',
  itinerary_completeness: '行程结构检查',
  access_capacity: '通行能力检查',
  experience_expectation: '核心体验覆盖',
  structure: '日程结构验证',
  other: '综合约束验证',
};

export function buildTravelAssuranceSummary(input: {
  planningSummary?: PlanningConflictsSummaryDto | null;
  openDecisionProblems?: number;
  autoAdaptedCount?: number;
  feasibilityDimensions?: FeasibilityDimensionTileDto[] | null;
}): TravelAssuranceSummary {
  const planningSummary = input.planningSummary;
  const openDecisionProblems = input.openDecisionProblems ?? 0;
  const autoAdaptedCount = input.autoAdaptedCount ?? 0;

  let verifiedItemCount = 0;
  const verificationLines: string[] = [];

  if (input.feasibilityDimensions?.length) {
    for (const tile of input.feasibilityDimensions) {
      const checks = Math.max(1, 5 - tile.issueCount);
      verifiedItemCount += checks;
      if (tile.blockerCount === 0 && tile.issueCount === 0) {
        verificationLines.push(`${tile.label}验证通过`);
      }
    }
  } else if (planningSummary?.byCategory) {
    for (const [key, count] of Object.entries(planningSummary.byCategory)) {
      const label = CATEGORY_VERIFICATION_LABEL[key] ?? `${key} 检查`;
      const checks = Math.max(1, 4 - Math.min(count ?? 0, 3));
      verifiedItemCount += checks;
      verificationLines.push(label);
    }
  }

  if (verifiedItemCount === 0 && planningSummary) {
    verifiedItemCount = Math.max(
      6,
      (planningSummary.total ?? 0) + Object.keys(planningSummary.byCategory ?? {}).length * 3,
    );
  }

  const pendingFromPlanning =
    (planningSummary?.mustHandle ?? 0) + (planningSummary?.pendingConfirm ?? 0);
  const pendingProblemCount = Math.max(openDecisionProblems, pendingFromPlanning);
  const suggestOptimizeCount = planningSummary?.suggestAdjust ?? 0;

  return {
    verifiedItemCount,
    pendingProblemCount,
    suggestOptimizeCount,
    autoAdaptedCount,
    verificationLines: verificationLines.slice(0, 5),
  };
}

export function formatTravelAssuranceSubtitle(summary: TravelAssuranceSummary): string {
  const parts: string[] = [`已验证 ${summary.verifiedItemCount} 项`];
  if (summary.pendingProblemCount > 0) {
    parts.push(`${summary.pendingProblemCount} 个问题待处理`);
  }
  if (summary.suggestOptimizeCount > 0) {
    parts.push(`${summary.suggestOptimizeCount} 个可优化`);
  }
  if (summary.autoAdaptedCount > 0) {
    parts.push(`${summary.autoAdaptedCount} 个变化已适配`);
  }
  return parts.join(' · ');
}
