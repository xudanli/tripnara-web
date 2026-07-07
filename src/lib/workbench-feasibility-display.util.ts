/** 工作台顶栏可行度评分等级文案 */
export function resolveWorkbenchFeasibilityGrade(score: number): {
  label: string;
  tone: 'good' | 'fair' | 'poor';
} {
  if (score >= 80) return { label: '良好', tone: 'good' };
  if (score >= 60) return { label: '尚可', tone: 'fair' };
  return { label: '待改善', tone: 'poor' };
}

export function workbenchFeasibilityRingColor(tone: 'good' | 'fair' | 'poor'): string {
  switch (tone) {
    case 'good':
      return 'stroke-gate-allow-foreground';
    case 'fair':
      return 'stroke-gate-confirm-foreground';
    default:
      return 'stroke-gate-reject-foreground';
  }
}

export function workbenchFeasibilityGradeClass(tone: 'good' | 'fair' | 'poor'): string {
  switch (tone) {
    case 'good':
      return 'text-success';
    case 'fair':
      return 'text-warning';
    default:
      return 'text-error';
  }
}
