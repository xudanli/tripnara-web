import type {
  ContextSnapshotMember,
  TeamGovernanceRule,
} from '@/api/automation-authorization.types';
import type { TripContextSnapshot } from '@/api/travel-status.types';
import type { TripConstraintsContract } from '@/types/trip-constraints';

export interface AutomationConfirmMember {
  id: string;
  label: string;
  role?: string;
  avatarUrl?: string;
}

const GOVERNANCE_RULE_LABELS: Record<string, string> = {
  UNANIMOUS: '全员一致',
  PAYER_CONFIRM: '付款人确认',
  MAJORITY: '多数决',
  LEADER_ONLY: '领队决定',
};

export function governanceRuleLabel(rule?: string): string {
  if (!rule) return '需确认';
  return GOVERNANCE_RULE_LABELS[rule] ?? rule;
}

export function resolveSnapshotMembers(
  snapshot?: TripContextSnapshot | null,
): ContextSnapshotMember[] {
  const travelers = snapshot?.members?.travelers ?? [];
  return travelers.filter(Boolean);
}

export function resolveTeamGovernanceRules(
  contract?: TripConstraintsContract | null,
  snapshot?: TripContextSnapshot | null,
): TeamGovernanceRule[] {
  const contractRules = contract?.teamGovernance?.rules ?? [];
  const snapshotRules = snapshot?.contract?.teamGovernance?.rules ?? [];

  const merged = [...contractRules, ...snapshotRules];
  const seen = new Set<string>();

  return merged
    .map((row) => {
      const topic = row.topic ?? row.label ?? '团队决策';
      const rule = (row as TeamGovernanceRule).rule;
      const thresholdPct = (row as TeamGovernanceRule).thresholdPct;
      return {
        topic,
        rule,
        thresholdPct,
        label: row.label,
        description: row.description ?? row.label,
      };
    })
    .filter((row) => {
      const key = `${row.topic}:${row.rule ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function resolveAutomationConfirmMembers(
  snapshot?: TripContextSnapshot | null,
  contract?: TripConstraintsContract | null,
): AutomationConfirmMember[] {
  const travelers = resolveSnapshotMembers(snapshot);
  if (travelers.length > 0) {
    return travelers.map((member, index) => ({
      id: member.id ?? `member-${index}`,
      label: member.displayName ?? member.name ?? `成员 ${index + 1}`,
      role: member.role,
      avatarUrl: member.avatarUrl,
    }));
  }

  const governanceMembers = contract?.teamGovernance?.members ?? [];
  if (governanceMembers.length > 0) {
    return governanceMembers.map((member) => ({
      id: member.id,
      label: member.name ?? member.id,
      role: member.role,
    }));
  }

  return [];
}

export function formatGovernanceRuleSummary(rule: TeamGovernanceRule): string {
  const topic = rule.topic ?? rule.label ?? '决策项';
  const mode = governanceRuleLabel(rule.rule);
  if (rule.thresholdPct != null) {
    return `${topic} · ${mode}（阈值 ${rule.thresholdPct}%）`;
  }
  return `${topic} · ${mode}`;
}
