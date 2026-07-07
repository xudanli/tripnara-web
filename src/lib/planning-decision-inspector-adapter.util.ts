import type {
  PlanningDecisionInspectorFeasibility,
  PlanningDecisionInspectorMemberConsensus,
  PlanningDecisionInspectorPlanDiff,
  PlanningDecisionInspectorPlanDiffRow,
} from '@/dto/frontend-planning-decision-inspector.types';
import type {
  FeasibilityTabView,
  MemberConsensusItemView,
  MembersConsensusTabView,
} from '@/lib/fixtures/decision-space-checker-tabs.fixtures';
import type { PlanDiffDeltaTone, PlanDiffImpactTagTone, PlanDiffView } from '@/lib/decision-space-plan-diff-view.util';
import {
  buildPlanDiffTimelineTracks,
  normalizePlanDiffTimelineMilestones,
  planDiffTimelineMilestonesFromChangeRows,
} from '@/lib/decision-space-plan-diff-view.util';

function isBufferRowLabel(label: string): boolean {
  return /交通缓冲/.test(label);
}

function rowDeltaTone(row: PlanningDecisionInspectorPlanDiffRow): PlanDiffDeltaTone {
  if (isBufferRowLabel(row.itemLabel)) return 'buffer';
  if (row.deltaMinutes == null || row.deltaMinutes === 0) return 'neutral';
  return row.deltaMinutes < 0 ? 'good' : 'bad';
}

function mapImpactTagTone(tone: string | undefined): PlanDiffImpactTagTone {
  const normalized = String(tone ?? 'muted').trim().toLowerCase();
  if (normalized === 'good' || normalized === 'caution' || normalized === 'risk') {
    return normalized;
  }
  if (normalized === 'neutral') return 'neutral';
  return 'muted';
}

export function planDiffViewFromInspector(
  planDiff: PlanningDecisionInspectorPlanDiff,
  fallbackLetter = 'A',
): PlanDiffView {
  const optionBadge = planDiff.optionBadge?.trim();
  const optionLetter =
    optionBadge?.replace(/^方案\s*/i, '').trim() || fallbackLetter;

  const timelineMilestones =
    planDiff.timelineCompare?.milestones?.map((milestone) => ({
      id: milestone.id,
      label: milestone.label,
      originalTime: milestone.originalTime,
      newTime: milestone.newTime,
      deltaMinutes: milestone.deltaMinutes,
      durationAfterMinutes: milestone.durationAfterMinutes,
      originalDurationAfterMinutes: milestone.originalDurationAfterMinutes,
    })) ?? [];

  const normalizedTimelineMilestones = normalizePlanDiffTimelineMilestones(timelineMilestones);
  const resolvedTimelineMilestones =
    normalizedTimelineMilestones.length > 0
      ? normalizedTimelineMilestones
      : planDiffTimelineMilestonesFromChangeRows(planDiff.changeRows);

  return {
    optionLetter,
    optionBadge,
    optionTitle: planDiff.optionTitle,
    changes: planDiff.changeRows.map((row) => ({
      id: row.id,
      label: row.itemLabel,
      before: row.before,
      after: row.after,
      delta: row.deltaLabel,
      deltaTone: rowDeltaTone(row),
    })),
    scopeChips: planDiff.impactTags.map((tag) => ({
      id: tag.id,
      label: tag.label,
      tone: mapImpactTagTone(tag.tone),
    })),
    unchangedItems: planDiff.unchangedItems,
    timelines: buildPlanDiffTimelineTracks(resolvedTimelineMilestones, optionLetter),
    summaryLine: planDiff.timelineCompare?.bannerText ?? planDiff.timelineCompare?.summary,
    isEmpty: planDiff.changeRows.length === 0,
    isDemo: false,
  };
}

function mapMemberStance(
  stance: string,
): MemberConsensusItemView['stance'] {
  if (stance === 'objection' || stance === 'concern') return 'concern';
  if (stance === 'support') return 'support';
  return 'neutral';
}

function stanceLabel(stance: MemberConsensusItemView['stance']): string {
  if (stance === 'support') return '支持';
  if (stance === 'concern') return '有异议';
  return '未回复';
}

function execSummaryId(icon?: string, label?: string, index = 0): string {
  const key = `${icon ?? ''} ${label ?? ''}`.toLowerCase();
  if (key.includes('clock') || key.includes('时间')) return 'time';
  if (key.includes('route') || key.includes('路线') || key.includes('路段')) return 'route';
  if (key.includes('user') || key.includes('成员') || key.includes('通知')) return 'notify';
  return `exec_${index}`;
}

function parseValidUntilLabel(message?: string): string | undefined {
  if (!message) return undefined;
  const match = message.match(/至\s*(.+)$/);
  return match?.[1]?.trim() ?? message;
}

export function membersConsensusViewFromInspector(
  consensus: PlanningDecisionInspectorMemberConsensus,
  optionLetter = 'A',
): MembersConsensusTabView {
  const members: MemberConsensusItemView[] = consensus.opinions.map((op) => {
    const stance = mapMemberStance(op.stance);
    return {
      id: op.id,
      name: op.displayName,
      stance,
      stanceLabel: stanceLabel(stance),
      summary: op.comment?.trim() || '暂无补充说明',
    };
  });

  const totalCount =
    consensus.supportCount != null ||
    consensus.objectionCount != null ||
    consensus.pendingCount != null
      ? (consensus.supportCount ?? 0) +
        (consensus.objectionCount ?? 0) +
        (consensus.pendingCount ?? 0)
      : members.length;

  return {
    optionLetter,
    consensusLabel: consensus.assessment?.statusMessage?.trim() || '成员共识',
    consensusSummary:
      consensus.summaryBar?.trim() ||
      `共 ${totalCount} 位成员；${consensus.supportCount ?? 0} 人支持。`,
    supportCount: consensus.supportCount ?? members.filter((m) => m.stance === 'support').length,
    totalCount: totalCount || members.length,
    members,
    aiNote: consensus.aiSummary.length ? consensus.aiSummary.join(' ') : undefined,
    isDemo: false,
  };
}

export function feasibilityViewFromInspector(
  feasibility: PlanningDecisionInspectorFeasibility,
  fallbackLetter = 'A',
  fallbackTitle?: string,
): FeasibilityTabView {
  const optionLetter =
    feasibility.optionBadge?.replace(/^方案\s*/i, '').trim() || fallbackLetter;

  return {
    optionLetter,
    optionTitle: feasibility.optionTitle ?? fallbackTitle ?? '当前方案',
    canWrite: feasibility.canSafelyWrite,
    headline: feasibility.headline,
    gateChecks: feasibility.gateChecks.map((check) => ({
      id: check.id,
      label: check.label,
      status:
        check.status === 'fail'
          ? 'fail'
          : check.status === 'warn' || check.status === 'caution'
            ? 'warn'
            : 'pass',
    })),
    validUntilLabel: parseValidUntilLabel(feasibility.validityWarning?.message),
    validityHint: feasibility.validityWarning?.retriggerCondition,
    executionSummary: feasibility.executionSummary.map((item, index) => ({
      id: execSummaryId(item.icon, item.label, index),
      label: item.label,
      value: item.value,
    })),
    finalConclusion:
      feasibility.verdict?.message?.trim() ||
      (feasibility.canSafelyWrite ? '最终结论：可执行' : '最终结论：需确认'),
    finalSubtext:
      feasibility.verdict?.subtext?.trim() ||
      feasibility.headline?.trim() ||
      (feasibility.canSafelyWrite
        ? '风险可控，满足所有约束与门禁条件。'
        : '仍有未满足的门禁条件。'),
    isDemo: false,
  };
}

export { isBufferRowLabel, rowDeltaTone };
