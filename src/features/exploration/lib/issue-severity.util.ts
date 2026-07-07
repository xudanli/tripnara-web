import type { ConsumerIssueView } from '../api/types';

const SEVERITY_LABELS: Record<ConsumerIssueView['severity'], string> = {
  BLOCK: '必须处理',
  CONFLICT: '需要确认',
  VERIFY: '待核实',
  OPTIMIZE: '可优化',
};

export function issueSeverityLabel(severity: ConsumerIssueView['severity']): string {
  return SEVERITY_LABELS[severity] ?? severity;
}

export function isVehicleRelatedIssue(issue: ConsumerIssueView): boolean {
  const blob = [
    issue.headline,
    issue.explanation,
    issue.affectedSegmentLabel,
    issue.source.canonicalIssueId,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /车辆|vehicle|f208|f-?路|四驱|2wd|4wd|suv/i.test(blob);
}

export function issueRequiresDecision(issue: ConsumerIssueView | undefined): boolean {
  if (!issue) return false;
  return issue.decisionRequired === true || issue.severity === 'BLOCK' || issue.severity === 'CONFLICT';
}
