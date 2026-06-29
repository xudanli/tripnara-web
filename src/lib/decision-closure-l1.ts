/**
 * 决策闭环 L1/L2 展示逻辑（与后端 `decision-closure-l1.util.ts` SSOT 对齐）。
 * @see docs/frontend-decision-closure-integration.md
 */

export {
  formatRejectedPlanStatus,
  formatScorePct,
  formatWorldConstraintBannerZh,
  hasAlternativesRows,
  hasDecisionVerdictCard,
  hasOptimizationDecisionUi,
  hasRejectedPlansRows,
  panelHasDecisionClosureContent,
  pickOptimizationExplain,
  resolveChosenAlternativeId,
  roadBannerText,
  shouldShowRoadBanner,
  sortAlternativesForDisplay,
} from '@/lib/route-run-optimization-explain';
