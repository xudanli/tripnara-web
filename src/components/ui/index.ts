/**
 * UI 组件统一导出
 * 方便导入使用
 */

// 风险评分相关
export { RiskScoreDisplay, RiskScoreBadge } from './risk-score-display';
export type { RiskScoreDisplayProps, RiskDimension } from './risk-score-display';

// 数据卡片
export { DataCard } from './data-card';
export type { DataCardProps } from './data-card';

// 决策漏斗
export { DecisionFunnel } from './decision-funnel';
export type { DecisionFunnelProps, DecisionOption, DecisionStage } from './decision-funnel';

// 风险评分工具函数
export {
  getRiskScoreLevel,
  getRiskScoreConfig,
  getRiskScoreColorClasses,
  getRiskScoreBgClass,
  getRiskScoreTextClass,
  getRiskScoreBorderClass,
  formatRiskScore,
  getRiskScoreMeaning,
  RISK_SCORE_CONFIGS,
} from '@/lib/risk-score';
export type { RiskScoreLevel } from '@/lib/risk-score';

// 排版系统工具函数
export {
  typography,
  getHeadingClass,
  getBodyClass,
  getCaptionClass,
  getSuggestedLineHeight,
} from '@/lib/typography';
