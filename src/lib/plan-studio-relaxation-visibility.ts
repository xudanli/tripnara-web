/**
 * Plan Studio 主区松弛条：助手侧栏展开时由 Agent 气泡承载，避免重复展示。
 */
export function shouldShowPlanStudioRelaxationBar(
  visible: boolean,
  assistantExpanded: boolean,
): boolean {
  if (!visible) return false;
  if (assistantExpanded) return false;
  return true;
}
