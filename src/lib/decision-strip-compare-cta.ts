import type { DecisionStripCtaType } from '@/lib/decision-strip-model';

export interface CompareStripSelection {
  optionId: string;
  label: string;
  isRecommended: boolean;
}

/**
 * Strip 主 CTA 与方案矩阵选中列联动（M2）。
 * 保持 CTA 类型为 open_plan_gate，仅覆盖文案。
 */
export function resolveCompareStripCtaLabel(
  ctaType: DecisionStripCtaType,
  selection: CompareStripSelection | null | undefined,
): string | undefined {
  if (ctaType !== 'open_plan_gate' || !selection) return undefined;
  if (selection.isRecommended) return '采用推荐方案';
  return `采用${selection.label}`;
}
