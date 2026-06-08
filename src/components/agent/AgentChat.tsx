import { useState, useRef, useEffect, useMemo, useCallback, useContext } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  agentApi,
  getRouteRunOrchestrationModeFinal,
  isRouteRunCacheReplay,
  type RouteAndRunRequest,
  type RouteAndRunResponse,
  type RouteType,
  type UIStatus,
  type LLMProvider,
  type EntryPoint,
  type DecisionLogEntry,
  type OrchestrationUiState,
  type OrchestrationResult,
  type LogDecisionEvent,
  type ConstraintsMetaResponse,
  type TransportModeMeta,
  type StructuredTravelInput,
  type SuggestedOperation,
  type ActionExecutionPreviewPayload,
  type RouteRunPersonaHint,
  type RouteRunSimplifiedExplanation,
  type RouteRunAsyncTaskStatusResponse,
} from '@/api/agent';
import { resolveRouteAndRunDisplayStatus, shouldShowRouteRunThinking } from '@/lib/handleRouteAndRunResponse';
import { formatRouteRunAsyncProgressLabel } from '@/lib/route-run-async';
import { invokeRouteAndRun } from '@/lib/executeRouteAndRun';
import { usePlanningTaskStore } from '@/store/planningTaskStore';
import {
  looksLikeCarRentalSearchRequest,
  looksLikeFlightSearchRequest,
  looksLikeHotelSearchRequest,
  looksLikeTripContextDataLookup,
  looksLikeTripPlanningRequest,
} from '@/lib/route-run-intent-heuristics';
import * as tripsApiModule from '@/api/trips';
import { postAgentActionPreview } from '@/api/agent-action-preview';
import {
  pickActionExecutionPreviewFromPayload,
  pickActionExecutionFromPayload,
  applyHealedInputToOrchestrationActionPlan,
  buildAgentPreviewActionsFromOrchestration,
  newAgentPreviewRequestId,
  extractActionExecutionPreviewFromAgentPreviewResponse,
} from '@/lib/route-run-action-execution';
import {
  pickRouteRunExplainGuardianMirror,
  compactRouteRunPersonaHint,
  type RouteRunExplainGuardianMirror,
} from '@/lib/route-run-guardian-gate';
import {
  pickSimplifiedExplanationFromExplain,
  readNoPoiPlanningFromPayload,
} from '@/lib/route-run-contract-extract';
import { logRouteRunDevSelfCheck } from '@/lib/route-run-self-check-debug';
import {
  ActionExecutionPreviewPanel,
  type AdoptHealingPreviewHandler,
} from '@/components/agent/ActionExecutionPreviewPanel';
import type { TripInsightResponse, TripInsightFinding } from '@/api/trips';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  AgentIntentModePicker,
  type UserExplicitIntentMode,
} from '@/components/agent/AgentIntentModePicker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Send, Bot, User, ChevronRight, CheckCircle2, XCircle, Loader2, MapPin, Utensils, Search, Calendar, RotateCw, Compass, Target, Lightbulb, ClipboardCheck, Clock, Route, AlertTriangle, Check, Info, type LucideIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import {
  extractKbRagCitationCount,
  extractRagSources,
  inferInteractionKind,
  shouldHidePlanningChrome,
  type InteractionKind,
} from '@/lib/agent-intent-ui';
import {
  extractKbRagHitFromTrace,
  formatDebugJsonSnippet,
  pickRawDecisionLogFromRouteRun,
  resolveRoutingTaskType,
} from '@/lib/unified-execution-trace';
import { EvidenceRefsReadable } from '@/lib/evidence-refs-readability';
import {
  OntologyDecisionStepExtras,
  extractOntologyEvidenceDisplayZh,
  extractReadinessEvidenceDisplayZh,
  extractReadinessTechnicalEvidenceRefs,
} from '@/lib/ontology-decision-display';
import {
  HallucinationDecisionLogExtras,
  isHallucinationDetectionDecisionLog,
} from '@/components/agent/HallucinationDecisionLogExtras';
import {
  extractRagStructuredOutcome,
  assistantBodyAfterStructuredOutcome,
  type RagStructuredOutcome,
} from '@/lib/rag-structured-answer';
import { looksLikeMarkdown } from '@/lib/markdown-detect';
import { extractHotelsFromAgentPayload } from '@/lib/agent-hotel-payload';
import {
  extractCarRentalsFromAgentPayload,
  extractCarRentalSearchMetaFromAgentPayload,
  isLiveSensorCarRentalSucceeded,
} from '@/lib/agent-car-rental-payload';
import {
  extractAccommodationsFromRouteRunSuccess,
  extractHotelSearchDisclaimerZh,
} from '@/lib/agent-accommodation-payload';
import { extractPoiSuppressAnswerProse, type AgentPoiDayBlock } from '@/lib/agent-poi-payload';
import { parseConsultationDashboard } from '@/lib/consultation-dashboard';
import type { ConsultationDashboardPayload } from '@/types/consultation-dashboard';
import { ConsultationDashboard } from '@/components/agent/ConsultationDashboard';
import { buildLiveSensorAuditHint } from '@/lib/live-sensor-audit-hint';
import { PoiCardsByDayPanel } from '@/components/agent/PoiCardsByDayPanel';
import {
  SafetySmartUpdateStrip,
  hasOrchestrationItineraryDays,
} from '@/components/agent/OrchestrationItineraryPreview';
import { DegradedItineraryPreview } from '@/components/planning/DegradedItineraryPreview';
import type { ItineraryDayItemsBlock } from '@/lib/agent-itinerary-item-display';
import {
  buildRouteRunPayloadDisplayBundle,
  maybeToastWorkbenchDrift,
} from '@/lib/route-run-payload-display';
import {
  safetySurfaceHasRenderableSurface,
  type SafetySurfacePayloadV1,
} from '@/lib/safety-surface-payload';
import { sanitizeRouteRunAnswerTextForDisplay } from '@/lib/route-run-answer-text-display';
import {
  extractFlightInventorySnapshotFromRouteRun,
  type FlightInventorySnapshot,
} from '@/lib/agent-flight-inventory-payload';
import { FlightInventorySnapshotPanel } from '@/components/agent/FlightInventorySnapshotPanel';
import type { Accommodation, Hotel } from '@/api/planning-assistant-v2/types';
import { AccommodationList } from '@/components/planning-assistant-v2/AccommodationList';
import { HotelList } from '@/components/planning-assistant-v2/HotelList';
import { CarRentalList, type CarRentalItem } from '@/components/planning-assistant-v2/CarRentalList';
import { IntentActionChips, type IntentActionChipItem } from '@/components/agent/IntentActionChips';
import { RagStructuredOutcomeCard } from '@/components/agent/RagStructuredOutcomeCard';
import { HotelSearchPreflightCard } from '@/components/agent/HotelSearchPreflightCard';
import ApprovalDialog from '@/components/trips/ApprovalDialog';
import { OrchestrationProgressCard } from '@/components/planning-assistant-v2/OrchestrationProgressCard';
import { toast } from 'sonner';
import { PlannerThinkingLoading } from '@/components/common/PlannerThinkingLoading';
import { CONFIG } from '@/constants/config';
import { needsApproval, extractApprovalId } from '@/utils/approval';
import { normalizeToNewFormat } from '@/utils/decision-log-migrator';
import { describeAgentFailureToast, getErrorHandlingStrategy } from '@/utils/agent-error-types';
import NegotiationDialog from '@/components/agent/NegotiationDialog';
import RevisionTimelineDialog from '@/components/agent/RevisionTimelineDialog';
import type { NegotiationPayload } from '@/api/agent';
import IronShieldEvidenceCards from '@/components/agent/IronShieldEvidenceCards';
import { RouteRunContractLayers } from '@/components/agent/RouteRunContractLayers';
import { AgentRouteRunClarificationCard } from '@/components/agent/AgentRouteRunClarificationCard';
import { pickRouteRunSurface, type RouteRunUISurface } from '@/lib/clarification-surface';
import {
  resolveRouteRunViewMode,
  resolveRouteRunViewModeFromParts,
  shouldAttachSimplifiedExplanation,
  shouldShowTruncatedAnswerBubble,
  truncateAnswerTextForBubble,
  type RouteRunViewMode,
} from '@/lib/route-run-render-policy';
import type { ClarificationAnswer } from '@/types/clarification';
import type { AgentRouteRunClarificationSubmitPayload } from '@/components/agent/AgentRouteRunClarificationCard';
import type { EvidenceBundleDto, EvidenceCardDto, EvidenceCardUiDto } from '@/api/agent';
import CandidatesPanel from '@/components/agent/CandidatesPanel';
import { OptimizationExplainBlock } from '@/components/agent/OptimizationExplainBlock';
import { DecisionCockpitPanel } from '@/components/agent/DecisionCockpitPanel';
import { WorldConstraintBanner } from '@/components/planning/WorldConstraintBanner';
import { pickRouteRunExplainOptimizationForMessage } from '@/lib/route-run-optimization-explain';
import { pickDecisionCockpitFromRouteRun, hasDecisionCockpitUi } from '@/lib/decision-cockpit';
import {
  parseItineraryAdjustPayload,
  buildItineraryAdjustMessageFields,
  shouldSuppressLeftTripRefresh,
  syncItineraryAdjustDraftToPlanStudio,
  itineraryAdjustUiHintMessage,
  ITINERARY_ADJUST_APPLY_DRAFT_MESSAGE,
  type ItineraryAdjustResult,
} from '@/lib/itinerary-adjust-response';
import {
  buildItineraryAdjustDraftSnapshot,
  extractRouteRunDurableTripRunId,
  focusPlanStudioItineraryAdjustTargetDay,
  type ItineraryAdjustDraftSnapshot,
} from '@/lib/itinerary-adjust-apply-draft';
import PlanStudioContext from '@/contexts/PlanStudioContext';
import { ItineraryAdjustResultCard } from '@/components/agent/ItineraryAdjustResultCard';
import type { RouteRunExplainOptimization } from '@/types/world-model-guards';
import type { DecisionCockpitDto } from '@/types/decision-cockpit';
import type { ClarificationQuestion } from '@/types/clarification';
import { useRouteRunPreferenceProfile } from '@/hooks/useRouteRunPreferenceProfile';
import {
  mergeStructuredTravelInputs,
  normalizeRouteRunClarificationQuestions,
  toDateOnlyIso,
} from '@/utils/clarification';
import { isTripnaraHttpError } from '@/types/http-error';
import {
  getAgentReasoningState,
  type AgentReasoningState,
} from '@/lib/agent-reasoning-state';
import {
  translateOrchestrationStepForUser,
  translateRouteSelectedPathForUser,
  translateSubAgentForUser,
} from '@/lib/agent-display-zh';
import { localeForAgentConversationContext } from '@/lib/agent-conversation-locale';
import { sanitizeRouteRunTripId } from '@/lib/route-run-trip-id';
import { normalizeSuggestedOperations, type RouteRunIntentModeOption } from '@/lib/suggested-operations';
import { SuggestedOperationsBar } from '@/components/agent/SuggestedOperationsBar';
import {
  agentStructuredContentMaxClass,
  useAgentSidebarContentFullWidth,
} from '@/hooks/use-agent-sidebar-content-width';
import {
  buildAgentChatStorageKey,
  clearAgentChatHistory,
  loadAgentChatHistory,
  saveAgentChatHistory,
  serializeAgentChatMessages,
  type AgentChatPersistedMessage,
} from '@/lib/agent-conversation-persist';
import {
  resetPlanningAssistantV2Session,
  ensurePlanningAssistantV2Session,
  getPlanningAssistantV2SessionId,
} from '@/lib/planning-assistant-session-reset';
import { assistantFieldsFromChatResponse } from '@/lib/planning-assistant-chat-message';
import { shouldRouteHotelViaPlanningAssistantV2 } from '@/lib/planning-assistant-hotel-route';
import { buildPlanningAssistantV2Context } from '@/lib/planning-assistant-v2-context';
import { validateRouting } from '@/utils/planning-assistant-helpers';
import { resolveDestinationTimezone } from '@/utils/timezone';
import { fetchTripPoiSchedules } from '@/lib/trip-poi-schedules';
import type { TimelinePoiScheduleContext } from '@/utils/opening-hours-schedule-check';
import { chatApi } from '@/api/planning-assistant-v2';
import { extractMergedConstraintSinkFromRouteRun, extractConstraintSinkFromDecisionLog, type ConstraintSinkDecisionLogEvidence } from '@/lib/extract-memory-contract';
import { deriveConstraintSinkUiAnchorV1, type ConstraintSinkUiAnchorV1 } from '@/contracts/memory-console-ui-state.v1';
import { isConstraintSinkEnabled } from '@/lib/memory-feature';
import { useDrawerOptional } from '@/components/layout/DashboardLayout';
import { buildRouteAndRunConversationContext } from '@/lib/agent-route-and-run-context';
import {
  buildFitnessPreferenceProfilePatch,
  mergePreferenceProfileForRouteAndRun,
} from '@/lib/fitness-route-and-run';
import { useOptionalFitnessContext } from '@/contexts/FitnessContext';

export type AgentPageMode = 'debug' | 'user';

/** 侧栏可拖宽后占满面板宽度 */
const AGENT_PANEL_CONTENT_MAX_CLASS = 'w-full min-w-0';

interface AgentChatProps {
  /**
   * 须为服务端行程主键（一般为 UUID），与 URL slug、展示名区分。
   * 占位符（如 trip_iceland_*）会在发送 route_and_run 时剔除，避免后端「行程不存在」。
   */
  activeTripId?: string | null;
  onSystem2Response?: () => void;
  className?: string;
  entryPoint?: EntryPoint;  // 入口来源标识
  readonlyMode?: boolean;    // 只读模式
  /** 生产入口模式：debug 展开链路信息；user 隐藏调试工具 */
  pageMode?: AgentPageMode;
  /** 注入 conversation_context.context_type，如 active_trip_summary */
  routeContextType?: string | null;
  /**
   * 为 true 且有 activeTripId 时，若未通过 routeContextType 指定 context_type，
   * 则设置 conversation_context.context_type = active_trip_summary。
   */
  attachActiveTripSummaryContext?: boolean;
  /**
   * 映射 `options.enable_live_tools`：`true` 全开；或通道列表如
   * `['weather','flight','hotel','car_rental']`（**flight** 由服务端 Amadeus/Flight MCP 注入，浏览器不配 URL）。
   * 租车需 trip_id+行程日期等；话术「航班/机票」等会自动并入 `flight`。
   */
  enableLiveTools?: boolean | string[];
  /** 写入 options.intent_flags（对象优先；也可用 URL intentFlags JSON） */
  intentFlags?: Record<string, boolean | string | number> | string[];
  /**
   * System 1 人格倾向：写入 `options.persona_hint` 透传后端（不要求在快路径展示三人格结论）。
   */
  personaHint?: RouteRunPersonaHint;
  /**
   * 为 true 时请求 `options.enable_guardians_debate_llm`，门控非致命可走影子辩论 LLM。
   */
  enableGuardiansDebateLlm?: boolean;
  /** 暴露发送方法，供规划工作台「问助手」等外部入口调用 */
  onSendMessageReady?: (send: (message: string) => void | Promise<void>) => void;
  /** 暴露清空对话，供侧栏标题栏按钮调用 */
  onClearReady?: (clear: () => void) => void;
}

/**
 * 开场白配置接口
 */
interface WelcomeConfig {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  greeting: string | React.ReactNode;
  quickIntents: Array<{
    icon: LucideIcon;
    label: string;
    prompt: string;
  }>;
  example?: string;
}

/**
 * 获取 finding 图标
 */
const getFindingIcon = (iconName: string): LucideIcon => {
  switch (iconName) {
    case 'clock': return Clock;
    case 'route': return Route;
    case 'check': return CheckCircle2;
    case 'alert': return AlertTriangle;
    default: return Lightbulb;
  }
};

/**
 * 获取 finding 样式
 */
const getFindingStyles = (type: TripInsightFinding['type']) => {
  switch (type) {
    case 'warning':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: 'text-amber-600',
        text: 'text-amber-900',
      };
    case 'suggestion':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        text: 'text-blue-900',
      };
    case 'positive':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'text-green-600',
        text: 'text-green-900',
      };
  }
};

type WelcomeOpts = {
  /** 已绑定有效 trip_id（如 /agent?tripId=UUID）：不应再用「从零规划」冷启动文案 */
  hasBoundTrip?: boolean;
};

/**
 * 根据入口点获取开场白配置
 */
const getWelcomeConfig = (
  entryPoint: EntryPoint | undefined,
  tripInsight: TripInsightResponse | null | undefined,
  opts?: WelcomeOpts
): WelcomeConfig => {
  const hasBoundTrip = opts?.hasBoundTrip === true;

  switch (entryPoint) {
    case 'planning_workbench':
      // 如果有行程洞察信息，展示上下文感知的开场白
      if (tripInsight && tripInsight.tripSummary.days > 0) {
        const { tripSummary, findings } = tripInsight;
        
        // 根据 findings 生成动态快捷按钮
        const dynamicIntents: WelcomeConfig['quickIntents'] = [];
        
        // 优先添加有 actionPrompt 的 findings
        findings.forEach((finding) => {
          if (finding.actionLabel && finding.actionPrompt && dynamicIntents.length < 3) {
            dynamicIntents.push({
              icon: getFindingIcon(finding.icon),
              label: finding.actionLabel,
              prompt: finding.actionPrompt,
            });
          }
        });
        
        // 补充默认按钮
        if (dynamicIntents.length < 4) {
          dynamicIntents.push({ icon: Search, label: '全面分析', prompt: '帮我全面分析当前行程，看看还有什么问题或可以优化的地方' });
        }
        if (dynamicIntents.length < 4) {
          dynamicIntents.push({ icon: Target, label: '推荐景点', prompt: '根据我的行程，推荐一些适合加入的景点' });
        }
        
        return {
          icon: Compass,
          title: '规划助手 Nara 🧭',
          subtitle: '专注让行程变得「可执行」',
          greeting: (
            <div className="space-y-3">
              {/* 行程摘要卡片 */}
              <div className="bg-primary/5 rounded-lg p-3 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">{tripSummary.destination}</span>
                  <span className="text-xs text-muted-foreground">· {tripSummary.days} 天</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  已安排 {tripSummary.placesCount} 个地点
                </div>
              </div>
              
              {/* AI 发现 */}
              {findings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">💡 我注意到：</p>
                  <div className="space-y-1.5">
                    {findings.slice(0, 3).map((finding, idx) => {
                      const styles = getFindingStyles(finding.type);
                      const FindingIcon = getFindingIcon(finding.icon);
                      return (
                        <div 
                          key={idx} 
                          className={cn(
                            'rounded-md px-2.5 py-2 text-left border',
                            styles.bg,
                            styles.border
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <FindingIcon className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', styles.icon)} />
                            <div className="flex-1 min-w-0">
                              <p className={cn('text-xs font-medium', styles.text)}>{finding.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{finding.message}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* 如果没有发现，显示正面信息 */}
              {findings.length === 0 && (
                <div className="text-sm text-green-700 bg-green-50 rounded-md p-2.5 text-left">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>行程看起来安排得不错！有什么需要我帮忙的吗？</span>
                  </div>
                </div>
              )}
            </div>
          ),
          quickIntents: dynamicIntents,
          example: undefined,
        };
      }
      
      // 没有行程信息时的默认开场白
      return {
        icon: Compass,
        title: '规划助手 Nara 🧭',
        subtitle: '专注让行程变得「可执行」',
        greeting: (
          <>
            我可以帮你：
            <ul className="mt-2 space-y-1 text-left list-disc list-inside">
              <li>优化景点顺序，减少绕路</li>
              <li>检查行程风险和准备度</li>
              <li>推荐符合你风格的新地点</li>
            </ul>
          </>
        ),
        quickIntents: [
          { icon: MapPin, label: '优化路线', prompt: '帮我优化当前行程的路线顺序，减少绕路' },
          { icon: ClipboardCheck, label: '检查准备度', prompt: '检查当前行程的准备度，有哪些风险或待办事项？' },
          { icon: Target, label: '推荐景点', prompt: '根据我的偏好，推荐一些适合加入行程的景点' },
          { icon: Lightbulb, label: '分析可行性', prompt: '分析当前行程的整体可行性，有什么需要改进的吗？' },
        ],
        example: '帮我把第二天的行程优化一下，感觉有点赶',
      };

    case 'trip_detail_page':
      return {
        icon: Bot,
        title: '嗨，我是 Nara 👋',
        subtitle: '这趟旅行的专属助手',
        greeting: '我可以帮你完善这个行程，有什么想调整的吗？',
        quickIntents: [
          { icon: MapPin, label: '调整行程安排', prompt: '帮我调整一下行程安排' },
          { icon: Search, label: '推荐附近景点', prompt: '推荐一些这个目的地附近值得去的景点' },
          { icon: Calendar, label: '优化时间分配', prompt: '帮我优化一下每天的时间分配' },
          { icon: Utensils, label: '美食推荐', prompt: '推荐一些当地特色美食和餐厅' },
        ],
        example: '帮我在第三天加一个下午茶的安排',
      };

    case 'trip_list_page':
      return {
        icon: Bot,
        title: '嗨，我是 Nara 👋',
        subtitle: '你的智能旅行助手',
        greeting: '想规划新旅行，还是找找灵感？',
        quickIntents: [
          { icon: MapPin, label: '规划新旅行', prompt: '帮我规划一次新的旅行' },
          { icon: Search, label: '找旅行灵感', prompt: '给我一些旅行目的地的灵感和建议' },
          { icon: Calendar, label: '查看我的行程', prompt: '帮我整理一下现有的行程' },
          { icon: Target, label: '热门推荐', prompt: '推荐一些当季热门的旅行目的地' },
        ],
        example: '我想去冰岛玩一周，你来帮我安排吧 ✈️',
      };

    default:
      break;
  }

  /** Agent 页等：已绑定行程、无专门 entryPoint —— 冷启动应像「行程副驾驶」而非从零种草 */
  if (hasBoundTrip) {
    return {
      icon: Compass,
      title: '行程助手 Nara',
      subtitle: '已关联当前行程',
      greeting: (
        <span className="text-[13px] leading-relaxed text-muted-foreground">
          在这一页提问、检索攻略或说明想怎么改日程；我会带上当前行程上下文回答。
        </span>
      ),
      quickIntents: [
        { icon: Search, label: '查攻略 / 实况', prompt: '结合当前行程，帮我汇总目的地近期需要注意的天气与路况' },
        { icon: MapPin, label: '检查日程是否合理', prompt: '看一下当前行程每天强度是否合理，有没有某天太赶或绕路' },
        { icon: Utensils, label: '餐饮与停留', prompt: '根据行程节奏推荐用餐区域和值得停留的点' },
      ],
      example: undefined,
    };
  }

  // 未绑定行程：保留偏「开始一段规划」的冷启动
  return {
    icon: Bot,
    title: '嗨，我是 Nara 👋',
    subtitle: '你的智能旅行副驾驶',
    greeting: (
      <>
        你可以直接告诉我你的旅行想法，
        <br />
        剩下的交给我来一起想。
      </>
    ),
    quickIntents: [
      { icon: MapPin, label: '帮我规划一次旅行', prompt: '帮我规划一次旅行' },
      { icon: Utensils, label: '推荐一些好吃的地方', prompt: '推荐一些好吃的地方' },
      { icon: Search, label: '找几个值得去的景点', prompt: '找几个值得去的景点' },
      { icon: Calendar, label: '帮我安排一个行程', prompt: '帮我安排一个行程' },
    ],
    example: '我想去冰岛玩一周，你来帮我安排吧 ✈️',
  };
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: UIStatus;
  routeType?: RouteType;
  routeInfo?: {
    confidence: number;
    latency_ms: number;
    tokens_est?: number;
    cost_est_usd?: number;
    /** RouterOutputDto.selected_path，如 FAST | DEEP */
    selected_path?: string;
  };
  decisionLog?: DecisionLogEntry[];  // 使用新的决策日志格式
  mode?: 'fast' | 'slow';
  /** 编排 UI 状态（phase、progress、message 等） */
  ui_state?: OrchestrationUiState;
  /** 编排结果（state、gate_result、decision_log、decisionState） */
  orchestrationResult?: OrchestrationResult;
  /**
   * explain 中与门控同源的只读镜像（如 `guardian_personas`）；咨询态剥离 orchestration 时用于三人格 UI 回退。
   */
  routeRunExplainMirror?: RouteRunExplainGuardianMirror;
  /** explain.simplified_explanation：与 answer_text / narration 并列 */
  routeRunSimplifiedExplanation?: RouteRunSimplifiedExplanation | null;
  /** payload.metadata.poiPlanningOutcome.noPoiPlanning 等 */
  routeRunNoPoiPlanningFlag?: boolean;
  /** C1 证据包（verification_status + failure_reason_codes） */
  evidenceBundle?: EvidenceBundleDto;
  /** Iron Shield 审计/逻辑层证据卡 */
  evidenceCards?: EvidenceCardDto[];
  /** 可直渲染证据卡 UI Props */
  evidenceCardsUi?: EvidenceCardUiDto[];
  /** 候选/替代方案（用于 Story B/C1 验收与调试） */
  candidates?: any[];
  alternatives?: any[];
  replayResult?: {
    type: 'timeline' | 'what_if' | 'counterfactual' | 'unknown';
    title: string;
    summaryLines: string[];
    raw: any;
  };
  /** 研发排障：一键复制用的上下文快照 */
  debugBundle?: {
    request_id?: string;
    trip_id?: string | null;
    user_id?: string;
    conversation_context?: Record<string, unknown>;
    emergency_constraints?: Record<string, unknown>;
    page_url?: string;
    captured_at?: string;
  };
  /** failure_reason_codes → 产品语义（槽位填充 / 约束告警 / 硬拒绝） */
  reasoningState?: AgentReasoningState;
  /** NEED_MORE_INFO：`payload.clarificationQuestions` 结构化澄清卡片 */
  clarificationQuestions?: ClarificationQuestion[];
  /** 澄清 / 可执行性 / 正文：与 pickRouteRunSurface 对齐 */
  routeRunSurface?: RouteRunUISurface;
  /** 最小渲染分支：clarification | trip_timeline | answer_fallback */
  routeRunViewMode?: RouteRunViewMode;
  /** Decision OS：由 routing_task_type + route 推断的 UI 语义（规划 vs 咨询/RAG）；勿替代 routing 权威字段 */
  interactionKind?: InteractionKind;
  /** 已按 observability / unified_execution_trace / route 解析后的任务类型 */
  taskType?: string;
  /** 原始 `route.task_type`（可与 routing_task_type 对照调试） */
  routeDecisionTaskType?: string;
  routePolicy?: string;
  /** RAG / 知识库引用路径（展示「来源」脚注） */
  ragSources?: string[];
  /** payload.kb_rag_citation_count */
  kbRagCitationCount?: number;
  /** payload.unified_execution_trace.kb_rag_hit（调试条展示） */
  kbRagHit?: unknown;
  /** 模糊意图二次确认（预留：后端下发 chips 时渲染 IntentActionChips） */
  intentActionChips?: IntentActionChipItem[];
  /** RAG 命中的 JSON 决策块：decision + why 要点 */
  ragStructured?: RagStructuredOutcome | null;
  /** 与 result.payload.ui_surface 对齐；优先于前端 interactionKind 驱动完成态文案 */
  uiSurface?: string;
  /** 异步 route_and_run 轮询进度 0–100 */
  routeRunAsyncProgress?: number;
  /** route.ui_hint.message：后端给的完成态提示（System 2 常为「咨询已完成」/「处理完成」），展示时优先于前端写死文案 */
  uiHintMessage?: string;
  /** observability.system_mode，便于 Debug 区分 System 1（常无 ui_surface） */
  observabilitySystemMode?: 'SYSTEM1' | 'SYSTEM2' | 'REDIRECT';
  /**
   * 缓存回放 / DEDUP 去重：`isRouteRunCacheReplay(response)` =
   * `observability.is_replayed` 或 `orchestration_mode_final === 'DEDUP'`。
   */
  isCacheReplay?: boolean;
  /** Debug：`getRouteRunOrchestrationModeFinal` */
  orchestrationModeFinal?: string;
  /** payload.live_sensor_audit：实时数据调用的可解释摘要 */
  liveSensorAudit?: Record<string, unknown>;
  /** 与规划助手 HotelList 一致：payload.hotels / live_sensor_audit 等下发的酒店结果 */
  hotels?: Hotel[];
  /** Booking 租车 MCP 等：仅在 payload.car_rentals 有数据且 live_sensor_audit 中租车成功时写入 */
  carRentals?: CarRentalItem[];
  /** car_rental_search_meta.fallback_dates_used：兜底日期查价，提示用户在工作台补全日期 */
  carRentalFallbackDatesUsed?: boolean;
  /** 与规划助手 AccommodationList 一致：payload.accommodations（酒店+Airbnb 混合卡片） */
  accommodations?: Accommodation[];
  /** planning-assistant/v2/chat 澄清（如 HOTEL_DATES）；规划工作台走后端澄清，不用本地 preflight 卡 */
  clarificationNeeded?: {
    type: string;
    message: string;
    messageCN?: string;
    suggestedDates?: { checkIn: string; checkOut: string };
  };
  /** v2/chat phase，如 CLARIFYING_HOTEL_DATES */
  phase?: string;
  /** payload.hotel_search_meta.disclaimer_zh，列表底部展示 */
  accommodationDisclaimerZh?: string;
  /** 产出住宿列表时的规划助手 v2 sessionId（apply 必须与 route_and_run / chat 同源） */
  planningAssistantSessionId?: string;
  /** payload.poi_cards_by_day / poi_cards：按天 POI 卡片（规划态有 timeline 时作行级补水，非列表主序） */
  poiCardsByDay?: AgentPoiDayBlock[];
  /** payload.timeline：规划态成功响应下列表主数据源（勿用 answer_text 当结构化行程） */
  timelineDayBlocks?: ItineraryDayItemsBlock[];
  /** payload.safety_surface：路段安全 / 校验 / 打标（与 timeline 按 route_segment_ref 对齐） */
  safetySurface?: SafetySurfacePayloadV1 | null;
  /** payload.poi_cards_meta.suppress_answer_prose：保留短摘要，收起长文 Markdown */
  poiSuppressAnswerProse?: boolean;
  /** payload.consultation_dashboard：咨询可视化 Dashboard（需 ui_surface=consultation） */
  consultationDashboard?: ConsultationDashboardPayload;
  /** payload.flight_inventory_snapshot：航班传感器摘录（非住宿卡协议） */
  flightInventorySnapshot?: FlightInventorySnapshot;
  /** payload.suggested_operations：快捷操作（再对话 / 纯导航） */
  suggestedOperations?: SuggestedOperation[];
  /** payload.actionExecutionPreview：物理执行预览（卡片与采纳 Flow） */
  actionExecutionPreview?: ActionExecutionPreviewPayload;
  /** payload.actionExecution.pendingActions */
  actionExecutionPending?: unknown[];
  /** explain.optimization：方案裁决叙述 / 结构化 verdict（规划 OK，非咨询） */
  routeRunExplainOptimization?: RouteRunExplainOptimization;
  /** explain.decision_cockpit：决策驾驶舱（decision-cockpit@v1） */
  routeRunDecisionCockpit?: DecisionCockpitDto;
  /** ITINERARY_ADJUST：单日改排 intake */
  itineraryAdjustIntake?: boolean;
  itineraryAdjustAutoApplied?: boolean;
  itineraryAdjustDraft?: boolean;
  itineraryAdjustScopeDate?: string;
  itineraryAdjustAutoApplyReason?: string;
  /** payload.itinerary_adjust_result：改排优化说明卡 */
  itineraryAdjustResult?: ItineraryAdjustResult;
  /** payload.actionExecution（改排落库 AUTO / 草案 ADVICE_ONLY） */
  actionExecution?: import('@/api/agent').ActionExecutionPayload;
  ironShieldUiSuppressed?: boolean;
  decisionCockpitUiSuppressed?: boolean;
  /** Gate 依据行：observability.memory_contract.constraint_sink + decision_log 合并 */
  memoryConstraintSinkAnchor?: ConstraintSinkUiAnchorV1;
  /** decision_log 原始 constraint_sink 依据（Drawer 交叉展示） */
  memoryConstraintSinkDecisionLog?: ConstraintSinkDecisionLogEvidence;
}

/**
 * 默认意图（显式下发 options.intent_mode，减少对后端启发式推断的依赖）
 * - 规划工作台 → TRIP_PLANNING
 * - 已绑定行程 → AUTO（由后端分流；用户点「泛问」才发 GENERIC_QA）
 * - 未绑定 → GENERIC_QA
 */
function defaultUserIntentModeForEntry(
  entryPoint: EntryPoint | undefined,
  hasBoundTrip: boolean
): UserExplicitIntentMode {
  if (entryPoint === 'planning_workbench') return 'planning';
  if (hasBoundTrip) return 'auto';
  return 'generic_qa';
}

/** route_and_run 单次发送覆盖项（酒店检索：DATA_LOOKUP + enable_live_tools、是否省略 structured_travel_input） */
type RouteAndRunSendOptions = {
  forceIntentMode?: UserExplicitIntentMode;
  enableLiveToolsOverride?: boolean | string[];
  /** true：不传 structured_travel_input，后端按 trip_id 使用行程日期 */
  omitStructuredTravelInput?: boolean;
  /** 卡片内发起的酒店检索：跳过「推荐酒店」拦截，避免再次弹出卡片 */
  skipHotelPreflight?: boolean;
  /** 快捷操作「再对话」覆盖本次请求的 trip_id（须为服务端 UUID） */
  routeRunTripIdOverride?: string | null;
  /**
   * `suggested_operations` 一键发送：附带 `suggested_operation_payload`，即使未设置 `routeRunTripIdOverride`
   *（会话行程来自 `sanitizedTripId`）也能把嵌套 trip_id/message 交给后端 whitelist merge。
   */
  invokeSuggestedOperation?: boolean;
  /**
   * 快捷操作 `payload.intent_mode`：写入本轮 `options.intent_mode` 并并入 `suggested_operation_payload`，
   * 避免仅靠正文被判成泛问（与 `forceIntentMode` 独立；二者均存在时 `forceIntentMode` 仍优先于 UI 档位）。
   */
  suggestedOperationIntentMode?: RouteRunIntentModeOption;
  /** 澄清卡回传（可配合空 message，如 accept_neptune_alternative） */
  clarificationAnswers?: ClarificationAnswer[];
  /** 用户气泡展示文案（选项 label，非题干） */
  clarificationDisplayMessage?: string;
  /** 改排草案落库：POST route_and_run options.apply_itinerary_adjust_draft */
  applyItineraryAdjustDraft?: {
    snapshot: ItineraryAdjustDraftSnapshot;
    durableTripRunId?: string;
  };
};

/** 映射 props.enableLiveTools → options.enable_live_tools */
function buildEnableLiveToolsOption(
  v: boolean | string[] | undefined
): boolean | string[] | undefined {
  if (v === undefined || v === false) return undefined;
  if (Array.isArray(v)) return v.length > 0 ? v : undefined;
  return v === true ? true : undefined;
}

function mergeCarRentalIntoEnableLiveTools(
  base: boolean | string[] | undefined,
  addCarRental: boolean
): boolean | string[] | undefined {
  if (!addCarRental) return base;
  if (base === true) return true;
  const list = Array.isArray(base) ? [...base] : [];
  if (!list.some((x) => String(x).toLowerCase() === 'car_rental')) {
    list.push('car_rental');
  }
  return list.length > 0 ? list : ['car_rental'];
}

function mergeFlightIntoEnableLiveTools(
  base: boolean | string[] | undefined,
  addFlight: boolean
): boolean | string[] | undefined {
  if (!addFlight) return base;
  if (base === true) return true;
  const list = Array.isArray(base) ? [...base] : [];
  if (!list.some((x) => String(x).toLowerCase() === 'flight')) {
    list.push('flight');
  }
  return list.length > 0 ? list : ['flight'];
}

function liveToolsIncludeFlight(tools: boolean | string[] | undefined): boolean {
  if (tools === true) return true;
  if (!Array.isArray(tools)) return false;
  return tools.some((t) => String(t).toLowerCase() === 'flight');
}

function liveToolsIncludeCarRental(tools: boolean | string[] | undefined): boolean {
  if (tools === true) return true;
  if (!Array.isArray(tools)) return false;
  return tools.some((t) => String(t).toLowerCase() === 'car_rental');
}

function liveToolsIncludeHotel(tools: boolean | string[] | undefined): boolean {
  if (tools === true) return true;
  if (!Array.isArray(tools)) return false;
  return tools.some((t) => {
    const s = String(t).toLowerCase();
    return s === 'hotel' || s === 'hotels' || s.includes('hotel');
  });
}

/**
 * 绑定行程且问机票/航班时强制检索档，避免默认 TRIP_PLANNING 状态机不走轻量传感器链。
 * 用户显式选「规划」或已是「检索」时不覆盖。
 */
function resolveIntentModeForFlightOnTrip(
  effective: UserExplicitIntentMode,
  augmentFlight: boolean,
  hasTripId: boolean
): UserExplicitIntentMode {
  if (
    augmentFlight &&
    hasTripId &&
    effective !== 'planning' &&
    effective !== 'data_lookup'
  ) {
    return 'data_lookup';
  }
  return effective;
}

/** `options.intent_mode` API 值 → 本地档位（思考文案等） */
function userExplicitFromRouteRunIntentMode(m: RouteRunIntentModeOption): UserExplicitIntentMode {
  switch (m) {
    case 'TRIP_PLANNING':
      return 'planning';
    case 'DATA_LOOKUP':
      return 'data_lookup';
    case 'GENERIC_QA':
      return 'generic_qa';
    default:
      return 'auto';
  }
}

/**
 * 已绑定有效 trip_id：`planning` / `data_lookup` / **用户显式「泛问」`generic_qa`** 不覆盖。
 * - **泛问**：保持 `GENERIC_QA`。
 * - **`auto`**：规划话术 → **TRIP_PLANNING**；天气/路况/攻略汇总 → **DATA_LOOKUP**；否则 **AUTO**。
 */
function resolveIntentModeForBoundTripRoute(
  tripIdForRequest: string | null,
  effectiveAfterFlight: UserExplicitIntentMode,
  messageText: string
): UserExplicitIntentMode {
  if (!tripIdForRequest) return effectiveAfterFlight;
  if (
    effectiveAfterFlight === 'planning' ||
    effectiveAfterFlight === 'data_lookup' ||
    effectiveAfterFlight === 'generic_qa'
  ) {
    return effectiveAfterFlight;
  }
  if (looksLikeTripPlanningRequest(messageText)) return 'planning';
  if (looksLikeTripContextDataLookup(messageText)) return 'data_lookup';
  return 'auto';
}

function getThinkingLine(intent: UserExplicitIntentMode, activeTripId: string | null | undefined): string {
  if (intent === 'planning') return '正在生成行程并执行约束与证据校验…';
  if (intent === 'data_lookup') return '正在为您查询攻略与内部参考…';
  if (intent === 'generic_qa') return '正在组织回答…';
  if (activeTripId) return '正在理解您的问题并准备回答…';
  return '让我思考一下…';
}

/** 后端下发模糊意图选项时解析（字段名可演进） */
function pickIntentChipsFromPayload(p: Record<string, unknown> | undefined): IntentActionChipItem[] | undefined {
  if (!p) return undefined;
  const raw = p.intent_disambiguation ?? p.intent_chips ?? p.disambiguation_options;
  if (!Array.isArray(raw)) return undefined;
  const out: IntentActionChipItem[] = [];
  let i = 0;
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = String(o.id ?? o.option_id ?? `opt-${i++}`);
    const label = String(o.label ?? o.title ?? o.text ?? '').trim();
    if (!label) continue;
    const taskTypeOverride =
      typeof o.task_type === 'string'
        ? o.task_type
        : typeof o.taskType === 'string'
          ? o.taskType
          : undefined;
    out.push({ id, label, taskTypeOverride, payload: o as Record<string, unknown> });
  }
  return out.length ? out : undefined;
}

/** 助手气泡正文：无空格长串（L3-PROOF 等）须在容器宽度内断行 */
const ASSISTANT_BUBBLE_TEXT =
  'min-w-0 break-words [overflow-wrap:anywhere] whitespace-pre-wrap';

function AssistantMarkdown({ text, isUser }: { text: string; isUser: boolean }) {
  return (
    <div
      className={cn(
        'agent-markdown min-w-0 break-words [overflow-wrap:anywhere] text-[13px] leading-relaxed sm:text-sm',
        isUser ? 'text-primary-foreground' : 'text-foreground'
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-2.5 last:mb-0 leading-relaxed break-words [overflow-wrap:anywhere]">{children}</p>
          ),
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 marker:text-primary/70">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 marker:font-medium">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed [&>p]:mb-1">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic text-foreground/95">{children}</em>,
          a: ({ href, children }) => (
            <a href={href} className="font-medium text-primary underline underline-offset-2" target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          code: ({ className, children, ...props }) => {
            const inline = !className;
            return inline ? (
              <code
                className="rounded bg-muted/90 px-1 py-0.5 font-mono text-[12px] text-foreground break-all"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className={cn(className, 'block font-mono text-[12px] leading-relaxed break-all')}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-lg border border-border/80 bg-muted/35 p-3 text-[12px] shadow-sm">
              {children}
            </pre>
          ),
          h1: ({ children }) => (
            <h2 className="mb-2 mt-4 border-b border-border/60 pb-1 text-base font-bold tracking-tight first:mt-0">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h3 className="mb-2 mt-4 text-[15px] font-semibold first:mt-0">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="mb-1.5 mt-3 text-sm font-semibold text-foreground first:mt-0">{children}</h4>
          ),
          h4: ({ children }) => (
            <h5 className="mb-1 mt-2 text-sm font-medium text-foreground/95">{children}</h5>
          ),
          hr: () => <hr className="my-4 border-border/70" />,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-[3px] border-primary/35 bg-muted/25 py-2 pl-4 pr-2 text-muted-foreground">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-3 w-full overflow-x-auto rounded-lg border border-border/90 bg-card/50 shadow-sm">
              <table className="w-full min-w-[20rem] border-collapse text-left text-[13px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="border-b border-border bg-muted/70">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-border/70">{children}</tbody>,
          tr: ({ children }) => <tr className="transition-colors hover:bg-muted/30">{children}</tr>,
          th: ({ children }) => (
            <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="px-3 py-2.5 align-top text-foreground/90">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

/** payload.live_sensor_audit 轻量可解释展示 */
function LiveSensorAuditBlock({ audit }: { audit: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const hint = buildLiveSensorAuditHint(audit);
  const title = hint.trim() || '实时数据说明';
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-2 rounded-md border border-sky-200/70 bg-sky-50/50 dark:border-sky-800/60 dark:bg-sky-950/25">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto min-h-8 w-full justify-between gap-2 px-2 py-1.5 text-left text-[11px] font-medium text-sky-900 dark:text-sky-100 items-start"
        >
          <span className="min-w-0 flex-1 whitespace-pre-line break-words leading-snug">{title}</span>
          <ChevronRight
            className={cn('h-3.5 w-3.5 shrink-0 transition-transform mt-0.5', open && 'rotate-90')}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pb-2">
        <pre className="max-h-36 overflow-auto rounded border border-border/60 bg-background/80 p-2 text-[10px] leading-snug text-muted-foreground">
          {JSON.stringify(audit, null, 2)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * 状态指示器组件
 */
function StatusIndicator({
  status,
  thinkingLabel,
  doneSemantic,
  uiSurface,
  uiHintMessage,
}: {
  status: UIStatus;
  /** 覆盖「思考中」文案（与启发式 loading 对齐） */
  thinkingLabel?: string;
  /** 完成态语义：咨询/RAG 时不使用「行程已成功」类文案（ui_surface 未下发时的兜底） */
  doneSemantic?: 'planning' | 'lookup' | 'qa' | 'generic';
  /** result.payload.ui_surface */
  uiSurface?: string;
  /** route.ui_hint.message：成功响应首选展示文案（assembleClaudeDynamicResponse / assembler） */
  uiHintMessage?: string;
}) {
  if (status === 'thinking') {
    return (
      <PlannerThinkingLoading
        compact
        size={32}
        label={thinkingLabel?.trim() || undefined}
        className="px-0 py-0 text-muted-foreground"
        textClassName="text-xs text-muted-foreground"
      />
    );
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'browsing':
        return {
          icon: <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />,
          text: '正在浏览全球数据中…',
          color: 'text-orange-600',
        };
      case 'verifying':
        return {
          icon: (
            <div className="w-4 h-4 rounded-full bg-yellow-500 animate-pulse"></div>
          ),
          text: '双重确认中，确保你拿到的是最准的建议！',
          color: 'text-yellow-600',
        };
      case 'repairing':
        return {
          icon: <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />,
          text: '咦，好像哪里有点问题，我来修一下 🛠️',
          color: 'text-orange-600',
        };
      case 'awaiting_consent':
        return {
          icon: <div className="w-4 h-4 rounded-full bg-red-500"></div>,
          text: '我需要你的授权才能继续操作 👇',
          color: 'text-red-600',
        };
      case 'awaiting_confirmation':
        return {
          icon: <div className="w-4 h-4 rounded-full bg-red-500"></div>,
          text: '需要你确认一下，再继续行动～',
          color: 'text-red-600',
        };
      case 'awaiting_user_input':
        return {
          icon: <div className="w-4 h-4 rounded-full bg-yellow-500"></div>,
          text: '需要更多信息，请查看下方提示',
          color: 'text-yellow-600',
        };
      case 'done': {
        const hint = (uiHintMessage ?? '').trim();
        const u = (uiSurface ?? '').trim().toLowerCase();
        const consultationTone =
          u === 'consultation' ||
          hint === '咨询已完成' ||
          doneSemantic === 'lookup' ||
          doneSemantic === 'qa';

        /** 后端 route.ui_hint.message 为准，勿用「安排行程成功」覆盖 */
        if (hint) {
          return {
            icon: (
              <CheckCircle2
                className={cn('w-4 h-4', consultationTone ? 'text-sky-600' : 'text-green-600')}
              />
            ),
            text: hint,
            color: consultationTone ? 'text-sky-700 dark:text-sky-300' : 'text-green-600',
          };
        }

        if (u === 'consultation') {
          return {
            icon: <CheckCircle2 className="w-4 h-4 text-sky-600" />,
            text: '咨询完成 · 回答已就绪',
            color: 'text-sky-700 dark:text-sky-300',
          };
        }
        if (u === 'planning') {
          return {
            icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
            text: '行程处理完成',
            color: 'text-green-600',
          };
        }

        return {
          icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
          text:
            doneSemantic === 'lookup' || doneSemantic === 'qa'
              ? '参考回答已就绪'
              : doneSemantic === 'generic'
                ? '已完成'
                : '行程处理完成',
          color: 'text-green-600',
        };
      }
      case 'failed':
        return {
          icon: <XCircle className="w-4 h-4 text-red-600" />,
          text: '出了一点小状况，要不再试一次？',
          color: 'text-red-600',
        };
      default:
        return {
          icon: null,
          text: '',
          color: '',
        };
    }
  };

  const config = getStatusConfig();

  if (!config.icon) return null;

  return (
    <div className={cn('flex items-center gap-1.5 text-xs', config.color)}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}

/**
 * 路由信息卡片
 */
function RouteInfoCard({
  routeInfo,
  routeType,
  cacheReplay,
  defaultExpanded,
  preferZhLabels,
}: {
  routeInfo: Message['routeInfo'];
  routeType?: RouteType;
  /** 与 `observability.is_replayed` / `orchestration_mode_final === 'DEDUP'` 对齐 */
  cacheReplay?: boolean;
  defaultExpanded?: boolean;
  preferZhLabels?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(!!defaultExpanded);

  if (!routeInfo || !routeType) return null;

  const getRouteTypeLabel = () => {
    switch (routeType) {
      case 'SYSTEM1_API':
        return '系统 API';
      case 'SYSTEM1_RAG':
        return '知识检索';
      case 'SYSTEM2_REASONING':
        return '深度推理';
      case 'SYSTEM2_WEBBROWSE':
        return '网页浏览';
      default:
        return routeType;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between h-auto py-1.5 px-2 text-xs hover:bg-muted/50"
        >
          <span className="flex items-center gap-1.5">
            <ChevronRight className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-90')} />
            <span>路由信息</span>
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1">
        <div className="bg-muted/50 rounded-md p-2.5 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">路由类型：</span>
            <Badge variant="outline" className="text-xs">
              {getRouteTypeLabel()}
            </Badge>
          </div>
          {routeInfo.selected_path?.trim() ? (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">快慢路径：</span>
              <Badge variant="secondary" className="text-xs font-mono">
                {translateRouteSelectedPathForUser(routeInfo.selected_path, !!preferZhLabels)}
              </Badge>
            </div>
          ) : null}
          {cacheReplay !== undefined ? (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">计算来源：</span>
              <Badge
                variant={cacheReplay ? 'secondary' : 'outline'}
                className={cn('text-xs', cacheReplay && 'bg-amber-50 text-amber-900 border-amber-200')}
              >
                {cacheReplay ? '缓存回放' : '实时计算'}
              </Badge>
            </div>
          ) : null}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">置信度：</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full', getConfidenceColor(routeInfo.confidence))}
                  style={{ width: `${routeInfo.confidence * 100}%` }}
                />
              </div>
              <span className="font-medium">{(routeInfo.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">耗时：</span>
            <span className="font-medium">{routeInfo.latency_ms}ms</span>
          </div>
          {routeInfo.tokens_est !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Token 消耗：</span>
              <span className="font-medium">{routeInfo.tokens_est.toLocaleString()}</span>
            </div>
          )}
          {routeInfo.cost_est_usd !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">成本估算：</span>
              <span className="font-medium">${routeInfo.cost_est_usd.toFixed(4)}</span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * 决策日志卡片（编排步骤；RAG 文献路径已在条目的「证据引用」等字段中体现，不再单独列出「知识库命中」）
 */
function DecisionLogCard({
  decisionLog,
  defaultExpanded,
  preferZhLabels,
}: {
  decisionLog?: Message['decisionLog'];
  defaultExpanded?: boolean;
  preferZhLabels?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(!!defaultExpanded);

  const nDecision = decisionLog?.length ?? 0;
  if (nDecision === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between h-auto py-1.5 px-2 text-xs hover:bg-muted/50 text-left"
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <ChevronRight className={cn('w-3 h-3 shrink-0 transition-transform', isOpen && 'rotate-90')} />
            <span className="break-words">决策日志 ({nDecision} 条)</span>
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1">
        <div className="bg-muted/50 rounded-md p-2.5 space-y-2 text-xs">
          {decisionLog!.map((log, idx) => {
            const displayZh = extractOntologyEvidenceDisplayZh(log as unknown as Record<string, unknown>);
            const readinessDisplayZh = extractReadinessEvidenceDisplayZh(log as unknown as Record<string, unknown>);
            const readinessTechnicalRefs = extractReadinessTechnicalEvidenceRefs(
              log as unknown as Record<string, unknown>
            );
            const summaryHintsReadiness =
              typeof log.outputs_summary === 'string' &&
              /准备度|Readiness|readiness|就绪/i.test(log.outputs_summary);
            const readinessWired =
              (readinessDisplayZh != null && readinessDisplayZh.length > 0) ||
              readinessTechnicalRefs.some(
                (r) => r.startsWith('readiness_pack_check:') || r.startsWith('readiness:')
              ) ||
              (log.evidence_refs ?? []).some(
                (r) =>
                  String(r).trim().startsWith('readiness_pack_check:') ||
                  String(r).trim().startsWith('readiness:')
              );
            const hasEvidenceBlock =
              (log.evidence_refs?.length ?? 0) > 0 ||
              (displayZh != null && displayZh.length > 0) ||
              (readinessDisplayZh != null && readinessDisplayZh.length > 0) ||
              summaryHintsReadiness ||
              readinessWired ||
              readinessTechnicalRefs.length > 0;
            const isHallucination = isHallucinationDetectionDecisionLog(log);
            return (
            <div key={idx} className="border-l-2 border-primary/30 pl-2.5 pb-2 last:pb-0">
              <div className="font-medium mb-0.5">
                {translateOrchestrationStepForUser(String(log.step), !!preferZhLabels)} -{' '}
                {translateSubAgentForUser(log.actor, !!preferZhLabels)}
                {!isHallucination ? <>：{log.outputs_summary}</> : null}
              </div>
              {log.inputs_summary && (
                <div className="text-muted-foreground text-[11px] mt-0.5">
                  输入：{log.inputs_summary}
                </div>
              )}
              {isHallucination ? (
                <p className="text-[11px] text-foreground/95 leading-relaxed whitespace-pre-wrap mt-0.5">
                  {log.outputs_summary}
                </p>
              ) : null}
              {isHallucination ? <HallucinationDecisionLogExtras log={log} /> : null}
              {hasEvidenceBlock ? (
                <EvidenceRefsReadable
                  refs={log.evidence_refs ?? []}
                  ontologyEvidenceDisplayZh={displayZh}
                  readinessEvidenceDisplayZh={readinessDisplayZh}
                  readinessTechnicalEvidenceRefs={readinessTechnicalRefs}
                  outputsSummary={log.outputs_summary}
                />
              ) : null}
              <OntologyDecisionStepExtras log={log} />
              {log.metadata?.guardian && (
                <div className="text-muted-foreground text-[11px] mt-0.5">
                  三人格：{log.metadata.guardian}
                </div>
              )}
            </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ReplayResultCard({ replayResult }: { replayResult?: Message['replayResult'] }) {
  const [rawOpen, setRawOpen] = useState(false);
  const [summaryOnly, setSummaryOnly] = useState(true);
  if (!replayResult) return null;

  return (
    <div className="mt-2 rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium">{replayResult.title}</div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={() => setSummaryOnly((v) => !v)}
          >
            {summaryOnly ? '摘要+raw' : '仅摘要'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(JSON.stringify(replayResult.raw, null, 2));
                toast.success('已复制 raw JSON');
              } catch {
                toast.error('复制失败');
              }
            }}
          >
            复制 raw
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={() => setRawOpen((v) => !v)}
          >
            {rawOpen ? '收起 raw' : '展开 raw'}
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {replayResult.summaryLines.map((line, idx) => (
          <div key={idx} className="text-xs text-muted-foreground whitespace-pre-wrap">
            {line}
          </div>
        ))}
      </div>

      {!summaryOnly && rawOpen ? (
        <pre className="text-[11px] bg-background rounded border p-2 overflow-auto max-h-64">
          {JSON.stringify(replayResult.raw, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

/** route_and_run 结构化澄清：由 AgentRouteRunClarificationCard 渲染（勿用 answer_text） */
function AgentClarificationQuestionsCard({
  questions,
  onSubmitClarification,
  disabled,
  guidanceHint,
  debugUiDefaults,
}: {
  questions: ClarificationQuestion[];
  onSubmitClarification: (payload: AgentRouteRunClarificationSubmitPayload) => void;
  disabled?: boolean;
  guidanceHint?: string;
  debugUiDefaults?: boolean;
}) {
  return (
    <AgentRouteRunClarificationCard
      questions={questions}
      onSubmit={onSubmitClarification}
      disabled={disabled}
      guidanceHint={guidanceHint}
      debugUiDefaults={debugUiDefaults}
    />
  );
}

/**
 * 是否在助手气泡内展示规划态（route_and_run / ui_surface=planning）的 timeline、
 * POI 按天卡、编排草案等大卡片。关闭后不在对话里铺「智能体统一入口」式行程块，
 * 仅保留 StatusIndicator、answer 正文及其它条（建议操作、编排进度等）。
 */
const SHOW_PLANNING_ITINERARY_CARDS_IN_AGENT_BUBBLE = false;

/**
 * 消息气泡组件
 */
function MessageBubble({
  message,
  mode,
  onRetry,
  debugUiDefaults,
  onSendClarification,
  clarificationSubmitDisabled,
  activeTripId,
  planningAssistantSessionId,
  onApplySuggestToTrip,
  onApplyItineraryAdjustDraft,
  onIntentChipSelect,
  onTripDataRefresh,
  onSuggestedRouteRun,
  chatSending,
  onAdoptHealingPreview,
  adoptHealingBusyKey,
  tripTimezone,
  tripPoiSchedules,
  fallbackTimelineDayBlocks,
  tripStayDates,
  userId,
}: {
  message: Message;
  mode?: 'fast' | 'slow';
  onRetry?: () => void;
  debugUiDefaults?: boolean;
  /** 澄清卡片「提交」：带 clarification_answers 再 POST route_and_run */
  onSendClarification?: (payload: AgentRouteRunClarificationSubmitPayload) => void | Promise<void>;
  clarificationSubmitDisabled?: boolean;
  activeTripId?: string | null;
  /** 规划助手 v2 sessionId，与 route_and_run options.client_session_id 一致 */
  planningAssistantSessionId?: string | null;
  /** DATA_LOOKUP 纠偏：显式改走行程修改 */
  onApplySuggestToTrip?: () => void;
  /** ITINERARY_ADJUST 草案：POST route_and_run apply_itinerary_adjust_draft */
  onApplyItineraryAdjustDraft?: (message: Message) => void;
  onIntentChipSelect?: (chip: IntentActionChipItem) => void;
  /** 住宿「加入行程」成功后刷新行程数据（如 Agent 页 onSystem2Response） */
  onTripDataRefresh?: () => void;
  /** payload.suggested_operations：再调 route_and_run（含 payload.intent_mode → options） */
  onSuggestedRouteRun?: (
    message: string,
    tripIdOverride?: string,
    intentModeFromSuggestedPayload?: RouteRunIntentModeOption
  ) => void;
  /** 主对话正在发送，禁用快捷按钮 */
  chatSending?: boolean;
  /** 物理预览：采纳 healed_action_input 后 POST /agent/actions/preview */
  onAdoptHealingPreview?: AdoptHealingPreviewHandler;
  adoptHealingBusyKey?: string | null;
  /** 行程目的地时区，用于 POI_CLOSED 与 timeline 对齐 */
  tripTimezone?: string;
  tripPoiSchedules?: TimelinePoiScheduleContext[] | null;
  /** 左侧改排草案 preview（与 message.timeline 同源，message 缺字段时兜底） */
  fallbackTimelineDayBlocks?: ItineraryDayItemsBlock[];
  /** 行程默认入住/退房（住宿卡片缺 checkIn 时 apply 回退） */
  tripStayDates?: { checkIn?: string; checkOut?: string };
  userId?: string;
}) {
  const preferZhLabels = debugUiDefaults === false;
  const drawerCtx = useDrawerOptional();
  const isUser = message.role === 'user';
  const isItineraryAdjust = message.itineraryAdjustIntake === true;
  /** 改排：隐藏 Iron Shield / 决策驾驶舱 / 方案墙 / 编排进度；可执行性层仍用同轮 payload */
  const hideItineraryAdjustIronShieldChrome =
    isItineraryAdjust &&
    (message.ironShieldUiSuppressed ||
      message.decisionCockpitUiSuppressed ||
      message.itineraryAdjustAutoApplied ||
      message.itineraryAdjustDraft);
  /** 本条消息的快慢路径（route.ui_hint.mode）；优于外层 currentMode */
  const routeUiHintMode = message.mode ?? mode;
  const isFastMode = routeUiHintMode === 'fast' || message.mode === 'fast';
  const rs = message.reasoningState;
  const isError = message.status === 'failed' && rs?.uiMode !== 'CLARIFYING';
  // 确保 content 是字符串
  const messageContent = typeof message.content === 'string' ? message.content : String(message.content || '');
  const isTimeout = messageContent.includes('超时') || messageContent.includes('TIMEOUT');

  const hasClarifyQuestions = (message.clarificationQuestions?.length ?? 0) > 0;

  const mdBody = assistantBodyAfterStructuredOutcome(message);
  const metaSuppressProse = Boolean(message.poiSuppressAnswerProse);
  const uiSurfaceRaw = typeof message.uiSurface === 'string' ? message.uiSurface.trim() : '';
  const uiSurfaceNorm = uiSurfaceRaw.toLowerCase();
  /** 与 route-and-run 装配契约对齐：咨询面不铺规划壳 */
  const isConsultationSurface = uiSurfaceNorm === 'consultation';
  /**
   * 仅 planning 面渲染行程时间轴 / 编排进度 / 决策日志 / 物理预览等「规划仪表盘」。
   * 未下发 ui_surface 时：仅 interactionKind===planning 兜底（旧响应）。
   */
  const showPlanningDashboard =
    uiSurfaceNorm === 'planning' ||
    (uiSurfaceRaw === '' && message.interactionKind === 'planning');
  const routeRunViewMode =
    message.routeRunViewMode ??
    resolveRouteRunViewModeFromParts({
      status: message.status,
      routeRunSurface: message.routeRunSurface,
      clarificationQuestionCount: message.clarificationQuestions?.length,
      timelineDayCount: message.timelineDayBlocks?.length,
      uiStatus: message.ui_state?.ui_status,
    });

  const showClarificationCard =
    routeRunViewMode === 'clarification' &&
    hasClarifyQuestions &&
    Boolean(onSendClarification);

  const hidePlanningChrome =
    showClarificationCard ||
    (Boolean(message.interactionKind) && shouldHidePlanningChrome(message.interactionKind!));
  /** 可执行性 / narration / 三人格：仅 planning 面；澄清卡场景不展示；咨询面仅调试 */
  const showRouteRunContractLayers =
    !showClarificationCard &&
    (showPlanningDashboard && !isConsultationSurface
      ? true
      : isConsultationSurface && debugUiDefaults === true);
  const hasConsultationDashboardUi =
    isConsultationSurface && Boolean(message.consultationDashboard);
  const taskTypeUpper = (message.taskType ?? '').toUpperCase();
  const routeSuggestsLightQa =
    taskTypeUpper.includes('GENERIC_QA') || taskTypeUpper.includes('DATA_LOOKUP');
  /**
   * U1 事实/闲聊：即使有 consultation_dashboard 也不再渲染地图·维度评分·风险·日程等大骨架，
   * 只保留 answer_text（与 options.intent_mode 对齐时 task_type / interactionKind 可读）。
   */
  const isLightConsultationAnswer =
    message.interactionKind === 'qa' ||
    message.interactionKind === 'lookup' ||
    routeSuggestsLightQa;
  const showConsultationRichDashboard =
    hasConsultationDashboardUi && Boolean(message.consultationDashboard) && !isLightConsultationAnswer;
  /** 规划面：以 timeline 为行程列表主序；poi / orchestration 为补水或兜底 */
  const hasItineraryStructuredData =
    (Array.isArray(message.timelineDayBlocks) && message.timelineDayBlocks.length > 0) ||
    (Array.isArray(message.poiCardsByDay) && message.poiCardsByDay.length > 0) ||
    (!!message.orchestrationResult && hasOrchestrationItineraryDays(message.orchestrationResult));
  /** 纯住宿/酒店检索：勿展示「应用到行程」（会挡住列表与展开按钮） */
  const isAccommodationLookupOnly =
    (Boolean(message.accommodations?.length) || Boolean(message.hotels?.length)) &&
    !hasItineraryStructuredData &&
    !(message.suggestedOperations?.length) &&
    message.interactionKind !== 'planning';
  /**
   * 宽气泡：咨询 Dashboard、多日草案/POI/timeline、住宿卡（含 DATA_LOOKUP / 轻量咨询里 payload.accommodations 或 accommodation_night_groups）等。
   */
  const hasStructuredPanels =
    showConsultationRichDashboard ||
    (showPlanningDashboard &&
      hasItineraryStructuredData &&
      SHOW_PLANNING_ITINERARY_CARDS_IN_AGENT_BUBBLE) ||
    (Array.isArray(message.accommodations) && message.accommodations.length > 0) ||
    (!isConsultationSurface && Array.isArray(message.hotels) && message.hotels.length > 0);
  const hideAssistantAnswerProseForAdjust =
    isItineraryAdjust && Boolean(message.itineraryAdjustResult);
  /** 改排草案/结果卡：占满侧栏宽度，不再套 80% 上限 */
  const hasItineraryAdjustStructuredCard =
    isItineraryAdjust &&
    (Boolean(message.itineraryAdjustResult) || Boolean(message.itineraryAdjustDraft));
  /** 结构化/改排卡等：侧栏内全宽展示，并省略左侧 Bot 头像以腾出横向空间 */
  const assistantBubbleFullWidth =
    hasStructuredPanels ||
    metaSuppressProse ||
    hasItineraryAdjustStructuredCard ||
    showClarificationCard;
  /**
   * 仅 planning 面且有 POI/timeline/多日 itinerary 时压低正文；咨询面始终优先展示 answer_text。
   */
  const hideFullAnswerProse =
    !metaSuppressProse &&
    (routeRunViewMode === 'trip_timeline' ||
      (showPlanningDashboard &&
        hasItineraryStructuredData &&
        SHOW_PLANNING_ITINERARY_CARDS_IN_AGENT_BUBBLE));
  const showTruncatedTripAnswer =
    shouldShowTruncatedAnswerBubble({
      viewMode: routeRunViewMode,
      answerText: mdBody,
      uiSurface: uiSurfaceNorm,
    }) &&
    !debugUiDefaults &&
    !hideAssistantAnswerProseForAdjust;
  const showAnswerSummaryOnly =
    metaSuppressProse &&
    mdBody.trim().length > 0 &&
    !hasConsultationDashboardUi &&
    !hideAssistantAnswerProseForAdjust;
  /** 知识/RAG 长文常被标成 SYSTEM2：用正文特征补渲染 Markdown，避免表格 raw 显示 */
  const isKnowledgeAnswer =
    !hideFullAnswerProse &&
    !metaSuppressProse &&
    !isUser &&
    !isError &&
    (message.interactionKind === 'lookup' ||
      message.interactionKind === 'qa' ||
      looksLikeMarkdown(mdBody));

  const assistantSurface = !isUser
    ? (() => {
        if (isKnowledgeAnswer) {
          return 'border-sky-200/90 bg-gradient-to-b from-sky-50/80 to-background shadow-sm dark:border-sky-800/70 dark:from-sky-950/35 dark:to-background';
        }
        const v = rs?.bubbleVariant;
        if (v === 'info') return 'border-blue-200 bg-blue-50/40';
        if (v === 'warning') return 'border-amber-200 bg-amber-50/40';
        if (v === 'error') return 'border-red-200 bg-red-50/50';
        if (v === 'success') return 'border-emerald-200 bg-emerald-50/35';
        return isFastMode ? 'border-blue-200' : 'border-orange-200';
      })()
    : '';

  const verificationBadgeSoft =
    rs?.softenVerificationBadge && rs.uiMode === 'CLARIFYING'
      ? ({
          label: rs.softVerificationBadgeLabel ?? '信息待补全',
          tone: 'info',
        } as const)
      : rs?.softenVerificationBadge && rs.uiMode === 'CONSTRAINT_WARNING'
        ? ({ label: '约束冲突', tone: 'warning' } as const)
        : undefined;

  const clarifyCodes = rs?.failureCodes ?? [];
  const clarifyTimeGap =
    clarifyCodes.includes('TIME_GAP') || clarifyCodes.includes('MISSING_DATES');

  /** 澄清路径：结构化卡为主，answer_text 仅调试可见 */
  const suppressAnswerForClarification = showClarificationCard && !debugUiDefaults;
  const assistantFullWidth = useAgentSidebarContentFullWidth();
  const structuredContentMaxClass = agentStructuredContentMaxClass(assistantFullWidth);

  const assistantBubbleUsesSidebarWidth = assistantBubbleFullWidth || isKnowledgeAnswer;

  return (
    <div className={cn('flex gap-3 min-w-0', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && !assistantBubbleUsesSidebarWidth && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      <div
        className={cn(
          'rounded-lg px-4 py-3',
          isUser
            ? 'max-w-[80%]'
            : assistantBubbleUsesSidebarWidth
              ? structuredContentMaxClass
              : 'min-w-0 max-w-[80%]',
          isUser
            ? 'bg-primary text-primary-foreground'
            : cn('bg-background border', isError ? 'border-red-200 bg-red-50/50' : assistantSurface)
        )}
      >
        {!isUser &&
          message.status &&
          message.status !== 'failed' &&
          message.status !== 'thinking' &&
          !showClarificationCard && (
            <div className="mb-2">
              <StatusIndicator
                status={message.status}
                uiSurface={message.uiSurface}
                uiHintMessage={message.status === 'done' ? message.uiHintMessage : undefined}
                doneSemantic={
                  message.status === 'done'
                    ? message.interactionKind === 'lookup' || message.interactionKind === 'qa'
                      ? message.interactionKind
                      : message.interactionKind === 'planning'
                        ? 'planning'
                        : 'generic'
                    : undefined
                }
              />
            </div>
          )}
        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        showPlanningDashboard &&
        !isConsultationSurface &&
        !showClarificationCard ? (
          <WorldConstraintBanner
            materialization={message.routeRunExplainOptimization?.world_constraint_materialization}
            className="mb-2"
          />
        ) : null}

        {!isUser && rs?.guidanceHint && !showClarificationCard ? (
          <div
            className={cn(
              'mb-2 flex items-start gap-1.5 rounded-md px-2 py-1 text-[11px]',
              rs.tone === 'info' && 'bg-blue-100/80 text-blue-900',
              rs.tone === 'warning' && 'bg-amber-100/80 text-amber-950'
            )}
          >
            <Info className="h-3.5 w-3.5 shrink-0 opacity-90 mt-0.5" />
            <span className={cn('flex-1', ASSISTANT_BUBBLE_TEXT)}>{rs.guidanceHint}</span>
          </div>
        ) : null}

        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        showRouteRunContractLayers &&
        (message.orchestrationResult ||
          (message.decisionLog?.length ?? 0) > 0 ||
          message.routeRunExplainMirror ||
          message.routeRunSimplifiedExplanation ||
          message.routeRunNoPoiPlanningFlag ||
          (message.timelineDayBlocks?.length ?? 0) > 0 ||
          (message.poiCardsByDay?.length ?? 0) > 0) ? (
          <RouteRunContractLayers
            orchestrationResult={message.orchestrationResult}
            decisionLog={message.decisionLog}
            routeRunExplainMirror={message.routeRunExplainMirror}
            simplifiedExplanation={message.routeRunSimplifiedExplanation ?? undefined}
            timelineDayBlocks={message.timelineDayBlocks}
            poiCardsByDay={message.poiCardsByDay}
            routeRunNoPoiPlanningFlag={message.routeRunNoPoiPlanningFlag}
            safetySurface={message.safetySurface}
            preferZhLabels={preferZhLabels}
            debugUiDefaults={debugUiDefaults}
            answerTextForDayNarration={mdBody}
            suppressGuardianPersonas={isItineraryAdjust}
            onSuggestedRouteRun={onSuggestedRouteRun}
            timezone={tripTimezone}
            tripPoiSchedules={tripPoiSchedules}
          />
        ) : null}

        {/* 错误消息特殊处理 */}
        {isError && (
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
              <XCircle className="w-3 h-3 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 mb-1">
                {isTimeout ? '⚠️ 哎呀，请求超时了...' : '⚠️ 出了一点小状况'}
              </p>
              <p className="text-xs text-red-700 mb-3 whitespace-pre-wrap">
                {isTimeout
                  ? '可能是网络问题或服务繁忙。要不要再试一次？'
                  : message.debugBundle || message.content === 'TIMEOUT' || message.content === 'FAILED'
                    ? messageContent
                    : message.content.replace('出了一点小状况，要不再试一次？', '').trim() ||
                      '可能是网络问题或服务繁忙。要不要再试一次？'}
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                {message.debugBundle ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs rounded-full border-red-200 text-red-700 hover:bg-red-50"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(JSON.stringify(message.debugBundle, null, 2));
                        toast.success('已复制排障上下文（含 request_id）');
                      } catch {
                        toast.error('复制失败');
                      }
                    }}
                  >
                    一键复制排障上下文
                  </Button>
                ) : null}
                {onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs rounded-full border-red-200 text-red-700 hover:bg-red-50"
                    onClick={onRetry}
                  >
                    <RotateCw className="w-3 h-3 mr-1.5" />
                    重新尝试
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {!isError && message.replayResult ? (
          <ReplayResultCard replayResult={message.replayResult} />
        ) : null}
        
        {!isError && !message.replayResult && isUser ? (
          <p className="text-sm whitespace-pre-wrap text-primary-foreground">{messageContent}</p>
        ) : null}
        {!isError && !message.replayResult && !isUser ? (
          message.status === 'thinking' ? (
            <PlannerThinkingLoading
              compact
              size={36}
              label={messageContent.trim() || undefined}
              progress={message.routeRunAsyncProgress}
              className="px-0 py-0"
              textClassName="text-sm text-muted-foreground"
            />
          ) : (
          <>
            {showAnswerSummaryOnly ? (
              <p
                className={cn(
                  'text-sm text-foreground/95 leading-snug line-clamp-3 mb-1 border-l-2 border-primary/25 pl-2.5',
                  ASSISTANT_BUBBLE_TEXT
                )}
                title={mdBody.length > 160 ? mdBody : undefined}
              >
                {mdBody}
              </p>
            ) : showTruncatedTripAnswer ? (
              <p
                className={cn(
                  'text-sm text-muted-foreground leading-snug mb-1 border-l-2 border-border/60 pl-2.5',
                  ASSISTANT_BUBBLE_TEXT
                )}
                title={mdBody.length > 120 ? mdBody : undefined}
              >
                {truncateAnswerTextForBubble(mdBody)}
              </p>
            ) : (!showConsultationRichDashboard || isConsultationSurface) &&
              !hideFullAnswerProse &&
              !metaSuppressProse &&
              !suppressAnswerForClarification &&
              !hideAssistantAnswerProseForAdjust ? (
              <>
                {message.ragStructured ? <RagStructuredOutcomeCard outcome={message.ragStructured} /> : null}
                {(() => {
                  if (!mdBody.trim()) return null;
                  return isKnowledgeAnswer ? (
                    <AssistantMarkdown text={mdBody} isUser={false} />
                  ) : (
                    <p className={cn('text-sm text-foreground', ASSISTANT_BUBBLE_TEXT)}>{mdBody}</p>
                  );
                })()}
              </>
            ) : null}
            {showConsultationRichDashboard ? (
              <ConsultationDashboard
                dashboard={message.consultationDashboard!}
                suggestedOperations={message.suggestedOperations}
                onSuggestedRouteRun={onSuggestedRouteRun}
                chatSending={chatSending}
                clarificationSubmitDisabled={clarificationSubmitDisabled}
                className="mt-1"
              />
            ) : null}
            {/* consultation 面不以「顾问全文」折叠套娃；仅非咨询且带半结构化 Dashboard 时保留 */}
            {!isConsultationSurface && showConsultationRichDashboard && mdBody.trim() ? (
              <Collapsible className="mt-4 rounded-xl border border-border/70 bg-muted/15">
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-full justify-between gap-2 rounded-xl px-3 text-left text-xs font-medium text-foreground [&[data-state=open]_svg:last-child]:rotate-90"
                  >
                    <span>顾问全文（详细解读）</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3 pt-0 space-y-2">
                  {message.ragStructured ? <RagStructuredOutcomeCard outcome={message.ragStructured} /> : null}
                  {isKnowledgeAnswer ? (
                    <AssistantMarkdown text={mdBody} isUser={false} />
                  ) : (
                    <p className={cn('text-sm text-foreground', ASSISTANT_BUBBLE_TEXT)}>{mdBody}</p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ) : null}
            {!isConsultationSurface &&
            showPlanningDashboard &&
            !hideItineraryAdjustIronShieldChrome &&
            message.routeRunExplainOptimization ? (
              <OptimizationExplainBlock
                optimization={message.routeRunExplainOptimization}
                tier={debugUiDefaults ? 'L2' : 'L1'}
                className="mt-2"
              />
            ) : null}
            {!isConsultationSurface &&
            showPlanningDashboard &&
            !hideItineraryAdjustIronShieldChrome &&
            hasDecisionCockpitUi(message.routeRunDecisionCockpit) ? (
              <DecisionCockpitPanel
                cockpit={message.routeRunDecisionCockpit}
                compact
                className="mt-2"
              />
            ) : null}
          </>
          )
        ) : null}

        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        isItineraryAdjust &&
        message.itineraryAdjustResult ? (
          <ItineraryAdjustResultCard
            result={message.itineraryAdjustResult}
            autoApplied={message.itineraryAdjustAutoApplied}
            autoApplyReason={message.itineraryAdjustAutoApplyReason}
            debugUiDefaults={debugUiDefaults}
            timelineDayBlocks={message.timelineDayBlocks}
            fallbackTimelineDayBlocks={fallbackTimelineDayBlocks}
            supplementaryAnswerText={mdBody.trim() || undefined}
            poiCardsByDay={
              message.poiCardsByDay && message.poiCardsByDay.length > 0
                ? message.poiCardsByDay
                : undefined
            }
          />
        ) : null}

        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        isItineraryAdjust &&
        !message.itineraryAdjustResult &&
        message.itineraryAdjustDraft ? (
          <div className="mb-3 rounded-lg border border-amber-200/90 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-medium">优化草案，确认后写入正式行程</p>
            {message.itineraryAdjustScopeDate ? (
              <p className="mt-0.5 text-amber-900/80 dark:text-amber-200/80">
                目标日：{message.itineraryAdjustScopeDate}
              </p>
            ) : null}
            {message.itineraryAdjustAutoApplyReason === 'unresolved_places' ? (
              <p className="mt-1 text-amber-800 dark:text-amber-200">部分地点无法写入，请确认后重试。</p>
            ) : null}
          </div>
        ) : null}

        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        isItineraryAdjust &&
        !message.itineraryAdjustResult &&
        message.itineraryAdjustAutoApplied ? (
          <div className="mb-3 rounded-lg border border-emerald-200/90 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-950">
            <p className="font-medium">已更新正式行程</p>
            <p className="mt-0.5 text-emerald-900/80">左侧时间轴已同步，请查看更新后的日程。</p>
          </div>
        ) : null}

        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        showPlanningDashboard &&
        SHOW_PLANNING_ITINERARY_CARDS_IN_AGENT_BUBBLE &&
        !(isItineraryAdjust && message.itineraryAdjustResult) ? (
          <>
            {message.timelineDayBlocks && message.timelineDayBlocks.length > 0 ? (
              <DegradedItineraryPreview
                variant="timeline"
                days={message.timelineDayBlocks}
                poiDayBlocks={
                  message.poiCardsByDay && message.poiCardsByDay.length > 0
                    ? message.poiCardsByDay
                    : undefined
                }
                showPlaceLink={debugUiDefaults === true}
                safetySurface={message.safetySurface}
              />
            ) : message.poiCardsByDay && message.poiCardsByDay.length > 0 ? (
              <PoiCardsByDayPanel
                days={message.poiCardsByDay}
                className={cn('mt-3', structuredContentMaxClass)}
                showDebugFields={debugUiDefaults}
                orchestrationResult={message.orchestrationResult}
                safetySurface={message.safetySurface}
              />
            ) : message.orchestrationResult ? (
              <DegradedItineraryPreview
                variant="orchestration"
                orchestrationResult={message.orchestrationResult}
                poiDayBlocks={
                  message.poiCardsByDay && message.poiCardsByDay.length > 0
                    ? message.poiCardsByDay
                    : undefined
                }
                showPlaceLink={debugUiDefaults === true}
                safetySurface={message.safetySurface}
              />
            ) : null}
            {message.safetySurface &&
            !(message.timelineDayBlocks && message.timelineDayBlocks.length > 0) &&
            !message.orchestrationResult &&
            !(message.poiCardsByDay && message.poiCardsByDay.length > 0) ? (
              <div
                className={cn(
                  'mt-3 rounded-lg border border-amber-200/70 bg-amber-50/30 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/20',
                  structuredContentMaxClass
                )}
              >
                <SafetySmartUpdateStrip surface={message.safetySurface} />
              </div>
            ) : null}
          </>
        ) : null}

        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        isConsultationSurface &&
        !hasConsultationDashboardUi &&
        debugUiDefaults &&
        hasItineraryStructuredData ? (
          <p className="mt-2 text-[10px] leading-snug text-muted-foreground border border-dashed border-border/80 rounded-md px-2 py-1.5 font-mono">
            ui_surface: consultation — 已隐藏行程类卡片（timeline / poi_cards_by_day /
            orchestration days）；payload 内仍可能含这些数据。
          </p>
        ) : null}

        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        showPlanningDashboard &&
        message.actionExecutionPreview &&
        message.actionExecutionPreview.action_previews &&
        message.actionExecutionPreview.action_previews.length > 0 ? (
          <ActionExecutionPreviewPanel
            preview={message.actionExecutionPreview}
            pendingActions={
              Array.isArray(message.actionExecutionPending) ? message.actionExecutionPending : undefined
            }
            orchestrationResult={message.orchestrationResult}
            tripId={activeTripId ?? undefined}
            messageId={message.id}
            adoptBusyKey={adoptHealingBusyKey ?? undefined}
            onAdoptHealingPreview={onAdoptHealingPreview}
            suppressAnswerDuplicationNote={
              mdBody.includes('物理门') ||
              mdBody.includes('建议型修复') ||
              mdBody.includes('【物理门')
            }
          />
        ) : null}

        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        !isConsultationSurface &&
        message.liveSensorAudit ? (
          <LiveSensorAuditBlock audit={message.liveSensorAudit} />
        ) : null}

        {/* DATA_LOOKUP / 轻量咨询：payload.accommodations 或 accommodation_night_groups（已由 extract 扁平化）→ 与规划页同一套 AccommodationList */}
        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        message.accommodations &&
        message.accommodations.length > 0 ? (
          <AccommodationList
            accommodations={message.accommodations}
            tripId={activeTripId ?? undefined}
            sessionId={
              message.planningAssistantSessionId ??
              planningAssistantSessionId ??
              undefined
            }
            defaultCheckIn={tripStayDates?.checkIn}
            defaultCheckOut={tripStayDates?.checkOut}
            userId={userId}
            onAddToTripSuccess={onTripDataRefresh}
            disclaimerZh={message.accommodationDisclaimerZh}
            layout={assistantFullWidth ? 'flow' : 'scroll-contained'}
            className="mt-3"
          />
        ) : null}

        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        !isConsultationSurface &&
        (!message.accommodations?.length) &&
        message.hotels &&
        message.hotels.length > 0 ? (
          <HotelList
            hotels={message.hotels}
            layout={assistantFullWidth ? 'flow' : 'scroll-contained'}
            className="mt-3"
          />
        ) : null}

        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        message.flightInventorySnapshot ? (
          <FlightInventorySnapshotPanel snapshot={message.flightInventorySnapshot} />
        ) : null}

        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        !isConsultationSurface &&
        message.carRentals &&
        message.carRentals.length > 0 ? (
          <>
            {message.carRentalFallbackDatesUsed ? (
              <div
                className="mt-3 flex gap-2 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-xs text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100"
                role="status"
              >
                <Info className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <p className="leading-relaxed">
                  当前取还车日期为系统兜底推测。请在工作台补全行程起止日期后再查一次，报价会更准确。
                </p>
              </div>
            ) : null}
            <CarRentalList
              rentals={message.carRentals}
              className={message.carRentalFallbackDatesUsed ? 'mt-2' : 'mt-3'}
            />
          </>
        ) : null}

        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        message.intentActionChips &&
        message.intentActionChips.length > 0 &&
        onIntentChipSelect ? (
          <IntentActionChips
            chips={message.intentActionChips}
            disabled={!!clarificationSubmitDisabled}
            className="mt-3"
            onSelect={onIntentChipSelect}
          />
        ) : null}

        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        message.suggestedOperations &&
        message.suggestedOperations.length > 0 &&
        onSuggestedRouteRun ? (
          <SuggestedOperationsBar
            operations={message.suggestedOperations}
            onRouteRunMessage={onSuggestedRouteRun}
            disabled={!!clarificationSubmitDisabled || !!chatSending}
            className="mt-3"
          />
        ) : null}

        {debugUiDefaults &&
        !isUser &&
        !isError &&
        message.status !== 'thinking' &&
        (message.taskType ||
          message.routeDecisionTaskType ||
          message.routePolicy ||
          message.uiSurface ||
          message.orchestrationModeFinal ||
          message.isCacheReplay !== undefined ||
          message.kbRagCitationCount != null ||
          message.kbRagHit !== undefined) ? (
          <div className="mt-2 border-t border-dashed pt-2 font-mono text-[10px] text-muted-foreground break-all">
            system_mode: {message.observabilitySystemMode ?? '—'} · ui_surface: {message.uiSurface ?? '—'} ·
            ui_hint.message: {message.uiHintMessage ?? '—'} · routing_task_type: {message.taskType ?? '—'} ·
            route.task_type: {message.routeDecisionTaskType ?? '—'} · route_policy: {message.routePolicy ?? '—'} ·
            ui_kind: {message.interactionKind ?? '—'} · replay:{' '}
            {message.isCacheReplay === true ? 'cache' : message.isCacheReplay === false ? 'live' : '—'} ·
            orchestration_mode_final: {message.orchestrationModeFinal ?? '—'}
            {message.kbRagCitationCount != null ? ` · kb_rag_citation_count: ${message.kbRagCitationCount}` : ''}
            {message.kbRagHit !== undefined && message.kbRagHit !== null
              ? ` · kb_rag_hit: ${formatDebugJsonSnippet(message.kbRagHit)}`
              : ''}
          </div>
        ) : null}

        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        activeTripId &&
        hidePlanningChrome &&
        !isAccommodationLookupOnly &&
        !isItineraryAdjust &&
        (message.interactionKind === 'lookup' || message.interactionKind === 'qa') &&
        onApplySuggestToTrip ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 rounded-full text-xs"
              onClick={onApplySuggestToTrip}
            >
              将以上建议应用到当前行程
            </Button>
          </div>
        ) : null}

        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        isItineraryAdjust &&
        message.itineraryAdjustDraft &&
        onApplyItineraryAdjustDraft ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-8 rounded-full text-xs"
              disabled={!!clarificationSubmitDisabled || !!chatSending}
              onClick={() => onApplyItineraryAdjustDraft?.(message)}
            >
              应用到行程
            </Button>
          </div>
        ) : null}

        {!isUser && !isError && message.status !== 'thinking' && rs?.uiMode === 'CLARIFYING' && !showClarificationCard ? (
          <div className="mt-3 rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-50 to-background px-3 py-2.5 text-xs text-blue-950 shadow-sm motion-safe:animate-pulse">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">还差一点点信息</p>
                <p className="text-blue-800/90 mt-1 leading-relaxed">
                  {clarifyTimeGap
                    ? '告诉我出发与返程日期，我会结合季节与路况为您准备可验证的证据与方案。'
                    : '告诉我目的地或偏好区域，我会据此补齐下一步建议。'}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        showClarificationCard ? (
          <AgentClarificationQuestionsCard
            questions={message.clarificationQuestions!}
            disabled={clarificationSubmitDisabled}
            guidanceHint={rs?.guidanceHint}
            debugUiDefaults={debugUiDefaults}
            onSubmitClarification={(payload) => {
              void onSendClarification!(payload);
            }}
          />
        ) : null}

        {suppressAnswerForClarification && debugUiDefaults && mdBody.trim() ? (
          <details className="mt-2 rounded border border-dashed border-border/80 px-2 py-1.5 text-[10px]">
            <summary className="cursor-pointer text-muted-foreground select-none">answer_text（调试 · 含 L3）</summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono leading-snug text-muted-foreground">
              {mdBody}
            </pre>
          </details>
        ) : null}

        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        showPlanningDashboard &&
        !hideItineraryAdjustIronShieldChrome &&
        !hidePlanningChrome && (
          <>
            <OrchestrationProgressCard
              ui_state={message.ui_state}
              orchestrationResult={message.orchestrationResult}
              explainGuardianMirror={message.routeRunExplainMirror}
              constraintSinkAnchor={message.memoryConstraintSinkAnchor}
              onOpenEvidenceDrawer={
                drawerCtx
                  ? ({ highlightPatchId }) => {
                      const anchor = message.memoryConstraintSinkAnchor;
                      if (!anchor) return;
                      drawerCtx.setMemoryConstraintSink({
                        hydrated: true,
                        applied_keys: anchor.applied_keys,
                        patch_ids: anchor.patch_ids,
                        overridden_by_request_keys: anchor.overridden_by_request_keys,
                      });
                      drawerCtx.setConstraintSinkDecisionLog(
                        message.memoryConstraintSinkDecisionLog ?? null
                      );
                      drawerCtx.setHighlightPatchId(highlightPatchId);
                      drawerCtx.setDrawerTab('memory');
                      drawerCtx.setDrawerOpen(true);
                    }
                  : undefined
              }
              preferZhLabels={preferZhLabels}
            />
            {!rs?.hideEvidenceCard ? (
              <IronShieldEvidenceCards
                evidenceBundle={message.evidenceBundle}
                evidenceCards={message.evidenceCards}
                evidenceCardsUi={message.evidenceCardsUi}
                evidencePresentation={rs?.evidencePresentation ?? 'default'}
                verificationBadgeSoft={verificationBadgeSoft}
                showAuditFailureCodes={rs?.uiMode !== 'CLARIFYING'}
                defaultOpen={rs?.evidencePresentation === 'constraint_warning'}
                preferZhLabels={preferZhLabels}
              />
            ) : null}
            <CandidatesPanel
              candidates={message.candidates}
              alternatives={
                (message.routeRunExplainOptimization?.alternatives?.length ?? 0) > 0
                  ? message.routeRunExplainOptimization!.alternatives
                  : message.alternatives
              }
            />
            <RouteInfoCard
              routeInfo={message.routeInfo}
              routeType={message.routeType}
              cacheReplay={message.isCacheReplay}
              defaultExpanded={routeUiHintMode === 'slow'}
              preferZhLabels={preferZhLabels}
            />
          </>
        )}

        {/* 决策日志（固定置于助手气泡最底部；仅展示编排条目，RAG 见各条「证据引用」） */}
        {!isUser &&
        !isError &&
        message.status !== 'thinking' &&
        (message.decisionLog?.length ?? 0) > 0 ? (
          <div className="mt-3 border-t border-border/50 pt-2">
            <DecisionLogCard
              decisionLog={message.decisionLog}
              defaultExpanded={routeUiHintMode === 'slow'}
              preferZhLabels={preferZhLabels}
            />
          </div>
        ) : null}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
      )}
    </div>
  );
}

export default function AgentChat({
  activeTripId,
  onSystem2Response,
  className,
  entryPoint,
  readonlyMode,
  pageMode,
  routeContextType,
  attachActiveTripSummaryContext = false,
  enableLiveTools,
  intentFlags,
  personaHint,
  enableGuardiansDebateLlm,
  onSendMessageReady,
  onClearReady,
}: AgentChatProps) {
  /** 与 Agent 页一致：缺省为 user，避免未显式传 props 时外露回放/What-if */
  const effectivePageMode: AgentPageMode = pageMode ?? 'user';
  const showAgentDebugTools = effectivePageMode !== 'user';
  const debugUiDefaults = effectivePageMode === 'debug';

  const navigate = useNavigate();
  const { user } = useAuth();
  const planStudioContext = useContext(PlanStudioContext);
  const { i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  /** 自动 / 规划 / 检索咨询(DATA_LOOKUP) / 泛问答(GENERIC_QA)，对齐 options.intent_mode */
  const [userIntentMode, setUserIntentMode] = useState<UserExplicitIntentMode>(() =>
    defaultUserIntentModeForEntry(entryPoint, Boolean(sanitizeRouteRunTripId(activeTripId)))
  );
  const [loadingUiLabel, setLoadingUiLabel] = useState('');
  const [routeRunAsyncProgress, setRouteRunAsyncProgress] = useState<number | undefined>();
  const routeRunPollAbortRef = useRef<AbortController | null>(null);
  const planningTaskBusy = usePlanningTaskStore((s) => s.status === 'PROCESSING');
  const [currentMode, setCurrentMode] = useState<'fast' | 'slow'>('fast');
  const selectedLLMProvider: LLMProvider = 'auto';
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastRouteRequestRef = useRef<RouteAndRunRequest | null>(null);
  const lastRouteRunDurableTripRunIdRef = useRef<string | undefined>(undefined);
  const planningAssistantSessionIdRef = useRef<string | null>(null);

  // Story B/C 调试用约束（emergency_constraints）
  const [constraintsDialogOpen, setConstraintsDialogOpen] = useState(false);
  const [preferredModesText, setPreferredModesText] = useState(''); // e.g. "TRANSIT,RAIL"
  const [forbiddenModesText, setForbiddenModesText] = useState(''); // e.g. "DRIVE,MOTORCYCLE"
  const [maxWindToleranceText, setMaxWindToleranceText] = useState(''); // number string
  const [reasonCodeText, setReasonCodeText] = useState(''); // optional reason_code
  const [constraintsMeta, setConstraintsMeta] = useState<ConstraintsMetaResponse | null>(null);
  const [constraintsMetaLoading, setConstraintsMetaLoading] = useState(false);
  const [preferredModesPickerOpen, setPreferredModesPickerOpen] = useState(false);
  const [forbiddenModesPickerOpen, setForbiddenModesPickerOpen] = useState(false);

  // 审批相关状态
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  
  // 浏览器授权相关状态
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [pendingConsentRequest, setPendingConsentRequest] = useState<RouteAndRunRequest | null>(null);

  // 协商 / 时间轴（Decision OS v1.0）
  const [negotiationDialogOpen, setNegotiationDialogOpen] = useState(false);
  const [negotiationPayload, setNegotiationPayload] = useState<NegotiationPayload | null>(null);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [negotiationAuditRequestId, setNegotiationAuditRequestId] = useState<string | null>(null);
  const [replayTimelineOpen, setReplayTimelineOpen] = useState(false);
  const [replayWhatIfOpen, setReplayWhatIfOpen] = useState(false);
  const [replayCounterfactualOpen, setReplayCounterfactualOpen] = useState(false);
  const [replayTripRunId, setReplayTripRunId] = useState('');
  const [whatIfAssumptionsJson, setWhatIfAssumptionsJson] = useState('[\n  {\n    "name": "wind_speed",\n    "value": "high"\n  }\n]');
  const [counterfactualPayloadJson, setCounterfactualPayloadJson] = useState('{\n  "hypothesis": "如果不选择当前方案，准时率是否会提升？"\n}');
  const [replayLoading, setReplayLoading] = useState(false);
  /** 协商确认 409：阻挡主对话区，避免冲突状态下继续发指令 */
  const [negotiationConflictBlocking, setNegotiationConflictBlocking] = useState(false);

  // 行程洞察状态（用于上下文感知开场白）
  const [tripInsight, setTripInsight] = useState<TripInsightResponse | null>(null);
  const [tripInsightLoading, setTripInsightLoading] = useState(false);
  const [tripPoiSchedules, setTripPoiSchedules] = useState<TimelinePoiScheduleContext[]>([]);
  /** route_and_run.preference_profile：敏感度 + 已完成体能问卷时的 fitness_level */
  const routeRunPreferenceProfile = useRouteRunPreferenceProfile(activeTripId);
  const fitnessContext = useOptionalFitnessContext();
  const routeRunPreferenceProfileMerged = useMemo(
    () =>
      mergePreferenceProfileForRouteAndRun(
        routeRunPreferenceProfile,
        fitnessContext
          ? buildFitnessPreferenceProfilePatch({
              hasCompletedAssessment: fitnessContext.hasCompletedAssessment,
              fitnessLevel: fitnessContext.fitnessLevel,
              overallScore: fitnessContext.overallScore,
            })
          : undefined
      ),
    [routeRunPreferenceProfile, fitnessContext]
  );
  /** 仅 UUID 形 Trip.id 会随 route_and_run / insight 上报；非法占位符视为未绑定 */
  const sanitizedTripId = useMemo(() => sanitizeRouteRunTripId(activeTripId), [activeTripId]);
  const chatStorageKey = useMemo(
    () => buildAgentChatStorageKey(sanitizedTripId, entryPoint),
    [sanitizedTripId, entryPoint]
  );
  const chatStorageKeyRef = useRef<string | null>(null);
  const skipChatPersistRef = useRef(true);
  /** 已有行程 + 用户模式：去掉调试按钮等（pageMode 控制）；意图模式仍为底部下拉 */
  const compactAgentChrome = Boolean(sanitizedTripId) && effectivePageMode === 'user';
  const invalidTripIdToastShown = useRef(false);

  const revivePersistedMessages = useCallback((rows: AgentChatPersistedMessage[]): Message[] => {
    return rows.map((row) => {
      const { timestamp, ...rest } = row;
      return {
        ...(rest as Omit<Message, 'timestamp'>),
        timestamp: new Date(timestamp),
      };
    });
  }, []);

  /** 换行程 / 入口分桶：加载该桶历史；进行中轮询中止 */
  useEffect(() => {
    if (chatStorageKeyRef.current === chatStorageKey) return;
    chatStorageKeyRef.current = chatStorageKey;
    skipChatPersistRef.current = true;
    routeRunPollAbortRef.current?.abort();
    routeRunPollAbortRef.current = null;
    setLoading(false);
    setLoadingUiLabel('');
    setRouteRunAsyncProgress(undefined);
    setNegotiationConflictBlocking(false);
    const stored = loadAgentChatHistory(chatStorageKey);
    setMessages(stored?.length ? revivePersistedMessages(stored) : []);
    setInput('');
    planStudioContext?.clearItineraryAdjustDraftPreview();
  }, [chatStorageKey, revivePersistedMessages, planStudioContext]);

  /** 会话变更写入 localStorage（跳过 thinking；加载分桶后跳过一次避免覆盖） */
  useEffect(() => {
    if (skipChatPersistRef.current) {
      skipChatPersistRef.current = false;
      return;
    }
    const serialized = serializeAgentChatMessages(messages);
    if (serialized.length === 0) {
      clearAgentChatHistory(chatStorageKey);
      return;
    }
    saveAgentChatHistory(chatStorageKey, serialized);
  }, [messages, chatStorageKey]);

  useEffect(() => {
    return () => {
      routeRunPollAbortRef.current?.abort();
    };
  }, []);

  /** 物理预览「采纳并重新预览」进行中（messageId:option_id） */
  const [adoptHealingBusyKey, setAdoptHealingBusyKey] = useState<string | null>(null);

  const handleAdoptHealingPreview: AdoptHealingPreviewHandler = useCallback(
    async (params) => {
      const tid = sanitizedTripId;
      if (!tid) {
        toast.error('需要绑定有效行程（trip_id）才能发起预览');
        return;
      }
      const busyKey = `${params.messageId}:${params.option_id}`;
      setAdoptHealingBusyKey(busyKey);
      try {
        const orch = applyHealedInputToOrchestrationActionPlan(
          params.orchestrationResult,
          params.actionId,
          params.healed_action_input
        );
        const actions = buildAgentPreviewActionsFromOrchestration(orch);
        if (actions.length === 0) {
          toast.error('编排结果中缺少 itinerary.action_plan，无法组装预览请求');
          return;
        }
        const raw = await postAgentActionPreview({
          trip_id: tid,
          request_id: newAgentPreviewRequestId(),
          actions,
        });
        const secondPreview =
          extractActionExecutionPreviewFromAgentPreviewResponse(raw) ??
          ({
            status: typeof raw.status === 'string' ? raw.status : 'OK',
            message: typeof raw.message === 'string' ? raw.message : undefined,
            action_previews: raw.action_previews,
            context_signature:
              typeof raw.context_signature === 'string' ? raw.context_signature : undefined,
          } as ActionExecutionPreviewPayload);
        const summaryLines: string[] = [];
        if (secondPreview.message?.trim()) summaryLines.push(secondPreview.message.trim());
        if (secondPreview.context_signature) {
          summaryLines.push(`context_signature: ${secondPreview.context_signature}`);
        }
        if (secondPreview.action_previews?.length) {
          summaryLines.push(
            ...secondPreview.action_previews.map((ap) => `- ${ap.action_id}: ${ap.status}`)
          );
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-heal-preview-${Date.now()}`,
            role: 'assistant',
            content:
              summaryLines.length > 0
                ? ['【二次物理预览】', '', ...summaryLines].join('\n')
                : '【二次物理预览】已完成，详见下方结构化卡片。',
            timestamp: new Date(),
            status: 'done',
            orchestrationResult: orch ?? params.orchestrationResult ?? undefined,
            ...(secondPreview.action_previews?.length ? { actionExecutionPreview: secondPreview } : {}),
            interactionKind: 'planning',
            observabilitySystemMode: 'SYSTEM2',
          },
        ]);
        toast.success('已根据建议重新预览（下一步可申请 Commit）');
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : '预览失败');
      } finally {
        setAdoptHealingBusyKey(null);
      }
    },
    [sanitizedTripId]
  );

  /** 绑定行程且有合法起止日时，才展示酒店入住离店卡片 */
  const tripHotelPreflightDates = useMemo(() => {
    if (!tripInsight?.tripSummary?.startDate || !tripInsight?.tripSummary?.endDate) return null;
    const startDateIso = toDateOnlyIso(tripInsight.tripSummary.startDate);
    const endDateIso = toDateOnlyIso(tripInsight.tripSummary.endDate);
    if (!startDateIso || !endDateIso) return null;
    return {
      startDateIso,
      endDateIso,
      destination: tripInsight.tripSummary.destination,
    };
  }, [tripInsight]);

  const tripTimezone = useMemo(
    () =>
      resolveDestinationTimezone(
        tripInsight?.tripSummary?.destination?.trim() || undefined
      ),
    [tripInsight?.tripSummary?.destination]
  );

  const reloadTripPoiSchedules = useCallback(async () => {
    if (!sanitizedTripId) {
      setTripPoiSchedules([]);
      return;
    }
    try {
      const schedules = await fetchTripPoiSchedules(sanitizedTripId);
      setTripPoiSchedules(schedules);
    } catch {
      setTripPoiSchedules([]);
    }
  }, [sanitizedTripId]);

  useEffect(() => {
    void reloadTripPoiSchedules();
  }, [reloadTripPoiSchedules]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScheduleRefresh = () => {
      void reloadTripPoiSchedules();
    };
    window.addEventListener('plan-studio:schedule-refresh', onScheduleRefresh);
    return () => window.removeEventListener('plan-studio:schedule-refresh', onScheduleRefresh);
  }, [reloadTripPoiSchedules]);

  /** 用户输入「推荐酒店」等后展示的日期确认卡片（非欢迎页默认露出） */
  const [showHotelPreflightCard, setShowHotelPreflightCard] = useState(false);

  // 检查是否处于等待确认/授权状态
  const isAwaitingConfirmation = messages.some(
    (m) => m.status === 'awaiting_confirmation' || m.status === 'awaiting_consent'
  );

  // 加载行程洞察（规划工作台 / 绑定行程且注入 active_trip_summary 时，用于 structured_travel_input）
  useEffect(() => {
    const loadTripInsight = async () => {
      if (!sanitizedTripId) {
        setTripInsight(null);
        return;
      }
      const shouldLoad =
        entryPoint === 'planning_workbench' || attachActiveTripSummaryContext === true;
      if (!shouldLoad) {
        setTripInsight(null);
        return;
      }
      setTripInsightLoading(true);
      try {
        const insight = await tripsApiModule.itineraryItemsApi.getInsight(sanitizedTripId);
        setTripInsight(insight);
      } catch (err) {
        console.error('Failed to load trip insight:', err);
        setTripInsight(null);
      } finally {
        setTripInsightLoading(false);
      }
    };
    loadTripInsight();
  }, [sanitizedTripId, entryPoint, attachActiveTripSummaryContext]);

  useEffect(() => {
    const loadConstraintsMeta = async () => {
      setConstraintsMetaLoading(true);
      try {
        const meta = await agentApi.getConstraintsMeta();
        setConstraintsMeta(meta);
      } catch (err) {
        // 静默降级：保持本地默认映射
        console.warn('[Agent Chat] constraints meta 加载失败，回退本地默认映射', err);
        setConstraintsMeta(null);
      } finally {
        setConstraintsMetaLoading(false);
      }
    };
    void loadConstraintsMeta();
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const DEFAULT_MODE_ALIASES: Record<string, string> = {
    // 中文别名
    公共交通: 'TRANSIT',
    公交: 'TRANSIT',
    地铁: 'TRANSIT',
    火车: 'RAIL',
    铁路: 'RAIL',
    自驾: 'DRIVE',
    开车: 'DRIVE',
    摩托: 'MOTORCYCLE',
    摩托车: 'MOTORCYCLE',
    步行: 'WALK',
    走路: 'WALK',
    骑行: 'BICYCLE',
    自行车: 'BICYCLE',
    打车: 'TAXI',
    出租车: 'TAXI',
    // 英文/枚举别名
    transit: 'TRANSIT',
    rail: 'RAIL',
    drive: 'DRIVE',
    car: 'DRIVE',
    motorcycle: 'MOTORCYCLE',
    walk: 'WALK',
    bicycle: 'BICYCLE',
    bike: 'BICYCLE',
    taxi: 'TAXI',
  };

  const modeAliases = useMemo(() => {
    const metaAliases: Record<string, string> = {};
    const modes = constraintsMeta?.transport_modes ?? [];
    modes.forEach((m) => {
      const value = (m.value || '').trim().toUpperCase();
      if (!value) return;
      metaAliases[value] = value;
      if (m.label_zh) metaAliases[m.label_zh] = value;
      if (m.label_en) {
        metaAliases[m.label_en] = value;
        metaAliases[m.label_en.toLowerCase()] = value;
      }
      (m.aliases || []).forEach((alias) => {
        if (!alias) return;
        metaAliases[alias] = value;
        metaAliases[alias.toLowerCase()] = value;
      });
    });
    return { ...DEFAULT_MODE_ALIASES, ...metaAliases };
  }, [constraintsMeta]);

  const normalizeModeToken = (raw: string): string => {
    const token = raw.trim();
    if (!token) return '';
    const byAlias = modeAliases[token] || modeAliases[token.toLowerCase()];
    return (byAlias || token.toUpperCase()).trim();
  };

  const parseCsv = (s: string) =>
    s
      .split(',')
      .map((x) => normalizeModeToken(x))
      .filter(Boolean);

  const defaultTransportModes = useMemo<TransportModeMeta[]>(
    () => [
      { value: 'TRANSIT', label_zh: '公共交通' },
      { value: 'RAIL', label_zh: '火车' },
      { value: 'DRIVE', label_zh: '自驾' },
      { value: 'MOTORCYCLE', label_zh: '摩托' },
      { value: 'WALK', label_zh: '步行' },
      { value: 'BICYCLE', label_zh: '骑行' },
      { value: 'TAXI', label_zh: '打车' },
    ],
    []
  );

  const transportModes = useMemo(() => {
    const modes = constraintsMeta?.transport_modes;
    if (Array.isArray(modes) && modes.length > 0) return modes;
    return defaultTransportModes;
  }, [constraintsMeta, defaultTransportModes]);

  const modeLabel = (mode: string) => {
    const m = mode.toUpperCase();
    const fromMeta = (constraintsMeta?.transport_modes ?? []).find((x) => x.value?.toUpperCase() === m);
    if (fromMeta?.label_zh) return fromMeta.label_zh;
    const map: Record<string, string> = {
      TRANSIT: '公共交通',
      RAIL: '火车',
      DRIVE: '自驾',
      MOTORCYCLE: '摩托',
      WALK: '步行',
      BICYCLE: '骑行',
      TAXI: '打车',
    };
    return map[m] || mode;
  };

  const inputPlaceholder = useMemo(() => {
    if (userIntentMode === 'data_lookup') return '事实类、攻略检索…（强制检索档 DATA_LOOKUP）';
    if (userIntentMode === 'generic_qa') return '闲聊、总结、泛问答…（GENERIC_QA，非强制检索）';
    if (userIntentMode === 'planning') return '说明想怎么改行程、交通或约束…（显式规划）';
    return activeTripId
      ? '可咨询攻略，也可直接说想怎么改行程…'
      : '你想去哪儿？我来帮你一起规划 🙂';
  }, [userIntentMode, activeTripId]);

  const buildEmergencyConstraints = (): Record<string, any> | undefined => {
    const preferred_modes = parseCsv(preferredModesText);
    const forbidden_modes = parseCsv(forbiddenModesText);
    const maxWind = maxWindToleranceText.trim() ? Number(maxWindToleranceText.trim()) : undefined;
    const reason_code = reasonCodeText.trim() || undefined;

    const obj: Record<string, any> = {};
    if (preferred_modes.length > 0) obj.preferred_modes = preferred_modes;
    if (forbidden_modes.length > 0) obj.forbidden_modes = forbidden_modes;
    if (typeof maxWind === 'number' && !Number.isNaN(maxWind)) {
      const minWind = constraintsMeta?.fields?.max_wind_speed_tolerance_mps?.min;
      const maxWindAllowed = constraintsMeta?.fields?.max_wind_speed_tolerance_mps?.max;
      const isTooSmall = typeof minWind === 'number' && maxWind < minWind;
      const isTooLarge = typeof maxWindAllowed === 'number' && maxWind > maxWindAllowed;
      if (isTooSmall || isTooLarge) {
        const rangeText =
          typeof minWind === 'number' && typeof maxWindAllowed === 'number'
            ? `${minWind}-${maxWindAllowed}`
            : typeof minWind === 'number'
              ? `>= ${minWind}`
              : typeof maxWindAllowed === 'number'
                ? `<= ${maxWindAllowed}`
                : '';
        toast.error(`风力上限超出范围${rangeText ? `（允许 ${rangeText} m/s）` : ''}`);
      } else {
        obj.max_wind_speed_tolerance_mps = maxWind;
      }
    }
    if (reason_code) obj.reason_code = reason_code;

    return Object.keys(obj).length > 0 ? obj : undefined;
  };

  const toggleMode = (currentText: string, setter: (v: string) => void, modeValue: string) => {
    const current = parseCsv(currentText);
    const next = current.includes(modeValue) ? current.filter((v) => v !== modeValue) : [...current, modeValue];
    setter(next.join(','));
  };

  const handleSendRef = useRef<
    (contentOverride?: string, structuredOverride?: StructuredTravelInput, sendOptions?: RouteAndRunSendOptions) => Promise<void>
  >(() => Promise.resolve());

  const clearConversation = useCallback(() => {
    routeRunPollAbortRef.current?.abort();
    clearAgentChatHistory(chatStorageKey);
    setMessages([]);
    setInput('');
    setLoading(false);
    setLoadingUiLabel('');
    setRouteRunAsyncProgress(undefined);
    setShowHotelPreflightCard(false);
    setNegotiationConflictBlocking(false);
    lastRouteRunDurableTripRunIdRef.current = undefined;

    if (entryPoint === 'planning_workbench') {
      void resetPlanningAssistantV2Session(user?.id).catch((e) => {
        console.warn('[AgentChat] reset planning session failed', e);
      });
    }
  }, [chatStorageKey, entryPoint, user?.id]);

  useEffect(() => {
    onClearReady?.(clearConversation);
  }, [onClearReady, clearConversation]);

  const handleApplyItineraryAdjustDraft = useCallback(
    (sourceMessage: Message) => {
      if (!sanitizedTripId || loading || !user) {
        toast.error('需要绑定有效行程才能应用草案');
        return;
      }
      const preview = planStudioContext?.itineraryAdjustDraftPreview;
      const snapshot = buildItineraryAdjustDraftSnapshot({
        preview: preview ?? undefined,
        adjustResult: sourceMessage.itineraryAdjustResult,
        timelineDayBlocks: sourceMessage.timelineDayBlocks,
      });
      if (!snapshot) {
        toast.error('缺少草案日程数据，请重新发起改排后再应用');
        return;
      }
      void handleSendRef.current(ITINERARY_ADJUST_APPLY_DRAFT_MESSAGE, undefined, {
        forceIntentMode: 'planning',
        applyItineraryAdjustDraft: {
          snapshot,
          ...(lastRouteRunDurableTripRunIdRef.current
            ? { durableTripRunId: lastRouteRunDurableTripRunIdRef.current }
            : {}),
        },
      });
    },
    [sanitizedTripId, loading, user, planStudioContext?.itineraryAdjustDraftPreview]
  );

  const handleSend = async (
    contentOverride?: string,
    structuredOverride?: StructuredTravelInput,
    sendOptions?: RouteAndRunSendOptions
  ) => {
    const textToSend = (contentOverride !== undefined ? contentOverride : input).trim();
    const clarifyAnswers = sendOptions?.clarificationAnswers;
    const clarifyDisplay = sendOptions?.clarificationDisplayMessage?.trim();
    if ((!textToSend && !(clarifyAnswers && clarifyAnswers.length > 0)) || loading || !user) return;

    // 规划工作台酒店：v2/chat + context.tripId（后端已解析行程日期，勿走 route_and_run / 本地日期澄清卡）
    if (
      shouldRouteHotelViaPlanningAssistantV2(entryPoint, sanitizedTripId, textToSend) &&
      !clarifyAnswers?.length
    ) {
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: textToSend,
        timestamp: new Date(),
      };
      const thinkingId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        userMessage,
        {
          id: thinkingId,
          role: 'assistant',
          content: '正在检索酒店…',
          timestamp: new Date(),
          status: 'thinking',
        },
      ]);
      setInput('');
      setLoading(true);
      setLoadingUiLabel('正在检索酒店…');
      try {
        const sessionId = await ensurePlanningAssistantV2Session(user.id);
        if (!sessionId) {
          throw new Error('无法创建规划助手会话');
        }
        planningAssistantSessionIdRef.current = sessionId;
        const v2Context = buildPlanningAssistantV2Context({
          tripId: sanitizedTripId!,
          destination: tripInsight?.tripSummary?.destination,
          userCountryCode: 'CN',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        if (import.meta.env.DEV) {
          console.log('[Planning Assistant] 发送请求:', {
            message: textToSend,
            context: v2Context,
          });
        }
        const data = await chatApi.sendMessage({
          sessionId,
          message: textToSend,
          userId: user.id,
          tripId: sanitizedTripId!,
          language: 'zh',
          context: v2Context,
        });
        if (import.meta.env.DEV) {
          console.log('[Planning Assistant] 收到响应:', {
            routing: data.routing,
            target: data.routing?.target,
            reasonCN: data.routing?.reasonCN,
            phase: data.phase,
            hasHotels: !!data.hotels?.length,
            hasAccommodations: !!data.accommodations?.length,
            hasAirbnb: !!data.airbnbListings?.length,
          });
          const routingCheck = validateRouting(data, 'hotel');
          if (!routingCheck.isValid) {
            console.warn('[Planning Assistant] 酒店路由异常:', routingCheck.reason, data.routing?.reasonCN);
          } else if (routingCheck.warning) {
            console.warn('[Planning Assistant]', routingCheck.warning);
          }
        }
        const mapped = assistantFieldsFromChatResponse(data);
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== thinkingId);
          return [
            ...filtered,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: mapped.content,
              timestamp: new Date(),
              status: 'done',
              phase: mapped.phase,
              hotels: mapped.hotels,
              accommodations: mapped.accommodations,
              planningAssistantSessionId: sessionId,
              ...(mapped.accommodationDisclaimerZh
                ? { accommodationDisclaimerZh: mapped.accommodationDisclaimerZh }
                : {}),
              clarificationNeeded: mapped.clarificationNeeded,
              ui_state: mapped.ui_state,
              orchestrationResult: mapped.orchestrationResult,
              interactionKind: 'lookup',
            },
          ];
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '酒店检索失败';
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== thinkingId);
          return [
            ...filtered,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: msg,
              timestamp: new Date(),
              status: 'failed',
            },
          ];
        });
        toast.error('酒店检索失败', { description: msg });
      } finally {
        setLoading(false);
        setLoadingUiLabel('');
      }
      return;
    }

    // 非规划工作台：酒店意图 + 行程日期就绪时弹出本地澄清卡（勿 route_and_run）
    if (
      !sendOptions?.skipHotelPreflight &&
      entryPoint !== 'planning_workbench' &&
      looksLikeHotelSearchRequest(textToSend) &&
      sanitizedTripId &&
      tripHotelPreflightDates &&
      !tripInsightLoading
    ) {
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: textToSend,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setShowHotelPreflightCard(true);
      return;
    }

    setShowHotelPreflightCard(false);

    const tripForIntentResolution =
      sendOptions?.routeRunTripIdOverride !== undefined
        ? sanitizeRouteRunTripId(
            sendOptions.routeRunTripIdOverride === null || sendOptions.routeRunTripIdOverride === ''
              ? undefined
              : String(sendOptions.routeRunTripIdOverride)
          ) ?? null
        : sanitizedTripId ?? null;

    const hadForceIntentMode = sendOptions?.forceIntentMode !== undefined;
    const suggestedOpIntent = sendOptions?.suggestedOperationIntentMode;
    const hadSuggestedIntentMode = suggestedOpIntent !== undefined;
    const effectiveIntent = sendOptions?.forceIntentMode ?? userIntentMode;
    const intentAfterFlight = resolveIntentModeForFlightOnTrip(
      effectiveIntent,
      looksLikeFlightSearchRequest(textToSend),
      Boolean(tripForIntentResolution)
    );
    const intentForRoute = hadForceIntentMode
      ? intentAfterFlight
      : hadSuggestedIntentMode
        ? userExplicitFromRouteRunIntentMode(suggestedOpIntent!)
        : resolveIntentModeForBoundTripRoute(
            tripForIntentResolution,
            intentAfterFlight,
            textToSend
          );
    const thinkingLine = getThinkingLine(intentForRoute, activeTripId);

    let requestIdForDebug: string | null = null;
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend || clarifyDisplay || (clarifyAnswers?.length ? '已确认选项' : ''),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = textToSend;
    setInput('');
    setLoading(true);
    setLoadingUiLabel(thinkingLine);

    if (activeTripId && !sanitizedTripId && !invalidTripIdToastShown.current) {
      invalidTripIdToastShown.current = true;
      toast.warning(
        '当前行程 ID 不是服务端下发的 UUID（请勿使用 trip_ 等占位符），本次将不传 trip_id，以免后端报「行程不存在」。请从行程详情页进入或使用创建/详情接口返回的 Trip.id。'
      );
    }

    const mapExplicitToApi = (mode: UserExplicitIntentMode): RouteRunIntentModeOption =>
      mode === 'planning'
        ? 'TRIP_PLANNING'
        : mode === 'data_lookup'
          ? 'DATA_LOOKUP'
          : mode === 'generic_qa'
            ? 'GENERIC_QA'
            : 'AUTO';

    const intent_mode: RouteRunIntentModeOption = hadForceIntentMode
      ? mapExplicitToApi(intentForRoute)
      : hadSuggestedIntentMode
        ? suggestedOpIntent!
        : mapExplicitToApi(intentForRoute);

    const enableLiveToolsPayload = buildEnableLiveToolsOption(
      sendOptions?.enableLiveToolsOverride !== undefined
        ? sendOptions.enableLiveToolsOverride
        : enableLiveTools
    );

    // 添加思考中的消息
    const thinkingMessage: Message = {
      id: `thinking-${Date.now()}`,
      role: 'assistant',
      content: thinkingLine,
      timestamp: new Date(),
      status: 'thinking',
      mode: currentMode,
    };
    setMessages((prev) => [...prev, thinkingMessage]);

    try {
      const planningSessionId = await ensurePlanningAssistantV2Session(user.id);
      planningAssistantSessionIdRef.current = planningSessionId;

      const agentLocale = localeForAgentConversationContext(i18n.language);
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const useActiveTripSummaryContext = Boolean(
        tripForIntentResolution &&
          (attachActiveTripSummaryContext || entryPoint === 'planning_workbench')
      );

      const conversation_context = buildRouteAndRunConversationContext({
        history: messages.map((m) => ({
          role: m.role,
          content: m.content,
          status: m.status,
        })),
        currentUserContent: userInput || userMessage.content,
        locale: agentLocale,
        timezone,
        contextType:
          routeContextType?.trim() ||
          (useActiveTripSummaryContext ? 'active_trip_summary' : undefined),
      });

      const fromTripSummary: StructuredTravelInput | undefined =
        sendOptions?.omitStructuredTravelInput
          ? undefined
          : attachActiveTripSummaryContext && tripInsight?.tripSummary?.startDate
            ? {
                destination: tripInsight.tripSummary.destination?.trim() || undefined,
                start_date: toDateOnlyIso(tripInsight.tripSummary.startDate),
                end_date: toDateOnlyIso(tripInsight.tripSummary.endDate),
              }
            : undefined;
      const structuredMerged = mergeStructuredTravelInputs(fromTripSummary, structuredOverride);

      const tripForRequest = tripForIntentResolution;

      const hasCarRentalDateContext =
        Boolean(tripHotelPreflightDates) ||
        Boolean(
          structuredMerged?.start_date &&
            String(structuredMerged.start_date).trim() &&
            structuredMerged?.end_date &&
            String(structuredMerged.end_date).trim()
        );
      const augmentCarRentalTools =
        looksLikeCarRentalSearchRequest(userInput) && hasCarRentalDateContext;
      const augmentFlightTools = looksLikeFlightSearchRequest(userInput);
      const mergedEnableLiveTools = mergeFlightIntoEnableLiveTools(
        mergeCarRentalIntoEnableLiveTools(enableLiveToolsPayload, augmentCarRentalTools),
        augmentFlightTools
      );
      const needsCarRentalSensorBudget =
        mergedEnableLiveTools !== undefined &&
        liveToolsIncludeCarRental(mergedEnableLiveTools);
      /** 推荐酒店、租车、航班传感器等：传 options.max_seconds（见 CONFIG.API.ROUTE_AND_RUN_SENSOR_MAX_SECONDS） */
      const needsRouteRunMaxSeconds =
        needsCarRentalSensorBudget ||
        looksLikeHotelSearchRequest(userInput) ||
        looksLikeFlightSearchRequest(userInput) ||
        liveToolsIncludeHotel(mergedEnableLiveTools) ||
        liveToolsIncludeFlight(mergedEnableLiveTools);

      const personaHintForRequest = compactRouteRunPersonaHint(personaHint);

      const attachSuggestedOperationPayload =
        Boolean(tripForRequest) &&
        (sendOptions?.invokeSuggestedOperation === true ||
          sendOptions?.routeRunTripIdOverride !== undefined);

      const applyDraftPayload = sendOptions?.applyItineraryAdjustDraft;

      const request: RouteAndRunRequest = {
        request_id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: user.id,
        trip_id: tripForRequest,
        message: textToSend,
        ...(clarifyAnswers?.length ? { clarification_answers: clarifyAnswers } : {}),
        ...(attachSuggestedOperationPayload && tripForRequest
          ? {
              tripId: tripForRequest,
              suggested_operation_payload: {
                trip_id: tripForRequest,
                message: userInput,
                ...(hadSuggestedIntentMode ? { intent_mode: suggestedOpIntent! } : {}),
              },
            }
          : {}),
        ...(structuredMerged ? { structured_travel_input: structuredMerged } : {}),
        ...(routeRunPreferenceProfileMerged
          ? { preference_profile: routeRunPreferenceProfileMerged as any }
          : {}),
        // emergency_constraints 在不同 Story 下字段形态不同（PT / Wind / Modes），这里保持开放结构
        emergency_constraints: buildEmergencyConstraints() as any,
        conversation_context,
        options: {
          llm_provider: selectedLLMProvider,
          entry_point: entryPoint,
          readonly_mode: readonlyMode,
          /** 含 AUTO：与后端约定显式分流，避免「缺字段」与「GENERIC_QA 误钉」歧义 */
          intent_mode,
          ...(mergedEnableLiveTools != null
            ? {
                enable_live_tools: mergedEnableLiveTools,
                /** 与传感器链对齐；航班/天气等由服务端注入凭证，前端只传 options */
                use_claude_orchestration: true,
              }
            : {}),
          ...(needsRouteRunMaxSeconds
            ? { max_seconds: CONFIG.API.ROUTE_AND_RUN_SENSOR_MAX_SECONDS }
            : {}),
          ...(intentFlags &&
          (Array.isArray(intentFlags) ? intentFlags.length > 0 : Object.keys(intentFlags).length > 0)
            ? { intent_flags: intentFlags }
            : {}),
          ...(personaHintForRequest ? { persona_hint: personaHintForRequest } : {}),
          ...(enableGuardiansDebateLlm === true || intent_mode === 'TRIP_PLANNING'
            ? { enable_guardians_debate_llm: true }
            : {}),
          show_debug_scores: debugUiDefaults === true,
          ...(applyDraftPayload
            ? {
                apply_itinerary_adjust_draft: true,
                intent_mode: 'TRIP_PLANNING' as const,
                ...(applyDraftPayload.durableTripRunId
                  ? { durable_trip_run_id: applyDraftPayload.durableTripRunId }
                  : {}),
                itinerary_adjust_draft_snapshot: applyDraftPayload.snapshot,
              }
            : {}),
          client_session_id: planningSessionId,
        },
      };
      requestIdForDebug = request.request_id;
      lastRouteRequestRef.current = request;

      routeRunPollAbortRef.current?.abort();
      const pollAbort = new AbortController();
      routeRunPollAbortRef.current = pollAbort;
      setRouteRunAsyncProgress(undefined);

      const onRouteRunProgress = (snap: RouteRunAsyncTaskStatusResponse) => {
        const label = formatRouteRunAsyncProgressLabel(snap);
        setLoadingUiLabel(label);
        const pct =
          typeof snap.progress_percentage === 'number' && Number.isFinite(snap.progress_percentage)
            ? snap.progress_percentage
            : undefined;
        setRouteRunAsyncProgress(pct);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingMessage.id ? { ...m, content: label, routeRunAsyncProgress: pct } : m
          )
        );
      };

      const response: RouteAndRunResponse = await invokeRouteAndRun(request, {
        signal: pollAbort.signal,
        onProgress: onRouteRunProgress,
      });

      const durableTripRunId = extractRouteRunDurableTripRunId(response);
      if (durableTripRunId) {
        lastRouteRunDurableTripRunIdRef.current = durableTripRunId;
      }

      if (import.meta.env.DEV) {
        const pr =
          response.result.payload && typeof response.result.payload === 'object'
            ? (response.result.payload as Record<string, unknown>)
            : undefined;
        logRouteRunDevSelfCheck({
          payload: pr,
          response,
          requestTripId: tripForRequest,
          isCacheReplay: isRouteRunCacheReplay(response),
        });
      }

      // 处理重定向（REDIRECT_REQUIRED）
      if (response.result.status === 'REDIRECT_REQUIRED') {
        const redirectInfo = response.result.payload?.redirectInfo;
        if (redirectInfo) {
          // 显示重定向提示
          toast.info(redirectInfo.redirect_reason, {
            duration: 3000,
          });

          // 移除思考中的消息
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== thinkingMessage.id);
            return [
              ...filtered,
              {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: `需要跳转到其他页面继续操作：${redirectInfo.redirect_reason}`,
                timestamp: new Date(),
                status: 'done',
              },
            ];
          });

          // 延迟执行重定向，让用户看到提示
          setTimeout(() => {
            if (redirectInfo.redirect_to.startsWith('http')) {
              window.location.href = redirectInfo.redirect_to;
            } else {
              navigate(redirectInfo.redirect_to);
            }
          }, 1000);

          setLoading(false);
          return;
        }
      }

      // 处理 NEED_CONSENT 状态（需要浏览器授权）
      if (response.result.status === 'NEED_CONSENT') {
        // 移除思考中的消息
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== thinkingMessage.id);
          return [
            ...filtered,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: '这个操作需要获取网页内容，是否授权我继续？',
              timestamp: new Date(),
              status: 'awaiting_consent',
              routeType: response.route.route,
              mode: response.route.ui_hint.mode,
            },
          ];
        });
        
        // 保存请求以便授权后重试
        setPendingConsentRequest(request);
        setConsentDialogOpen(true);
        setLoading(false);
        return;
      }

      // 处理协商（Decision OS v1.0）
      const negotiation = response.result.payload?.negotiation_payload;
      if (negotiation?.status === 'PENDING_USER_DECISION') {
        setNegotiationPayload(negotiation);
        setNegotiationDialogOpen(true);
        setNegotiationAuditRequestId(request.request_id);

        // best-effort：记录协商打开（NEW -> OPENED）
        try {
          await agentApi.logDecision({
            request_id: request.request_id,
            user_id: user.id,
            trip_id: sanitizedTripId ?? null,
            event: 'NEGOTIATION_OPENED' as LogDecisionEvent,
            negotiation_session_id: negotiation.negotiation_session_id,
            expected_negotiation_hash: negotiation.expected_negotiation_hash,
            context: {
              emergency_constraints: request.emergency_constraints,
              entry_point: entryPoint,
            },
            client_ts: new Date().toISOString(),
          });
        } catch {
          // best-effort：静默失败
        }

        // 移除思考中的消息，添加提示消息
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== thinkingMessage.id);
          return [
            ...filtered,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: `${negotiation.impact}\n\n我为你准备了可选方案，请在弹窗中选择并确认。`,
              timestamp: new Date(),
              status: 'awaiting_confirmation',
              routeType: response.route.route,
              mode: response.route.ui_hint.mode,
            },
          ];
        });

        setLoading(false);
        return;
      }

      // 检查是否需要审批（NEED_CONFIRMATION）
      if (needsApproval(response)) {
        const approvalId = extractApprovalId(response);
        if (!approvalId) {
          console.error('审批 ID 不存在，但需要审批');
          return;
        }

        // 移除思考中的消息，添加等待审批的消息
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== thinkingMessage.id);
          return [
            ...filtered,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: '我需要你的授权才能继续操作 👇 请查看下方的审批请求。',
              timestamp: new Date(),
              status: 'awaiting_confirmation',
              routeType: response.route.route,
              mode: response.route.ui_hint.mode,
            },
          ];
        });

        // 显示审批对话框
        setPendingApprovalId(approvalId);
        setApprovalDialogOpen(true);
        return;
      }

      // 根据 routeType 处理响应
      const routeType = response.route.route;
      const isSystem2 = routeType === 'SYSTEM2_REASONING' || routeType === 'SYSTEM2_WEBBROWSE';
      
      // 规范化决策日志：编排 → explain → unified_execution_trace（无 state 轻量路径）
      const rawDecisionLog = pickRawDecisionLogFromRouteRun(response);
      const decisionLog: DecisionLogEntry[] = rawDecisionLog.map((entry: any) =>
        normalizeToNewFormat(entry, response.request_id)
      );
      
      const mode = response.route.ui_hint.mode;

      // 更新当前模式
      setCurrentMode(mode);

      // 处理不同的结果状态
      /**
       * 气泡正文只绑定 **最终** `result.answer_text`（非 SSE 流式 buffer）。
       * 流式场景须等 done 再替换；若装配器漏剥标记，见 `sanitizeRouteRunAnswerTextForDisplay`。
       */
      const answerText =
        response.result.answer_text != null ? String(response.result.answer_text) : '';
      let messageContent = answerText;
      
      // 确定 UI 状态（展示用 resolveRouteAndRunDisplayStatus，见下方）
      
      const clarificationQuestions = normalizeRouteRunClarificationQuestions(
        response.result.payload?.clarificationQuestions
      );

      const payloadRecord =
        response.result.payload && typeof response.result.payload === 'object'
          ? (response.result.payload as Record<string, unknown>)
          : undefined;

      const routeRunSurface = pickRouteRunSurface({
        status: response.result.status,
        payload: payloadRecord,
        response,
      });
      const routeRunViewMode = resolveRouteRunViewMode(response);

      // 如果是 NEED_MORE_INFO，需要特殊处理
      if (response.result.status === 'NEED_MORE_INFO') {
        if (routeRunViewMode === 'clarification' && clarificationQuestions.length > 0) {
          /** 澄清卡为主数据源；勿把 answer_text / clarificationMessage 当气泡正文 */
          messageContent = '';
        } else {
          const clarificationMessage = response.result.payload?.clarificationMessage;
          const clarificationInfo = response.result.payload?.clarificationInfo;

          if (clarificationMessage) {
            messageContent = clarificationMessage;
          } else if (clarificationInfo) {
            let clarificationText = answerText;

            if (clarificationInfo.missingServices && clarificationInfo.missingServices.length > 0) {
              clarificationText += `\n\n**缺失的服务：**\n${clarificationInfo.missingServices.map(s => `- ${s}`).join('\n')}`;
            }

            if (clarificationInfo.impact) {
              clarificationText += `\n\n**影响：**\n${clarificationInfo.impact}`;
            }

            if (clarificationInfo.solutions && clarificationInfo.solutions.length > 0) {
              clarificationText += `\n\n**解决方案：**\n${clarificationInfo.solutions.map(s => `- ${s}`).join('\n')}`;
            }

            messageContent = clarificationText;
          }
        }

        const errorType = response.result.payload?.errorType;
        if (errorType) {
          const strategy = getErrorHandlingStrategy(errorType);
          console.log('[Agent Chat] 错误处理策略:', {
            errorType,
            strategy,
          });
        }
      } else if (response.result.status === 'TIMEOUT') {
        messageContent = 'TIMEOUT'; // 特殊标记，用于显示优化的错误UI
      } else if (response.result.status === 'FAILED') {
        messageContent = answerText || 'FAILED'; // 特殊标记，用于显示优化的错误UI
      }

      /** 结构化 UI 走 payload；正文中 <<<…>>> 块仅展示前剔除（与装配器同语义兜底） */
      if (response.result.status !== 'TIMEOUT') {
        messageContent = sanitizeRouteRunAnswerTextForDisplay(messageContent);
      }

      const evidenceBundle = response.result.payload?.evidence_bundle as EvidenceBundleDto | undefined;
      const evidenceCards = (response.result.payload?.decision_metadata?.evidence_cards ?? []) as EvidenceCardDto[];
      const evidenceCardsUi = (response.result.payload?.ui_display?.evidence_cards_ui ?? []) as EvidenceCardUiDto[];
      const candidates = (response.result.payload?.candidates ?? []) as any[];
      const alternatives = (response.result.payload?.alternatives ?? []) as any[];
      const routeDecisionTaskType =
        typeof response.route.task_type === 'string' ? response.route.task_type.trim() : undefined;
      const taskType = resolveRoutingTaskType(response, payloadRecord);
      const routePolicy =
        response.route.route_policy ??
        (typeof payloadRecord?.route_policy === 'string' ? payloadRecord.route_policy : undefined);
      const uiSurface =
        typeof payloadRecord?.ui_surface === 'string'
          ? payloadRecord.ui_surface.trim()
          : typeof payloadRecord?.uiSurface === 'string'
            ? payloadRecord.uiSurface.trim()
            : undefined;
      const uiHintMessage = String(response.route.ui_hint.message ?? '').trim() || undefined;
      const observabilitySystemMode = response.observability.system_mode;
      const memoryConstraintSinkDecisionLog = isConstraintSinkEnabled()
        ? extractConstraintSinkFromDecisionLog(decisionLog)
        : undefined;
      const memoryConstraintSinkAnchor = isConstraintSinkEnabled()
        ? deriveConstraintSinkUiAnchorV1(
            extractMergedConstraintSinkFromRouteRun(response, decisionLog)
          )
        : undefined;
      const isCacheReplay = isRouteRunCacheReplay(response);
      const orchestrationModeFinal = getRouteRunOrchestrationModeFinal(response);
      const interactionKind = inferInteractionKind(taskType, routePolicy, routeType);
      const ragSources = extractRagSources(payloadRecord);
      const kbRagCitationCount = extractKbRagCitationCount(payloadRecord);
      const kbRagHit = extractKbRagHitFromTrace(payloadRecord);
      const intentActionChips = pickIntentChipsFromPayload(payloadRecord);
      const ragStructured = extractRagStructuredOutcome(messageContent, payloadRecord);
      const liveSensorAudit =
        payloadRecord?.live_sensor_audit &&
        typeof payloadRecord.live_sensor_audit === 'object' &&
        !Array.isArray(payloadRecord.live_sensor_audit)
          ? (payloadRecord.live_sensor_audit as Record<string, unknown>)
          : undefined;

      const hotelsFromPayload =
        extractHotelsFromAgentPayload(payloadRecord) ??
        extractHotelsFromAgentPayload(
          response.result && typeof response.result === 'object'
            ? (response.result as Record<string, unknown>)
            : undefined
        );

      const carRentalsFromPayload =
        extractCarRentalsFromAgentPayload(payloadRecord) ??
        extractCarRentalsFromAgentPayload(
          response.result && typeof response.result === 'object'
            ? (response.result as Record<string, unknown>)
            : undefined
        );

      const carRentalsForMessage =
        (carRentalsFromPayload?.length ?? 0) > 0 && isLiveSensorCarRentalSucceeded(liveSensorAudit)
          ? carRentalsFromPayload
          : undefined;
      const carRentalSearchMeta =
        extractCarRentalSearchMetaFromAgentPayload(payloadRecord) ??
        extractCarRentalSearchMetaFromAgentPayload(
          response.result && typeof response.result === 'object'
            ? (response.result as Record<string, unknown>)
            : undefined
        );
      const carRentalFallbackDatesUsed =
        Boolean(carRentalsForMessage?.length) && carRentalSearchMeta?.fallback_dates_used === true;

      const accommodationsFromPayload = extractAccommodationsFromRouteRunSuccess(
        payloadRecord,
        response.result && typeof response.result === 'object'
          ? (response.result as Record<string, unknown>)
          : undefined
      );

      const accommodationDisclaimerZh = extractHotelSearchDisclaimerZh(
        payloadRecord,
        response.result && typeof response.result === 'object'
          ? (response.result as Record<string, unknown>)
          : undefined
      );

      const resultRecord =
        response.result && typeof response.result === 'object'
          ? (response.result as Record<string, unknown>)
          : undefined;

      const payloadDisplayBundle = buildRouteRunPayloadDisplayBundle(
        response,
        payloadRecord,
        resultRecord
      );
      const {
        timelineDayBlocks,
        poiCardsByDay,
        orchestrationResult: payloadOrchestrationResult,
        safetySurface,
        consultationSurface: routeRunConsultationSurface,
        hasItineraryPanelsInPayload,
      } = payloadDisplayBundle;

      maybeToastWorkbenchDrift(payloadDisplayBundle.workbenchDisplay, (msg) => {
        toast.info(msg);
      });

      let poiSuppressAnswerProse =
        extractPoiSuppressAnswerProse(payloadRecord) || routeRunViewMode === 'trip_timeline';
      if (routeRunViewMode === 'trip_timeline' && messageContent.trim()) {
        messageContent = truncateAnswerTextForBubble(messageContent);
        poiSuppressAnswerProse = true;
      }

      const suggestedOperations = normalizeSuggestedOperations(
        payloadRecord?.suggested_operations ?? payloadRecord?.suggestedOperations
      );

      const actionExecutionPreview = pickActionExecutionPreviewFromPayload(payloadRecord);
      const actionExecutionPayload = pickActionExecutionFromPayload(payloadRecord);
      const actionExecutionPending = actionExecutionPayload?.pendingActions;
      const consultationDashboard = parseConsultationDashboard(payloadRecord);

      const flightInventorySnapshot = extractFlightInventorySnapshotFromRouteRun(
        payloadRecord,
        response.result && typeof response.result === 'object'
          ? (response.result as Record<string, unknown>)
          : undefined
      );

      const hasRenderableStructured =
        Boolean(consultationDashboard) ||
        (!routeRunConsultationSurface && hasItineraryPanelsInPayload) ||
        (hotelsFromPayload?.length ?? 0) > 0 ||
        (carRentalsForMessage?.length ?? 0) > 0 ||
        (accommodationsFromPayload?.length ?? 0) > 0 ||
        Boolean(flightInventorySnapshot) ||
        Boolean(actionExecutionPreview?.action_previews?.length) ||
        safetySurfaceHasRenderableSurface(safetySurface);

      /** OK 且无正文、解析不出任何结构化卡片时：避免气泡只剩状态条 */
      if (
        response.result.status === 'OK' &&
        !messageContent.trim() &&
        !hasRenderableStructured
      ) {
        messageContent = '处理完成。';
      }

      const reasoningState = getAgentReasoningState(response);

      // 以 result.status 为准；勿让 ui_state.thinking 盖过 NEED_MORE_INFO 澄清态
      const displayUiStatus = resolveRouteAndRunDisplayStatus(response, {
        forceClarifying: reasoningState.uiMode === 'CLARIFYING',
      });

      const routeRunExplainMirror =
        debugUiDefaults === true ? pickRouteRunExplainGuardianMirror(response.explain) : undefined;
      const routeRunSimplifiedExplanation = shouldAttachSimplifiedExplanation(debugUiDefaults)
        ? pickSimplifiedExplanationFromExplain(response.explain)
        : undefined;
      const routeRunNoPoiPlanningFlag = readNoPoiPlanningFromPayload(payloadRecord);
      const routeRunExplainOptimization = pickRouteRunExplainOptimizationForMessage(response, {
        uiSurface,
        status: response.result.status,
      });
      const itineraryAdjust = parseItineraryAdjustPayload(payloadRecord);
      const routeRunDecisionCockpit =
        itineraryAdjust.decisionCockpitUiSuppressed
          ? undefined
          : pickDecisionCockpitFromRouteRun(response);

      if (itineraryAdjust.autoApplied) {
        toast.success('已更新正式行程');
        onSystem2Response?.();
        void reloadTripPoiSchedules();
      }

      if (sendOptions?.applyItineraryAdjustDraft && response.result.status === 'OK') {
        planStudioContext?.clearItineraryAdjustDraftPreview();
        focusPlanStudioItineraryAdjustTargetDay(
          planStudioContext?.selectDay,
          sendOptions.applyItineraryAdjustDraft.snapshot
        );
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
        }
        if (!itineraryAdjust.autoApplied) {
          toast.success('草案已写入行程');
          onSystem2Response?.();
          void reloadTripPoiSchedules();
        }
      }

      const adjustUiHint = itineraryAdjustUiHintMessage(itineraryAdjust);
      const effectiveUiHintMessage = adjustUiHint ?? uiHintMessage;

      if (itineraryAdjust.intake) {
        poiSuppressAnswerProse = true;
        if (!itineraryAdjust.adjustResult && messageContent.trim()) {
          messageContent = truncateAnswerTextForBubble(messageContent);
        }
      }

      // 移除思考中的消息，添加实际回复
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== thinkingMessage.id);
        return [
          ...filtered,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: messageContent,
            timestamp: new Date(),
            status: displayUiStatus,
            routeType,
            routeInfo: {
              confidence: response.route.confidence,
              latency_ms: response.observability.latency_ms,
              tokens_est: response.observability.tokens_est,
              cost_est_usd: response.observability.cost_est_usd,
              ...(response.route.selected_path?.trim()
                ? { selected_path: response.route.selected_path.trim() }
                : {}),
            },
            decisionLog: decisionLog.length > 0 ? decisionLog : undefined,
            mode,
            ui_state: response.ui_state,
            ...(payloadOrchestrationResult ? { orchestrationResult: payloadOrchestrationResult } : {}),
            ...(routeRunExplainMirror ? { routeRunExplainMirror } : {}),
            ...(routeRunSimplifiedExplanation ? { routeRunSimplifiedExplanation } : {}),
            ...(routeRunNoPoiPlanningFlag ? { routeRunNoPoiPlanningFlag: true } : {}),
            ...(routeRunExplainOptimization && !itineraryAdjust.intake
              ? { routeRunExplainOptimization }
              : {}),
            ...(routeRunDecisionCockpit ? { routeRunDecisionCockpit } : {}),
            evidenceBundle,
            evidenceCards: evidenceCards.length > 0 ? evidenceCards : undefined,
            evidenceCardsUi: evidenceCardsUi.length > 0 ? evidenceCardsUi : undefined,
            candidates:
              !itineraryAdjust.intake && candidates.length > 0 ? candidates : undefined,
            alternatives:
              !itineraryAdjust.intake && alternatives.length > 0 ? alternatives : undefined,
            clarificationQuestions:
              clarificationQuestions.length > 0 ? clarificationQuestions : undefined,
            routeRunSurface,
            routeRunViewMode,
            reasoningState,
            interactionKind,
            taskType,
            ...(routeDecisionTaskType ? { routeDecisionTaskType } : {}),
            routePolicy,
            ragSources,
            ...(kbRagCitationCount != null ? { kbRagCitationCount } : {}),
            ...(kbRagHit !== undefined ? { kbRagHit } : {}),
            intentActionChips,
            ...(ragStructured ? { ragStructured } : {}),
            ...(uiSurface ? { uiSurface } : {}),
            ...(effectiveUiHintMessage ? { uiHintMessage: effectiveUiHintMessage } : {}),
            observabilitySystemMode,
            ...(memoryConstraintSinkAnchor ? { memoryConstraintSinkAnchor } : {}),
            ...(memoryConstraintSinkDecisionLog
              ? { memoryConstraintSinkDecisionLog }
              : {}),
            isCacheReplay,
            ...(orchestrationModeFinal ? { orchestrationModeFinal } : {}),
            ...(liveSensorAudit ? { liveSensorAudit } : {}),
            ...(accommodationsFromPayload && accommodationsFromPayload.length > 0
              ? {
                  accommodations: accommodationsFromPayload,
                  planningAssistantSessionId:
                    planningAssistantSessionIdRef.current ??
                    getPlanningAssistantV2SessionId() ??
                    undefined,
                  ...(accommodationDisclaimerZh ? { accommodationDisclaimerZh } : {}),
                }
              : {}),
            ...(hotelsFromPayload && hotelsFromPayload.length > 0 ? { hotels: hotelsFromPayload } : {}),
            ...(carRentalsForMessage && carRentalsForMessage.length > 0
              ? {
                  carRentals: carRentalsForMessage,
                  ...(carRentalFallbackDatesUsed ? { carRentalFallbackDatesUsed: true } : {}),
                }
              : {}),
            ...(poiCardsByDay && poiCardsByDay.length > 0 ? { poiCardsByDay } : {}),
            ...(poiSuppressAnswerProse ? { poiSuppressAnswerProse: true } : {}),
            ...(consultationDashboard ? { consultationDashboard } : {}),
            ...(flightInventorySnapshot ? { flightInventorySnapshot } : {}),
            ...(suggestedOperations ? { suggestedOperations } : {}),
            ...(actionExecutionPayload ? { actionExecution: actionExecutionPayload } : {}),
            ...(actionExecutionPreview ? { actionExecutionPreview } : {}),
            ...(actionExecutionPending !== undefined
              ? { actionExecutionPending }
              : {}),
            ...(timelineDayBlocks?.length ? { timelineDayBlocks } : {}),
            ...(safetySurfaceHasRenderableSurface(safetySurface) ? { safetySurface } : {}),
            ...(itineraryAdjust.intake
              ? (buildItineraryAdjustMessageFields(itineraryAdjust) as Partial<Message>)
              : {}),
          },
        ];
      });

      syncItineraryAdjustDraftToPlanStudio(
        planStudioContext ?? undefined,
        itineraryAdjust,
        timelineDayBlocks,
        response.request_id
      );

      const orchState = payloadOrchestrationResult?.state as Record<string, unknown> | undefined;
      const orchPhase =
        response.ui_state?.phase ?? (typeof orchState?.phase === 'string' ? (orchState.phase as string) : undefined);
      const planGenerated =
        orchState?.plan_generated === true ||
        orchState?.status === 'PLAN_GENERATED' ||
        orchState?.last_step === 'PLAN_GEN';
      /**
       * 咨询态 / 轻量问答：勿用本趟 route_and_run 刷新 GET trip 侧时间轴；仅规划等再通知拉详情。
       * 以 payload / observability 标志为主，并保留 lookup/qa 的交互档兜底。
       */
      const suppressTripTimelineFromThisRouteTurn =
        routeRunConsultationSurface ||
        interactionKind === 'lookup' ||
        interactionKind === 'qa' ||
        shouldSuppressLeftTripRefresh(itineraryAdjust);
      const shouldNotifyTripRefresh =
        !suppressTripTimelineFromThisRouteTurn &&
        isSystem2 &&
        (response.result.status === 'OK' ||
          orchPhase === 'PLAN_GEN' ||
          orchPhase === 'DONE' ||
          planGenerated);
      if (shouldNotifyTripRefresh && !itineraryAdjust.autoApplied) {
        setTimeout(() => onSystem2Response?.(), 0);
      }
    } catch (error: any) {
      console.error('Agent chat error:', error);
      // 移除思考中的消息，添加错误消息（C1 严格模式下 5xx 视为“不可验收输出”）
      const httpStatus = error?.response?.status as number | undefined;
      const baseMessage =
        error?.message != null ? String(error.message) : '出了一点小状况，要不再试一次？';
      const errorMessage =
        httpStatus && httpStatus >= 500
          ? [
              '本次结果证据不足/校验失败，属于不可验收输出。',
              '请重试，或缩小范围（减少约束/减少重算范围）后再试。',
              requestIdForDebug ? `request_id: ${requestIdForDebug}` : undefined,
            ]
              .filter(Boolean)
              .join('\n')
          : baseMessage;

      const ridForBubble =
        (isTripnaraHttpError(error) && error.requestId) ||
        (requestIdForDebug ?? undefined);
      const bubbleText =
        ridForBubble && !errorMessage.includes(ridForBubble)
          ? `${errorMessage}\n\nrequest_id: ${ridForBubble}`
          : errorMessage;

      toast.error(httpStatus && httpStatus >= 500 ? '服务暂时不可用' : '请求未完成', {
        description: describeAgentFailureToast(error, requestIdForDebug),
      });
      const reqSnap = lastRouteRequestRef.current;
      const debugBundle =
        requestIdForDebug || reqSnap
          ? {
              request_id: requestIdForDebug ?? undefined,
              trip_id:
                sanitizeRouteRunTripId(reqSnap?.trip_id as string | undefined) ??
                sanitizedTripId ??
                null,
              user_id: user?.id,
              conversation_context: (reqSnap?.conversation_context as Record<string, unknown>) ?? undefined,
              emergency_constraints: (reqSnap?.emergency_constraints as Record<string, unknown>) ?? undefined,
              page_url: typeof window !== 'undefined' ? window.location.href : undefined,
              captured_at: new Date().toISOString(),
            }
          : undefined;

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== thinkingMessage.id);
        return [
          ...filtered,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: bubbleText,
            timestamp: new Date(),
            status: 'failed',
            ...(debugBundle ? { debugBundle } : {}),
          },
        ];
      });
    } finally {
      setLoading(false);
      setLoadingUiLabel('');
      setRouteRunAsyncProgress(undefined);
    }
  };

  handleSendRef.current = handleSend;

  useEffect(() => {
    onSendMessageReady?.((message) => {
      void handleSendRef.current(message);
    });
  }, [onSendMessageReady]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 处理快捷命令
  const handleInputChange = (value: string) => {
    if (value.startsWith('/')) {
      if (value === '/深度模式' || value === '/deep') {
        setCurrentMode('slow');
        setInput('');
        return;
      } else if (value === '/快速模式' || value === '/fast') {
        setCurrentMode('fast');
        setInput('');
        return;
      } else if (showAgentDebugTools && (value === '/约束' || value === '/constraints')) {
        setConstraintsDialogOpen(true);
        setInput('');
        return;
      }
    }
    setInput(value);
  };

  const appendReplayMessage = (title: string, data: unknown) => {
    const raw = data as any;
    let type: NonNullable<Message['replayResult']>['type'] = 'unknown';
    let summaryLines: string[] = [];

    if (raw && typeof raw === 'object' && Array.isArray(raw.timeline)) {
      type = 'timeline';
      const lines = raw.timeline.slice(0, 12).map((item: any, idx: number) => {
        const step = item?.step ?? item?.phase ?? item?.event ?? `event_${idx + 1}`;
        const ts = item?.timestamp ?? item?.ts ?? item?.created_at ?? '-';
        const status = item?.status ?? item?.result ?? '';
        return `${idx + 1}. ${String(step)} | ${String(ts)}${status ? ` | ${String(status)}` : ''}`;
      });
      summaryLines = [
        `timeline_count: ${raw.timeline.length}`,
        ...(lines.length > 0 ? lines : ['（无事件）']),
      ];
    } else if (raw && typeof raw === 'object' && 'what_if_result' in raw) {
      type = 'what_if';
      summaryLines = [
        'what_if_result:',
        JSON.stringify(raw.what_if_result, null, 2),
      ];
    } else if (raw && typeof raw === 'object' && 'counterfactual_result' in raw) {
      type = 'counterfactual';
      summaryLines = [
        'counterfactual_result:',
        JSON.stringify(raw.counterfactual_result, null, 2),
      ];
    } else {
      summaryLines = [JSON.stringify(raw, null, 2)];
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-replay-${Date.now()}`,
        role: 'assistant',
        content: title,
        timestamp: new Date(),
        status: 'done',
        replayResult: {
          type,
          title,
          summaryLines,
          raw,
        },
      },
    ]);
  };

  const getEffectiveTripRunId = () => replayTripRunId.trim() || activeTripId || '';

  const handleReplayTimeline = async () => {
    const tripRunId = getEffectiveTripRunId();
    if (!tripRunId) {
      toast.error('请先填写 tripRunId（或确保当前有 activeTripId）');
      return;
    }
    try {
      setReplayLoading(true);
      const res = await agentApi.getDecisionReplayTimeline(tripRunId);
      appendReplayMessage(`[Decision Replay] timeline: ${tripRunId}`, res);
      setReplayTimelineOpen(false);
    } catch (e: any) {
      toast.error('获取时间轴失败', { description: e?.message || '请稍后重试' });
    } finally {
      setReplayLoading(false);
    }
  };

  const handleReplayWhatIf = async () => {
    const tripRunId = getEffectiveTripRunId();
    if (!tripRunId) {
      toast.error('请先填写 tripRunId（或确保当前有 activeTripId）');
      return;
    }
    let assumptions: any[] = [];
    try {
      const parsed = JSON.parse(whatIfAssumptionsJson);
      assumptions = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      toast.error('assumptions JSON 格式不合法');
      return;
    }

    try {
      setReplayLoading(true);
      const res = await agentApi.decisionReplayWhatIf({
        trip_run_id: tripRunId,
        assumptions,
      });
      appendReplayMessage(`[Decision Replay] what-if: ${tripRunId}`, res);
      setReplayWhatIfOpen(false);
    } catch (e: any) {
      toast.error('what-if 执行失败', { description: e?.message || '请稍后重试' });
    } finally {
      setReplayLoading(false);
    }
  };

  const handleReplayCounterfactual = async () => {
    const tripRunId = getEffectiveTripRunId();
    if (!tripRunId) {
      toast.error('请先填写 tripRunId（或确保当前有 activeTripId）');
      return;
    }
    let payload: Record<string, any> = {};
    try {
      payload = JSON.parse(counterfactualPayloadJson);
    } catch {
      toast.error('counterfactual payload JSON 格式不合法');
      return;
    }

    try {
      setReplayLoading(true);
      const res = await agentApi.decisionReplayCounterfactual(tripRunId, payload);
      appendReplayMessage(`[Decision Replay] counterfactual: ${tripRunId}`, res);
      setReplayCounterfactualOpen(false);
    } catch (e: any) {
      toast.error('counterfactual 执行失败', { description: e?.message || '请稍后重试' });
    } finally {
      setReplayLoading(false);
    }
  };


  return (
    <div className={cn('relative flex flex-col h-full bg-background', className)}>
      {/* 约束配置对话框 */}
      <Dialog open={constraintsDialogOpen} onOpenChange={setConstraintsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>行程偏好与限制</DialogTitle>
            <DialogDescription>
              你可以告诉我更偏好的出行方式，或不希望采用的方式（例如“偏好火车、避免自驾”）。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Story C 一键模板 */}
            <div className="space-y-2">
              <div className="text-xs font-medium">快捷模板</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setPreferredModesPickerOpen(false);
                    setForbiddenModesPickerOpen(false);
                    setPreferredModesText('');
                    setForbiddenModesText('自驾,摩托');
                    setMaxWindToleranceText('');
                    setReasonCodeText('大风天气，禁用驾驶相关方案');
                  }}
                >
                  StoryC-禁用驾驶
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setPreferredModesPickerOpen(false);
                    setForbiddenModesPickerOpen(false);
                    setPreferredModesText('');
                    setForbiddenModesText('');
                    setMaxWindToleranceText('0.1');
                    setReasonCodeText('风力阈值压测');
                  }}
                >
                  StoryC-风阈值
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setPreferredModesPickerOpen(false);
                    setForbiddenModesPickerOpen(false);
                    setPreferredModesText('火车');
                    setForbiddenModesText('');
                    setMaxWindToleranceText('');
                    setReasonCodeText('优先铁路韧性策略');
                  }}
                >
                  StoryC-偏好火车
                </Button>
              </div>
              <div className="text-[11px] text-muted-foreground">点击模板会覆盖当前输入，可在此基础上再手动调整。</div>
              {constraintsMeta?.version ? (
                <div className="text-[11px] text-muted-foreground">枚举版本：{constraintsMeta.version}</div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-medium">偏好交通方式（逗号分隔）</div>
              <Popover open={preferredModesPickerOpen} onOpenChange={setPreferredModesPickerOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between font-normal">
                    <span className="truncate">
                      {parseCsv(preferredModesText).length > 0
                        ? parseCsv(preferredModesText).map(modeLabel).join('、')
                        : `例如：${transportModes.slice(0, 2).map((x) => x.label_zh || x.value).join('、')}`}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="搜索交通方式..." />
                    <CommandList>
                      <CommandEmpty>没有匹配选项</CommandEmpty>
                      <CommandGroup>
                        {transportModes.map((mode) => {
                          const value = String(mode.value || '').toUpperCase();
                          const selected = parseCsv(preferredModesText).includes(value);
                          return (
                            <CommandItem
                              key={`pref-${value}`}
                              value={`${value} ${mode.label_zh || ''} ${mode.label_en || ''}`}
                              onSelect={() => toggleMode(preferredModesText, setPreferredModesText, value)}
                            >
                              <Check className={cn('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
                              <span>{mode.label_zh || mode.value}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="text-[11px] text-muted-foreground">
                支持中文输入，会自动转换为系统识别的模式{constraintsMetaLoading ? '（正在加载枚举…）' : ''}。
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-medium">不希望采用的交通方式（逗号分隔）</div>
              <Popover open={forbiddenModesPickerOpen} onOpenChange={setForbiddenModesPickerOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between font-normal">
                    <span className="truncate">
                      {parseCsv(forbiddenModesText).length > 0
                        ? parseCsv(forbiddenModesText).map(modeLabel).join('、')
                        : `例如：${transportModes
                            .filter((x) => ['DRIVE', 'MOTORCYCLE'].includes((x.value || '').toUpperCase()))
                            .map((x) => x.label_zh || x.value)
                            .join('、') || '自驾、摩托'}`}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="搜索交通方式..." />
                    <CommandList>
                      <CommandEmpty>没有匹配选项</CommandEmpty>
                      <CommandGroup>
                        {transportModes.map((mode) => {
                          const value = String(mode.value || '').toUpperCase();
                          const selected = parseCsv(forbiddenModesText).includes(value);
                          return (
                            <CommandItem
                              key={`forbid-${value}`}
                              value={`${value} ${mode.label_zh || ''} ${mode.label_en || ''}`}
                              onSelect={() => toggleMode(forbiddenModesText, setForbiddenModesText, value)}
                            >
                              <Check className={cn('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
                              <span>{mode.label_zh || mode.value}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="text-[11px] text-muted-foreground">适合在天气恶劣或安全优先时使用。</div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-medium">可接受风力上限（m/s，可选）</div>
              <Input
                value={maxWindToleranceText}
                onChange={(e) => setMaxWindToleranceText(e.target.value)}
                placeholder={`例如：${constraintsMeta?.fields?.max_wind_speed_tolerance_mps?.max ?? 10}`}
                inputMode="decimal"
              />
              <div className="text-[11px] text-muted-foreground">
                不填表示按系统默认风力阈值处理。
                {typeof constraintsMeta?.fields?.max_wind_speed_tolerance_mps?.min === 'number' ||
                typeof constraintsMeta?.fields?.max_wind_speed_tolerance_mps?.max === 'number'
                  ? ` 可填范围：${constraintsMeta?.fields?.max_wind_speed_tolerance_mps?.min ?? '-'} ~ ${constraintsMeta?.fields?.max_wind_speed_tolerance_mps?.max ?? '-'} m/s`
                  : ''}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-medium">备注（可选）</div>
              <Input
                value={reasonCodeText}
                onChange={(e) => setReasonCodeText(e.target.value)}
                placeholder="例如：大风天气优先公共交通"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPreferredModesText('');
                setForbiddenModesText('');
                setMaxWindToleranceText('');
                setReasonCodeText('');
              }}
            >
              清空
            </Button>
            <Button type="button" onClick={() => setConstraintsDialogOpen(false)}>
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 消息区域 */}
      <ScrollArea className="flex-1 min-w-0">
        <div className={cn(AGENT_PANEL_CONTENT_MAX_CLASS, 'space-y-4 px-4 py-4')}>
          {messages.length === 0 ? (
            (() => {
              // 规划工作台场景：加载中显示骨架屏
              if (entryPoint === 'planning_workbench' && tripInsightLoading) {
                return (
                  <div className="py-8 px-4">
                    <div className="text-center mb-6">
                      <Compass className="w-14 h-14 mx-auto mb-4 text-primary/60" />
                      <p className="text-lg font-semibold mb-3 text-foreground">规划助手 Nara 🧭</p>
                      <p className="text-xs text-muted-foreground mb-4">正在分析你的行程...</p>
                      <div className="flex justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    </div>
                  </div>
                );
              }
              
              const welcomeConfig = getWelcomeConfig(entryPoint, tripInsight, {
                hasBoundTrip: Boolean(sanitizedTripId),
              });
              const WelcomeIcon = welcomeConfig.icon;
              return (
                <div className="py-6 px-4">
                  <div className="text-center mb-5">
                    <WelcomeIcon className="w-12 h-12 mx-auto mb-3 text-primary/60" />
                    <p className="text-base font-semibold mb-1 text-foreground">{welcomeConfig.title}</p>
                    <p className="text-xs text-muted-foreground mb-3">{welcomeConfig.subtitle}</p>
                    <div className="text-sm text-muted-foreground">
                      {welcomeConfig.greeting}
                    </div>
                  </div>
                  
                  {/* 意图按钮 */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground text-center mb-3">
                      {entryPoint === 'planning_workbench' && tripInsight 
                        ? '想让我帮你处理哪个问题？' 
                        : entryPoint === 'planning_workbench' 
                          ? '告诉我你现在想做什么：' 
                          : sanitizedTripId
                            ? '可选快捷语句：'
                            : '你可以试试这样说：'}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {welcomeConfig.quickIntents.map((intent, index) => {
                        const IntentIcon = intent.icon;
                        return (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="rounded-full text-xs h-8 px-3"
                            onClick={() => {
                              if (
                                entryPoint === 'planning_workbench' &&
                                looksLikeHotelSearchRequest(intent.prompt)
                              ) {
                                void handleSend(intent.prompt);
                              } else {
                                setInput(intent.prompt);
                              }
                            }}
                          >
                            <IntentIcon className="w-3 h-3 mr-1.5" />
                            {intent.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {welcomeConfig.example && (
                    <div className="text-center text-sm text-muted-foreground">
                      <p className="mb-1">
                        比如：<span className="text-primary font-medium">{welcomeConfig.example}</span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            messages.map((message, index) => {
              const adjustDraftPreview = planStudioContext?.itineraryAdjustDraftPreview;
              const fallbackTimelineDayBlocks =
                message.itineraryAdjustIntake &&
                !message.itineraryAdjustAutoApplied &&
                adjustDraftPreview
                  ? adjustDraftPreview.timelineDayBlocks
                  : undefined;

              // 为错误消息提供重试功能
              const handleRetry = message.status === 'failed' && index === messages.length - 1
                ? () => {
                    // 重新发送最后一条用户消息
                    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
                    if (lastUserMessage) {
                      // 移除错误消息
                      setMessages((prev) => prev.filter((m) => m.id !== message.id));
                      // 设置输入并触发发送
                      setInput(lastUserMessage.content);
                      // 使用 setTimeout 确保状态更新后再发送
                      setTimeout(() => {
                        handleSend();
                      }, 100);
                    }
                  }
                : undefined;
              
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  mode={currentMode}
                  tripTimezone={tripTimezone}
                  tripPoiSchedules={tripPoiSchedules}
                  fallbackTimelineDayBlocks={fallbackTimelineDayBlocks}
                  tripStayDates={
                    tripHotelPreflightDates
                      ? {
                          checkIn: tripHotelPreflightDates.startDateIso,
                          checkOut: tripHotelPreflightDates.endDateIso,
                        }
                      : undefined
                  }
                  userId={user?.id}
                  onRetry={handleRetry}
                  debugUiDefaults={debugUiDefaults}
                  onSendClarification={(payload) => {
                    void handleSend(payload.message, payload.structured, {
                      clarificationAnswers: payload.clarification_answers,
                      clarificationDisplayMessage: payload.displayMessage,
                    });
                  }}
                  clarificationSubmitDisabled={loading}
                  activeTripId={sanitizedTripId ?? undefined}
                  planningAssistantSessionId={planningAssistantSessionIdRef.current}
                  chatSending={loading}
                  onAdoptHealingPreview={handleAdoptHealingPreview}
                  adoptHealingBusyKey={adoptHealingBusyKey}
                  onSuggestedRouteRun={(msg, tid, intentFromPayload) => {
                    void handleSend(msg, undefined, {
                      invokeSuggestedOperation: true,
                      ...(tid !== undefined ? { routeRunTripIdOverride: tid } : {}),
                      ...(intentFromPayload ? { suggestedOperationIntentMode: intentFromPayload } : {}),
                    });
                  }}
                  onTripDataRefresh={onSystem2Response}
                  onApplySuggestToTrip={
                    sanitizedTripId
                      ? () => {
                          void handleSend(
                            '请将上文给出的建议落实到当前行程（在尽量不推翻现有日程的前提下合并调整）。',
                            undefined,
                            { forceIntentMode: 'planning' }
                          );
                        }
                      : undefined
                  }
                  onApplyItineraryAdjustDraft={
                    sanitizedTripId
                      ? (msg) => {
                          void handleApplyItineraryAdjustDraft(msg);
                        }
                      : undefined
                  }
                  onIntentChipSelect={(chip) => {
                    const tt = chip.taskTypeOverride?.toUpperCase() ?? '';
                    const msg =
                      (chip.payload?.follow_up_message as string | undefined)?.trim() ||
                      (chip.payload?.message as string | undefined)?.trim() ||
                      chip.label;
                    if (!tt) {
                      void handleSend(msg, undefined, { forceIntentMode: 'auto' });
                      return;
                    }
                    let forced: UserExplicitIntentMode = 'data_lookup';
                    if (tt.includes('PLANNING') || tt === 'TRIP_PLANNING') forced = 'planning';
                    else if (tt.includes('GENERIC') || tt === 'GENERIC_QA' || tt === 'QA') forced = 'generic_qa';
                    else if (tt.includes('DATA_LOOKUP') || tt.includes('LOOKUP')) forced = 'data_lookup';
                    void handleSend(msg, undefined, { forceIntentMode: forced });
                  }}
                />
              );
            })
          )}
          {showHotelPreflightCard &&
          entryPoint !== 'planning_workbench' &&
          tripHotelPreflightDates &&
          !tripInsightLoading ? (
            <div>
              <HotelSearchPreflightCard
                startDateIso={tripHotelPreflightDates.startDateIso}
                endDateIso={tripHotelPreflightDates.endDateIso}
                destination={tripHotelPreflightDates.destination}
                disabled={loading}
                onConfirmItinerary={() =>
                  void handleSend(
                    '好的，请按当前行程日期帮我推荐酒店。',
                    undefined,
                    {
                      forceIntentMode: 'data_lookup',
                      enableLiveToolsOverride: ['hotel'],
                      omitStructuredTravelInput: true,
                      skipHotelPreflight: true,
                    }
                  )
                }
                onSearchCustomDates={(checkIn, checkOut) => {
                  const dest = tripInsight?.tripSummary.destination?.trim();
                  void handleSend(
                    '请按以下入住、退房日期搜索酒店。',
                    {
                      start_date: checkIn,
                      end_date: checkOut,
                      ...(dest ? { destination: dest } : {}),
                    },
                    {
                      forceIntentMode: 'data_lookup',
                      enableLiveToolsOverride: ['hotel'],
                      skipHotelPreflight: true,
                    }
                  );
                }}
              />
            </div>
          ) : null}
          {shouldShowRouteRunThinking({
            httpInFlight: loading,
            planningTaskProcessing: planningTaskBusy,
          }) && !messages.some((m) => m.status === 'thinking') ? (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg border border-border/60">
                <PlannerThinkingLoading
                  compact
                  size={36}
                  label={loadingUiLabel?.trim() || undefined}
                  progress={routeRunAsyncProgress}
                  className="px-3 py-2.5"
                />
              </div>
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* 输入区域 */}
      <div className="flex-shrink-0 border-t p-4">
        <div className={AGENT_PANEL_CONTENT_MAX_CLASS}>
        {(isAwaitingConfirmation || negotiationConflictBlocking) && (
          <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800">
            {negotiationConflictBlocking
              ? '⚠️ 协商版本冲突：请先处理弹窗中的协商，或点击遮罩上的「我知道了」后再重新发起。'
              : '⚠️ 需要你确认一下，再继续行动～'}
          </div>
        )}
        {(activeTripId && !compactAgentChrome) || showAgentDebugTools ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {activeTripId && !compactAgentChrome ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTimelineDialogOpen(true)}
                disabled={loading}
                className="h-8 px-3"
                title="决策修订时间轴（调试）"
              >
                时间轴
              </Button>
            ) : null}
            {showAgentDebugTools ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReplayTripRunId(activeTripId || replayTripRunId);
                    setReplayTimelineOpen(true);
                  }}
                  disabled={loading}
                  className="h-8 px-3"
                  title="Replay Timeline"
                >
                  回放
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReplayTripRunId(activeTripId || replayTripRunId);
                    setReplayWhatIfOpen(true);
                  }}
                  disabled={loading}
                  className="h-8 px-3"
                  title="Replay What-if"
                >
                  What-if
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReplayTripRunId(activeTripId || replayTripRunId);
                    setReplayCounterfactualOpen(true);
                  }}
                  disabled={loading}
                  className="h-8 px-3"
                  title="Replay Counterfactual"
                >
                  反事实
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
        <div
          className={cn(
            'flex items-center rounded-md border border-input bg-background shadow-sm transition-colors',
            'focus-within:ring-1 focus-within:ring-ring',
            (loading || isAwaitingConfirmation || negotiationConflictBlocking) && 'opacity-60'
          )}
        >
          <AgentIntentModePicker
            embedded
            value={userIntentMode}
            onChange={setUserIntentMode}
            disabled={loading || isAwaitingConfirmation || negotiationConflictBlocking}
          />
          <div className="h-5 w-px shrink-0 bg-border" aria-hidden />
          <Input
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={inputPlaceholder}
            disabled={loading || isAwaitingConfirmation || negotiationConflictBlocking}
            className="min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <Button
            onClick={() => void handleSend()}
            disabled={loading || !input.trim() || isAwaitingConfirmation || negotiationConflictBlocking}
            size="icon"
            variant="ghost"
            className="mr-1 h-8 w-8 shrink-0 text-primary hover:bg-primary/10 hover:text-primary"
            aria-label="发送"
            data-send-button
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        </div>
      </div>

      {/* 协商弹窗（Decision OS v1.0） */}
      <NegotiationDialog
        open={negotiationDialogOpen}
        correlationRequestId={negotiationAuditRequestId}
        onNegotiationConflict={() => setNegotiationConflictBlocking(true)}
        onOpenChange={(o) => {
          // 强摩擦：只允许 Confirm 或 Discard 关闭协商弹窗
          if (!o && negotiationPayload?.status === 'PENDING_USER_DECISION') {
            toast.message('需要你做一个选择', {
              description: '请选择并确认一个方案，或点击“放弃本次调整”回到纯净态。',
            });
            return;
          }
          setNegotiationDialogOpen(o);
          if (!o) setNegotiationPayload(null);
        }}
        negotiation={negotiationPayload}
        onViewed={() => {
          if (!negotiationPayload || !negotiationAuditRequestId) return;
          void agentApi
            .logDecision({
              request_id: negotiationAuditRequestId,
              user_id: user?.id || 'anonymous',
              trip_id: sanitizedTripId ?? null,
              event: 'NEGOTIATION_VIEWED' as LogDecisionEvent,
              negotiation_session_id: negotiationPayload.negotiation_session_id,
              expected_negotiation_hash: negotiationPayload.expected_negotiation_hash,
              client_ts: new Date().toISOString(),
            })
            .catch(() => {});
        }}
        onTagExpanded={({ alternativeId, tag }) => {
          if (!negotiationPayload || !negotiationAuditRequestId) return;
          void agentApi
            .logDecision({
              request_id: negotiationAuditRequestId,
              user_id: user?.id || 'anonymous',
              trip_id: sanitizedTripId ?? null,
              event: 'NEGOTIATION_TAG_EXPANDED' as LogDecisionEvent,
              negotiation_session_id: negotiationPayload.negotiation_session_id,
              expected_negotiation_hash: negotiationPayload.expected_negotiation_hash,
              selected_alternative_id: alternativeId,
              reasoning_tag: tag,
              client_ts: new Date().toISOString(),
            })
            .catch(() => {});
        }}
        onConfirmed={() => {
          setNegotiationConflictBlocking(false);
          // best-effort：记录确认
          if (negotiationPayload && negotiationAuditRequestId) {
            void agentApi
              .logDecision({
                request_id: negotiationAuditRequestId,
                user_id: user?.id || 'anonymous',
                trip_id: sanitizedTripId ?? null,
                event: 'NEGOTIATION_CONFIRMED' as LogDecisionEvent,
                negotiation_session_id: negotiationPayload.negotiation_session_id,
                expected_negotiation_hash: negotiationPayload.expected_negotiation_hash,
                selected_alternative_id: (negotiationPayload as any)?.default_option_id,
                client_ts: new Date().toISOString(),
              })
              .catch(() => {});
          }
          if (onSystem2Response) {
            setTimeout(() => onSystem2Response(), 500);
          }
        }}
        onDiscard={() => {
          setNegotiationConflictBlocking(false);
          // best-effort：记录放弃
          if (negotiationPayload && negotiationAuditRequestId) {
            void agentApi
              .logDecision({
                request_id: negotiationAuditRequestId,
                user_id: user?.id || 'anonymous',
                trip_id: sanitizedTripId ?? null,
                event: 'NEGOTIATION_DISCARDED' as LogDecisionEvent,
                negotiation_session_id: negotiationPayload.negotiation_session_id,
                expected_negotiation_hash: negotiationPayload.expected_negotiation_hash,
                client_ts: new Date().toISOString(),
              })
              .catch(() => {});
          }
          // Discard：关闭弹窗并清理协商状态；保持行程为“修改前纯净态”
          setNegotiationPayload(null);
          setNegotiationDialogOpen(false);
          setNegotiationAuditRequestId(null);
          // 同步把“等待确认”的提示消息改为 done，避免输入一直被禁用
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (!last) return prev;
            if (last.role === 'assistant' && last.status === 'awaiting_confirmation') {
              return [
                ...prev.slice(0, -1),
                {
                  ...last,
                  content: '已放弃本次调整。我们回到修改前的纯净态，你可以继续提出新的问题或重新发起协商。',
                  status: 'done',
                },
              ];
            }
            return prev;
          });
        }}
      />

      {/* 决策时间轴 / 回滚 */}
      <RevisionTimelineDialog
        open={timelineDialogOpen}
        onOpenChange={setTimelineDialogOpen}
        tripId={sanitizedTripId ?? undefined}
      />

      <Dialog open={replayTimelineOpen} onOpenChange={setReplayTimelineOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Decision Replay Timeline</DialogTitle>
            <DialogDescription>输入 tripRunId 查询回放时间轴。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">tripRunId</div>
            <Input
              value={replayTripRunId}
              onChange={(e) => setReplayTripRunId(e.target.value)}
              placeholder={activeTripId || '例如: run-20260430-001'}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplayTimelineOpen(false)}>
              取消
            </Button>
            <Button onClick={handleReplayTimeline} disabled={replayLoading}>
              {replayLoading ? '查询中...' : '查询'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={replayWhatIfOpen} onOpenChange={setReplayWhatIfOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Decision Replay What-if</DialogTitle>
            <DialogDescription>填写 tripRunId 与 assumptions（JSON 数组）。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">tripRunId</div>
              <Input
                value={replayTripRunId}
                onChange={(e) => setReplayTripRunId(e.target.value)}
                placeholder={activeTripId || '例如: run-20260430-001'}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">assumptions (JSON)</div>
              <Textarea
                value={whatIfAssumptionsJson}
                onChange={(e) => setWhatIfAssumptionsJson(e.target.value)}
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplayWhatIfOpen(false)}>
              取消
            </Button>
            <Button onClick={handleReplayWhatIf} disabled={replayLoading}>
              {replayLoading ? '执行中...' : '执行 what-if'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={replayCounterfactualOpen} onOpenChange={setReplayCounterfactualOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Decision Replay Counterfactual</DialogTitle>
            <DialogDescription>填写 tripRunId 与请求体 payload（JSON 对象）。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">tripRunId</div>
              <Input
                value={replayTripRunId}
                onChange={(e) => setReplayTripRunId(e.target.value)}
                placeholder={activeTripId || '例如: run-20260430-001'}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">payload (JSON)</div>
              <Textarea
                value={counterfactualPayloadJson}
                onChange={(e) => setCounterfactualPayloadJson(e.target.value)}
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplayCounterfactualOpen(false)}>
              取消
            </Button>
            <Button onClick={handleReplayCounterfactual} disabled={replayLoading}>
              {replayLoading ? '执行中...' : '执行 counterfactual'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 浏览器授权对话框 */}
      <AlertDialog open={consentDialogOpen} onOpenChange={setConsentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>需要您的授权</AlertDialogTitle>
            <AlertDialogDescription>
              这个操作需要获取网页内容，是否授权我继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setConsentDialogOpen(false);
              setPendingConsentRequest(null);
              setMessages((prev) => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage && lastMessage.status === 'awaiting_consent') {
                  return [
                    ...prev.slice(0, -1),
                    {
                      ...lastMessage,
                      content: '明白啦，我们保持现状 ✋',
                      status: 'done',
                    },
                  ];
                }
                return prev;
              });
            }}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!pendingConsentRequest) return;
              
              setConsentDialogOpen(false);
              
              // 用户授权后，重新请求并设置 allow_webbrowse = true
              const retryRequest: RouteAndRunRequest = {
                ...pendingConsentRequest,
                options: {
                  ...pendingConsentRequest.options,
                  allow_webbrowse: true,
                },
              };
              
              setPendingConsentRequest(null);
              
              // 更新消息状态
              setMessages((prev) => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage && lastMessage.status === 'awaiting_consent') {
                  return [
                    ...prev.slice(0, -1),
                    {
                      ...lastMessage,
                      content: '已授权，正在重新执行…',
                      status: 'thinking',
                    },
                  ];
                }
                return prev;
              });
              
              setLoading(true);

              routeRunPollAbortRef.current?.abort();
              const retryPollAbort = new AbortController();
              routeRunPollAbortRef.current = retryPollAbort;
              setRouteRunAsyncProgress(undefined);
              const onRetryProgress = (snap: RouteRunAsyncTaskStatusResponse) => {
                const label = formatRouteRunAsyncProgressLabel(snap);
                setLoadingUiLabel(label);
                const pct =
                  typeof snap.progress_percentage === 'number' &&
                  Number.isFinite(snap.progress_percentage)
                    ? snap.progress_percentage
                    : undefined;
                setRouteRunAsyncProgress(pct);
              };

              // 重新发送请求
              try {
                const retryResponse = await invokeRouteAndRun(retryRequest, {
                  signal: retryPollAbort.signal,
                  onProgress: onRetryProgress,
                });

                if (import.meta.env.DEV) {
                  const pr =
                    retryResponse.result.payload &&
                    typeof retryResponse.result.payload === 'object'
                      ? (retryResponse.result.payload as Record<string, unknown>)
                      : undefined;
                  logRouteRunDevSelfCheck({
                    label: '[route_and_run:self-check][retry]',
                    payload: pr,
                    response: retryResponse,
                    requestTripId: retryRequest.trip_id ?? null,
                    isCacheReplay: isRouteRunCacheReplay(retryResponse),
                  });
                }

                // 处理重试响应（复用相同的处理逻辑）
                const routeType = retryResponse.route.route;
                const isSystem2 = routeType === 'SYSTEM2_REASONING' || routeType === 'SYSTEM2_WEBBROWSE';
                const rawRetryDecisionLog = pickRawDecisionLogFromRouteRun(retryResponse);
                const retryDecisionLog: DecisionLogEntry[] = rawRetryDecisionLog.map((entry: any) =>
                  normalizeToNewFormat(entry, retryResponse.request_id)
                );
                const mode = retryResponse.route.ui_hint.mode;
                
                setCurrentMode(mode);
                
                const retryAnswerText =
                  retryResponse.result.answer_text != null
                    ? String(retryResponse.result.answer_text)
                    : '';
                let retryMessageContent = retryAnswerText;
                let retryUiStatus: UIStatus = (retryResponse.route.ui_hint.status || 'done') as UIStatus;
                
                const retryClarificationQuestions = normalizeRouteRunClarificationQuestions(
                  retryResponse.result.payload?.clarificationQuestions
                );

                const retryPayloadRecord =
                  retryResponse.result.payload && typeof retryResponse.result.payload === 'object'
                    ? (retryResponse.result.payload as Record<string, unknown>)
                    : undefined;

                const retryRouteRunSurface = pickRouteRunSurface({
                  status: retryResponse.result.status,
                  payload: retryPayloadRecord,
                  response: retryResponse,
                });
                const retryRouteRunViewMode = resolveRouteRunViewMode(retryResponse);

                if (retryResponse.result.status === 'NEED_MORE_INFO') {
                  if (retryResponse.route.ui_hint.status === 'awaiting_confirmation' || 
                      retryResponse.route.ui_hint.status === 'awaiting_user_input') {
                    retryUiStatus = 'awaiting_user_input';
                  } else {
                    retryUiStatus = 'awaiting_user_input';
                  }

                  if (retryRouteRunViewMode === 'clarification' && retryClarificationQuestions.length > 0) {
                    retryMessageContent = '';
                  } else {
                    const clarificationInfo = retryResponse.result.payload?.clarificationInfo;
                    const clarificationMessage = retryResponse.result.payload?.clarificationMessage;
                    if (clarificationMessage) {
                      retryMessageContent = clarificationMessage;
                    } else if (clarificationInfo) {
                      let clarificationText = retryAnswerText;

                      if (clarificationInfo.missingServices && clarificationInfo.missingServices.length > 0) {
                        clarificationText += `\n\n**缺失的服务：**\n${clarificationInfo.missingServices.map((s: string) => `- ${s}`).join('\n')}`;
                      }

                      if (clarificationInfo.impact) {
                        clarificationText += `\n\n**影响：**\n${clarificationInfo.impact}`;
                      }

                      if (clarificationInfo.solutions && clarificationInfo.solutions.length > 0) {
                        clarificationText += `\n\n**解决方案：**\n${clarificationInfo.solutions.map((s: string) => `- ${s}`).join('\n')}`;
                      }

                      retryMessageContent = clarificationText;
                    }
                  }
                } else if (retryResponse.result.status === 'TIMEOUT') {
                  retryMessageContent = 'TIMEOUT'; // 特殊标记，用于显示优化的错误UI
                  retryUiStatus = 'failed';
                } else if (retryResponse.result.status === 'FAILED') {
                  retryMessageContent = retryAnswerText || 'FAILED'; // 特殊标记，用于显示优化的错误UI
                  retryUiStatus = 'failed';
                } else if (retryResponse.result.status === 'OK') {
                  retryUiStatus = (retryResponse.route.ui_hint.status || 'done') as UIStatus;
                }

                if (retryResponse.result.status !== 'TIMEOUT') {
                  retryMessageContent = sanitizeRouteRunAnswerTextForDisplay(retryMessageContent);
                }

                const retryReasoning = getAgentReasoningState(retryResponse);
                const retryDisplayStatus =
                  retryReasoning.uiMode === 'CLARIFYING'
                    ? ('awaiting_user_input' as UIStatus)
                    : retryUiStatus;

                const retryRouteDecisionTaskType =
                  typeof retryResponse.route.task_type === 'string'
                    ? retryResponse.route.task_type.trim()
                    : undefined;
                const retryTaskType = resolveRoutingTaskType(retryResponse, retryPayloadRecord);
                const retryRoutePolicy =
                  retryResponse.route.route_policy ??
                  (typeof retryPayloadRecord?.route_policy === 'string'
                    ? retryPayloadRecord.route_policy
                    : undefined);
                const retryInteractionKind = inferInteractionKind(
                  retryTaskType,
                  retryRoutePolicy,
                  routeType
                );
                const retryRagSources = extractRagSources(retryPayloadRecord);
                const retryKbRagCitationCount = extractKbRagCitationCount(retryPayloadRecord);
                const retryKbRagHit = extractKbRagHitFromTrace(retryPayloadRecord);
                const retryIntentActionChips = pickIntentChipsFromPayload(retryPayloadRecord);
                const retryRagStructured = extractRagStructuredOutcome(retryMessageContent, retryPayloadRecord);
                const retryLiveSensorAudit =
                  retryPayloadRecord?.live_sensor_audit &&
                  typeof retryPayloadRecord.live_sensor_audit === 'object' &&
                  !Array.isArray(retryPayloadRecord.live_sensor_audit)
                    ? (retryPayloadRecord.live_sensor_audit as Record<string, unknown>)
                    : undefined;
                const retryHotels =
                  extractHotelsFromAgentPayload(retryPayloadRecord) ??
                  extractHotelsFromAgentPayload(
                    retryResponse.result && typeof retryResponse.result === 'object'
                      ? (retryResponse.result as Record<string, unknown>)
                      : undefined
                  );
                const retryCarRentalsRaw =
                  extractCarRentalsFromAgentPayload(retryPayloadRecord) ??
                  extractCarRentalsFromAgentPayload(
                    retryResponse.result && typeof retryResponse.result === 'object'
                      ? (retryResponse.result as Record<string, unknown>)
                      : undefined
                  );
                const retryCarRentals =
                  (retryCarRentalsRaw?.length ?? 0) > 0 && isLiveSensorCarRentalSucceeded(retryLiveSensorAudit)
                    ? retryCarRentalsRaw
                    : undefined;
                const retryCarRentalSearchMeta =
                  extractCarRentalSearchMetaFromAgentPayload(retryPayloadRecord) ??
                  extractCarRentalSearchMetaFromAgentPayload(
                    retryResponse.result && typeof retryResponse.result === 'object'
                      ? (retryResponse.result as Record<string, unknown>)
                      : undefined
                  );
                const retryCarRentalFallbackDatesUsed =
                  Boolean(retryCarRentals?.length) && retryCarRentalSearchMeta?.fallback_dates_used === true;
                const retryAccommodations = extractAccommodationsFromRouteRunSuccess(
                  retryPayloadRecord,
                  retryResponse.result && typeof retryResponse.result === 'object'
                    ? (retryResponse.result as Record<string, unknown>)
                    : undefined
                );
                const retryAccommodationDisclaimerZh = extractHotelSearchDisclaimerZh(
                  retryPayloadRecord,
                  retryResponse.result && typeof retryResponse.result === 'object'
                    ? (retryResponse.result as Record<string, unknown>)
                    : undefined
                );
                const retryResultRecord =
                  retryResponse.result && typeof retryResponse.result === 'object'
                    ? (retryResponse.result as Record<string, unknown>)
                    : undefined;
                const retryPayloadDisplayBundle = buildRouteRunPayloadDisplayBundle(
                  retryResponse,
                  retryPayloadRecord,
                  retryResultRecord
                );
                const retryPoiCardsByDay = retryPayloadDisplayBundle.poiCardsByDay;
                const retryTimelineDayBlocks = retryPayloadDisplayBundle.timelineDayBlocks;
                const retrySafetySurface = retryPayloadDisplayBundle.safetySurface;
                const retryPayloadOrchestrationResult = retryPayloadDisplayBundle.orchestrationResult;
                maybeToastWorkbenchDrift(retryPayloadDisplayBundle.workbenchDisplay, (msg) => {
                  toast.info(msg);
                });
                let retryPoiSuppressAnswerProse =
                  extractPoiSuppressAnswerProse(retryPayloadRecord) ||
                  retryRouteRunViewMode === 'trip_timeline';
                if (retryRouteRunViewMode === 'trip_timeline' && retryMessageContent.trim()) {
                  retryMessageContent = truncateAnswerTextForBubble(retryMessageContent);
                  retryPoiSuppressAnswerProse = true;
                }
                const retrySuggestedOperations = normalizeSuggestedOperations(
                  retryPayloadRecord?.suggested_operations ?? retryPayloadRecord?.suggestedOperations
                );
                const retryConsultationDashboard = parseConsultationDashboard(retryPayloadRecord);
                const retryHasRenderableStructured =
                  Boolean(retryConsultationDashboard) ||
                  (!retryPayloadDisplayBundle.consultationSurface &&
                    retryPayloadDisplayBundle.hasItineraryPanelsInPayload) ||
                  (retryHotels?.length ?? 0) > 0 ||
                  (retryCarRentals?.length ?? 0) > 0 ||
                  (retryAccommodations?.length ?? 0) > 0 ||
                  safetySurfaceHasRenderableSurface(retrySafetySurface);
                if (
                  retryResponse.result.status === 'OK' &&
                  !retryMessageContent.trim() &&
                  !retryHasRenderableStructured
                ) {
                  retryMessageContent = '处理完成。';
                }
                const retryUiSurface =
                  typeof retryPayloadRecord?.ui_surface === 'string'
                    ? retryPayloadRecord.ui_surface.trim()
                    : typeof retryPayloadRecord?.uiSurface === 'string'
                      ? retryPayloadRecord.uiSurface.trim()
                      : undefined;
                const retryUiHintMessage = String(retryResponse.route.ui_hint.message ?? '').trim() || undefined;
                const retryObsMode = retryResponse.observability.system_mode;
                const retryMemoryConstraintSinkDecisionLog = isConstraintSinkEnabled()
                  ? extractConstraintSinkFromDecisionLog(retryDecisionLog)
                  : undefined;
                const retryMemoryConstraintSinkAnchor = isConstraintSinkEnabled()
                  ? deriveConstraintSinkUiAnchorV1(
                      extractMergedConstraintSinkFromRouteRun(retryResponse, retryDecisionLog)
                    )
                  : undefined;
                const retryIsCacheReplay = isRouteRunCacheReplay(retryResponse);
                const retryOrchestrationModeFinal = getRouteRunOrchestrationModeFinal(retryResponse);
                const retryRouteRunExplainMirror =
                  debugUiDefaults === true
                    ? pickRouteRunExplainGuardianMirror(retryResponse.explain)
                    : undefined;
                const retryRouteRunSimplifiedExplanation = shouldAttachSimplifiedExplanation(debugUiDefaults)
                  ? pickSimplifiedExplanationFromExplain(retryResponse.explain)
                  : undefined;
                const retryRouteRunNoPoiPlanningFlag = readNoPoiPlanningFromPayload(retryPayloadRecord);
                const retryRouteRunExplainOptimization = pickRouteRunExplainOptimizationForMessage(
                  retryResponse,
                  { uiSurface: retryUiSurface, status: retryResponse.result.status }
                );
                const retryItineraryAdjust = parseItineraryAdjustPayload(retryPayloadRecord);
                const retryRouteRunDecisionCockpit =
                  retryItineraryAdjust.decisionCockpitUiSuppressed
                    ? undefined
                    : pickDecisionCockpitFromRouteRun(retryResponse);

                if (retryItineraryAdjust.autoApplied) {
                  toast.success('已更新正式行程');
                  onSystem2Response?.();
                }

                const retryAdjustUiHint = itineraryAdjustUiHintMessage(retryItineraryAdjust);
                const retryEffectiveUiHintMessage = retryAdjustUiHint ?? retryUiHintMessage;

                if (retryItineraryAdjust.intake) {
                  retryPoiSuppressAnswerProse = true;
                  if (!retryItineraryAdjust.adjustResult && retryMessageContent.trim()) {
                    retryMessageContent = truncateAnswerTextForBubble(retryMessageContent);
                  }
                }

                setMessages((prev) => {
                  const filtered = prev.filter((m) => m.status !== 'awaiting_consent' && m.status !== 'thinking');
                  return [
                    ...filtered,
                    {
                      id: `assistant-${Date.now()}`,
                      role: 'assistant',
                      content: retryMessageContent,
                      timestamp: new Date(),
                      status: retryDisplayStatus,
                      routeType,
                      routeInfo: {
                        confidence: retryResponse.route.confidence,
                        latency_ms: retryResponse.observability.latency_ms,
                        tokens_est: retryResponse.observability.tokens_est,
                        cost_est_usd: retryResponse.observability.cost_est_usd,
                        ...(retryResponse.route.selected_path?.trim()
                          ? { selected_path: retryResponse.route.selected_path.trim() }
                          : {}),
                      },
                      decisionLog: retryDecisionLog.length > 0 ? retryDecisionLog : undefined,
                      mode,
                      clarificationQuestions:
                        retryClarificationQuestions.length > 0
                          ? retryClarificationQuestions
                          : undefined,
                      routeRunSurface: retryRouteRunSurface,
                      routeRunViewMode: retryRouteRunViewMode,
                      reasoningState: retryReasoning,
                      interactionKind: retryInteractionKind,
                      taskType: retryTaskType,
                      ...(retryRouteDecisionTaskType ? { routeDecisionTaskType: retryRouteDecisionTaskType } : {}),
                      routePolicy: retryRoutePolicy,
                      ragSources: retryRagSources,
                      ...(retryKbRagCitationCount != null ? { kbRagCitationCount: retryKbRagCitationCount } : {}),
                      ...(retryKbRagHit !== undefined ? { kbRagHit: retryKbRagHit } : {}),
                      ...(retryIntentActionChips && retryIntentActionChips.length > 0
                        ? { intentActionChips: retryIntentActionChips }
                        : {}),
                      ...(retryRagStructured ? { ragStructured: retryRagStructured } : {}),
                      ...(retryUiSurface ? { uiSurface: retryUiSurface } : {}),
                      ...(retryEffectiveUiHintMessage ? { uiHintMessage: retryEffectiveUiHintMessage } : {}),
                      observabilitySystemMode: retryObsMode,
                      ...(retryMemoryConstraintSinkAnchor
                        ? { memoryConstraintSinkAnchor: retryMemoryConstraintSinkAnchor }
                        : {}),
                      ...(retryMemoryConstraintSinkDecisionLog
                        ? { memoryConstraintSinkDecisionLog: retryMemoryConstraintSinkDecisionLog }
                        : {}),
                      isCacheReplay: retryIsCacheReplay,
                      ...(retryOrchestrationModeFinal
                        ? { orchestrationModeFinal: retryOrchestrationModeFinal }
                        : {}),
                      ...(retryLiveSensorAudit ? { liveSensorAudit: retryLiveSensorAudit } : {}),
                      ...(retryAccommodations && retryAccommodations.length > 0
                        ? {
                            accommodations: retryAccommodations,
                            ...(retryAccommodationDisclaimerZh
                              ? { accommodationDisclaimerZh: retryAccommodationDisclaimerZh }
                              : {}),
                          }
                        : {}),
                      ...(retryHotels && retryHotels.length > 0 ? { hotels: retryHotels } : {}),
                      ...(retryCarRentals && retryCarRentals.length > 0
                        ? {
                            carRentals: retryCarRentals,
                            ...(retryCarRentalFallbackDatesUsed
                              ? { carRentalFallbackDatesUsed: true }
                              : {}),
                          }
                        : {}),
                      ...(retryPoiCardsByDay && retryPoiCardsByDay.length > 0
                        ? { poiCardsByDay: retryPoiCardsByDay }
                        : {}),
                      ...(retryTimelineDayBlocks?.length ? { timelineDayBlocks: retryTimelineDayBlocks } : {}),
                      ...(safetySurfaceHasRenderableSurface(retrySafetySurface)
                        ? { safetySurface: retrySafetySurface }
                        : {}),
                      ...(retryPoiSuppressAnswerProse ? { poiSuppressAnswerProse: true } : {}),
                      ...(retryConsultationDashboard ? { consultationDashboard: retryConsultationDashboard } : {}),
                      ...(retrySuggestedOperations ? { suggestedOperations: retrySuggestedOperations } : {}),
                      ...(retryPayloadOrchestrationResult
                        ? { orchestrationResult: retryPayloadOrchestrationResult }
                        : {}),
                      ...(retryRouteRunExplainMirror ? { routeRunExplainMirror: retryRouteRunExplainMirror } : {}),
                      ...(retryRouteRunSimplifiedExplanation
                        ? { routeRunSimplifiedExplanation: retryRouteRunSimplifiedExplanation }
                        : {}),
                      ...(retryRouteRunNoPoiPlanningFlag ? { routeRunNoPoiPlanningFlag: true } : {}),
                      ...(retryRouteRunExplainOptimization && !retryItineraryAdjust.intake
                        ? { routeRunExplainOptimization: retryRouteRunExplainOptimization }
                        : {}),
                      ...(retryRouteRunDecisionCockpit
                        ? { routeRunDecisionCockpit: retryRouteRunDecisionCockpit }
                        : {}),
                      ...(retryResponse.ui_state ? { ui_state: retryResponse.ui_state } : {}),
                      ...(retryItineraryAdjust.intake
                        ? (buildItineraryAdjustMessageFields(retryItineraryAdjust) as Partial<Message>)
                        : {}),
                    },
                  ];
                });

                syncItineraryAdjustDraftToPlanStudio(
                  planStudioContext ?? undefined,
                  retryItineraryAdjust,
                  retryTimelineDayBlocks,
                  retryResponse.request_id
                );

                const retryRouteRunConsultationSurface = retryPayloadDisplayBundle.consultationSurface;
                const retryShouldReloadTrip =
                  isSystem2 &&
                  retryResponse.result.status === 'OK' &&
                  !retryRouteRunConsultationSurface &&
                  retryInteractionKind !== 'lookup' &&
                  retryInteractionKind !== 'qa' &&
                  !shouldSuppressLeftTripRefresh(retryItineraryAdjust) &&
                  !retryItineraryAdjust.autoApplied;
                if (retryShouldReloadTrip) {
                  setTimeout(() => onSystem2Response?.(), 0);
                }
              } catch (retryError: any) {
                console.error('Retry request failed:', retryError);
                const retryRid =
                  (isTripnaraHttpError(retryError) && retryError.requestId) ||
                  retryRequest.request_id;
                const retryBase =
                  retryError?.message != null
                    ? String(retryError.message)
                    : '出了一点小状况，要不再试一次？';
                const retryErrorMessage =
                  retryRid && !retryBase.includes(retryRid)
                    ? `${retryBase}\n\nrequest_id: ${retryRid}`
                    : retryBase;

                toast.error('请求未完成', {
                  description: describeAgentFailureToast(retryError, retryRequest.request_id),
                });

                setMessages((prev) => {
                  const filtered = prev.filter((m) => m.status !== 'awaiting_consent' && m.status !== 'thinking');
                  return [
                    ...filtered,
                    {
                      id: `error-${Date.now()}`,
                      role: 'assistant',
                      content: retryErrorMessage,
                      timestamp: new Date(),
                      status: 'failed',
                    },
                  ];
                });
              } finally {
                setLoading(false);
                setLoadingUiLabel('');
                setRouteRunAsyncProgress(undefined);
              }
            }}>
              授权
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 审批对话框 */}
      {pendingApprovalId && (
        <ApprovalDialog
          approvalId={pendingApprovalId}
          open={approvalDialogOpen}
          onOpenChange={(open) => {
            setApprovalDialogOpen(open);
            if (!open) {
              setPendingApprovalId(null);
            }
          }}
          onDecision={async (approved) => {
            if (approved) {
              toast.success('审批已批准，Nara 正在继续执行...');
              setMessages((prev) => [
                ...prev,
                {
                  id: `approval-approved-${Date.now()}`,
                  role: 'assistant',
                  content: '好的，收到！正在继续执行操作…',
                  timestamp: new Date(),
                  status: 'thinking',
                },
              ]);
            } else {
              toast.info('审批已拒绝，Nara 将调整策略');
              setMessages((prev) => [
                ...prev,
                {
                  id: `approval-rejected-${Date.now()}`,
                  role: 'assistant',
                  content: '明白啦，我们保持现状 ✋ 我会为你寻找替代方案…',
                  timestamp: new Date(),
                  status: 'thinking',
                },
              ]);
            }
            setApprovalDialogOpen(false);
            setPendingApprovalId(null);
          }}
        />
      )}

      {negotiationConflictBlocking ? (
        <div className="pointer-events-auto absolute inset-0 z-[35] flex items-center justify-center bg-background/85 px-4 backdrop-blur-[1px]">
          <div className="max-w-md space-y-3 rounded-lg border bg-card p-4 text-center shadow-lg">
            <p className="text-sm font-medium">协商版本冲突</p>
            <p className="text-xs text-muted-foreground">
              当前协商已失效或与服务器不一致。请先查看协商弹窗提示，关闭后重新发送消息发起新一轮协商。
            </p>
            <Button type="button" onClick={() => setNegotiationConflictBlocking(false)}>
              我知道了
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}