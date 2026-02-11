/**
 * 优化系统组件导出
 * 
 * @module components/optimization
 */

// 计划评估
export { 
  PlanEvaluationCard,
  DIMENSION_CONFIG,
  UtilityBadge,
  DimensionRow,
  ComparisonIndicator,
} from './PlanEvaluationCard';
export type { PlanEvaluationCardProps } from './PlanEvaluationCard';

// 团队管理
export {
  TeamManagementPanel,
  MemberCard,
  TeamConstraintsDisplay,
  WeightsDistribution,
  AddMemberDialog,
} from './TeamManagementPanel';
export type { TeamManagementPanelProps } from './TeamManagementPanel';

// 实时状态
export {
  RealtimeStatusBanner,
  WeatherBlock,
  RoadStatusBlock,
  HumanStateBlock,
} from './RealtimeStatusBanner';
export type { RealtimeStatusBannerProps } from './RealtimeStatusBanner';

// 协商结果
export {
  NegotiationResultCard,
  DecisionBadge,
  ConsensusIndicator,
  VotingResult,
  GuardianEvaluation,
  TradeoffsList,
  DECISION_CONFIG,
  GUARDIAN_CONFIG,
} from './NegotiationResultCard';
export type { NegotiationResultCardProps } from './NegotiationResultCard';

// 优化仪表盘（整合组件）
export { OptimizationDashboard } from './OptimizationDashboard';
export type { OptimizationDashboardProps } from './OptimizationDashboard';

// 风险评估
export {
  RiskAssessmentCard,
  MetricCard,
  ConfidenceIntervalBar,
  RiskFactorsList,
  RiskGauge,
  RISK_LEVEL_CONFIG,
  getRiskLevel,
} from './RiskAssessmentCard';
export type { RiskAssessmentCardProps } from './RiskAssessmentCard';

// 计划对比
export {
  PlanComparisonView,
  DifferenceIndicator,
  WinnerBadge,
  DimensionComparisonRow,
  TotalScoreComparison,
  DimensionBarChart,
  DIMENSION_LABELS,
} from './PlanComparisonView';
export type { PlanComparisonViewProps } from './PlanComparisonView';

// 反馈表单
export {
  FeedbackForm,
  StarRating,
  FatigueSlider,
  CompletionProgress,
  FEEDBACK_TYPE_CONFIG,
  MODIFICATION_TYPE_CONFIG,
} from './FeedbackForm';
export type { FeedbackFormProps } from './FeedbackForm';

// 实地报告
export {
  FieldReportForm,
  ConfidenceSelector,
  LocationInput,
  SymptomSelector,
  REPORT_TYPE_CONFIG,
  WEATHER_CONDITIONS,
  ROAD_CONDITIONS,
  HAZARD_TYPES,
} from './FieldReportForm';
export type { FieldReportFormProps } from './FieldReportForm';
