/**
 * Plan Studio：Decision Cockpit 与 SolutionMatrix / Strip compare 的展示互斥（M2）。
 * 专家审计仍可通过 ?decisionCockpit=1 深链打开。
 */
export function shouldShowPlanStudioDecisionCockpit(input: {
  hasCockpitUi: boolean;
  showDecisionCockpitDeepLink: boolean;
  hasSolutionMatrix: boolean;
  hasCompareSummary: boolean;
  hasRelaxationBar: boolean;
}): boolean {
  if (!input.hasCockpitUi) return false;
  if (input.showDecisionCockpitDeepLink) return true;
  if (input.hasSolutionMatrix || input.hasCompareSummary || input.hasRelaxationBar) {
    return false;
  }
  return true;
}

/** Cockpit 内与 SolutionMatrix 重叠的反事实区块 */
export function shouldHideDecisionCockpitCounterfactuals(input: {
  hasSolutionMatrix: boolean;
  hasCompareSummary: boolean;
}): boolean {
  return input.hasSolutionMatrix || input.hasCompareSummary;
}
