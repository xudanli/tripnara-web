/**
 * Hooks 导出
 */

// 移动端检测
export { useMobile, useIsMobile } from './use-mobile';

// 认证
export { useAuth } from './useAuth';

// 行程相关
export { useTrips } from './useTrips';
export { usePlaces } from './usePlaces';

// 审批
export { useApproval } from './useApproval';

// 用户偏好
export { useUserPreferences } from './useUserPreferences';

// 引导
export { useOnboarding } from './useOnboarding';

// 系统状态
export { useSystemStatus } from './useSystemStatus';

// 防抖
export { useDebounce } from './useDebounce';

// 智能体助手
export { usePlanningAssistant } from './usePlanningAssistant';
export type { 
  PlanningMessage, 
  UsePlanningAssistantReturn 
} from './usePlanningAssistant';

export { useJourneyAssistant } from './useJourneyAssistant';
export type { 
  JourneyMessage, 
  UseJourneyAssistantConfig, 
  UseJourneyAssistantReturn 
} from './useJourneyAssistant';

// Context API
export { useContextApi, useContextMetrics } from './useContextApi';
export type { 
  UseContextApiReturn, 
  UseContextMetricsReturn 
} from './useContextApi';

// RAG API
export { useRag } from './useRag';
export type { UseRagReturn } from './useRag';

// 行程项校验
export { useItineraryValidation } from './useItineraryValidation';
export type { UseItineraryValidationReturn } from './useItineraryValidation';
export { formatValidationError, getValidationSuggestionsSummary } from './useItineraryValidation';

// 行程项费用管理
export { useItineraryCost } from './useItineraryCost';
export type { UseItineraryCostReturn } from './useItineraryCost';
export { getDefaultCostCategory, formatCost, formatCostCategory } from './useItineraryCost';

// 冰岛信息源
export { useIcelandInfo, useIsIcelandTrip } from './useIcelandInfo';
export type { UseIcelandInfoReturn } from './useIcelandInfo';

// 路线模板
export { useRouteTemplates, useRouteTemplate } from './useRouteTemplates';
export type { UseRouteTemplatesReturn, UseRouteTemplateReturn } from './useRouteTemplates';

// 证据状态和自动获取
export { useEvidenceStatus } from './useEvidenceStatus';
export type { UseEvidenceStatusReturn, EvidenceStatus } from './useEvidenceStatus';
export { useAutoFetchEvidence } from './useAutoFetchEvidence';
export type { UseAutoFetchEvidenceReturn, UseAutoFetchEvidenceOptions } from './useAutoFetchEvidence';

// 行程权限
export { useTripPermissions } from './useTripPermissions';
export type { UseTripPermissionsReturn } from './useTripPermissions';
