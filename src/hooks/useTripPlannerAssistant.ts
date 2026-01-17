/**
 * 行程规划智能助手 Hook
 * 
 * 封装与 trip-planner API 的交互逻辑，提供：
 * - 会话管理
 * - 消息发送与接收
 * - 快捷操作处理
 * - 修改确认
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  tripPlannerApi,
  type PlannerPhase,
  type PlannerIntent,
  type QuickAction,
  type QuickActionType,
  type RichContent,
  type PendingChange,
  type TripUpdateSummary,
  type FollowUp,
  type PlannerChatResponse,
  // 三人格守护者系统
  type PersonaInsight,
  type GuardianEvaluation,
  type Disclaimer,
  // 意图消歧系统
  type PlannerResponseMeta,
} from '@/api/trip-planner';

// ==================== 类型定义 ====================

/**
 * 聊天消息
 */
export interface PlannerMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  // 助手消息特有字段
  phase?: PlannerPhase;
  intent?: PlannerIntent;
  richContent?: RichContent;
  quickActions?: QuickAction[];
  pendingChanges?: PendingChange[];
  tripUpdate?: TripUpdateSummary;
  followUp?: FollowUp;
  // 🆕 三人格守护者系统
  personaInsights?: PersonaInsight[];
  guardianEvaluation?: GuardianEvaluation;
  disclaimer?: Disclaimer;
  // 🆕 意图消歧系统
  meta?: PlannerResponseMeta;
}

/**
 * Hook 配置选项
 */
export interface UseTripPlannerAssistantOptions {
  tripId: string;
  autoStart?: boolean; // 是否自动开始会话
  onTripUpdate?: (update: TripUpdateSummary) => void; // 行程更新回调
  onError?: (error: Error) => void; // 错误回调
}

/**
 * 发送消息选项类型
 */
export interface SendMessageOptions {
  targetDay?: number;
  targetItemId?: string;
  /** 上下文信息 */
  context?: {
    selectedContext?: {
      dayIndex?: number;
      date?: string;
      itemId?: string;
      placeName?: string;
      itemType?: string;
    };
    adjacentItems?: {
      prevItem?: { name: string; endTime: string; type?: string };
      nextItem?: { name: string; startTime: string; type?: string };
    };
    dayStats?: {
      totalItems: number;
      hasMeal: boolean;
      hasTransit: boolean;
      freeSlots?: Array<{ start: string; end: string }>;
    };
  };
  /** 澄清选择数据 */
  clarificationData?: {
    selectedAction?: 'QUERY' | 'ADD_TO_ITINERARY' | 'REPLACE' | 'REMOVE' | 'MODIFY';
    params?: {
      dayNumber?: number;
      timeSlot?: { start: string; end: string };
      targetItemId?: string;
      gapId?: string;
    };
  };
}

/**
 * Hook 返回值
 */
export interface UseTripPlannerAssistantReturn {
  // 状态
  messages: PlannerMessage[];
  sessionId: string | null;
  currentPhase: PlannerPhase;
  loading: boolean;
  error: string | null;
  pendingChanges: PendingChange[];
  isInitialized: boolean;
  
  // 操作方法
  startSession: () => Promise<void>;
  sendMessage: (message: string, options?: SendMessageOptions) => Promise<void>;
  executeAction: (action: QuickActionType, params?: Record<string, unknown>) => Promise<void>;
  confirmChanges: (changeIds?: string[]) => Promise<void>;
  rejectChanges: () => void;
  clearMessages: () => void;
}

// ==================== Hook 实现 ====================

export function useTripPlannerAssistant({
  tripId,
  autoStart = true,
  onTripUpdate,
  onError,
}: UseTripPlannerAssistantOptions): UseTripPlannerAssistantReturn {
  // 状态
  const [messages, setMessages] = useState<PlannerMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<PlannerPhase>('OVERVIEW');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs
  const messageIdCounter = useRef(0);
  const initializingRef = useRef(false);

  /**
   * 生成唯一消息 ID
   */
  const generateMessageId = useCallback(() => {
    messageIdCounter.current += 1;
    return `msg_${Date.now()}_${messageIdCounter.current}`;
  }, []);

  /**
   * 添加用户消息
   */
  const addUserMessage = useCallback((content: string): string => {
    const id = generateMessageId();
    const message: PlannerMessage = {
      id,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
    return id;
  }, [generateMessageId]);

  /**
   * 添加助手消息
   */
  const addAssistantMessage = useCallback((response: PlannerChatResponse): string => {
    // 🔍 调试：打印后端返回的 richContent 数据结构
    console.log('[useTripPlannerAssistant] 后端返回的 richContent:', {
      type: response.richContent?.type,
      hasData: !!response.richContent,
      data: response.richContent,
    });
    if (response.richContent?.type === 'timeline') {
      console.log('[useTripPlannerAssistant] Timeline 数据:', {
        days: (response.richContent as any).data?.length,
        firstDay: (response.richContent as any).data?.[0],
        firstDayItems: (response.richContent as any).data?.[0]?.items,
      });
    }
    
    const id = generateMessageId();
    const message: PlannerMessage = {
      id,
      role: 'assistant',
      content: response.message,
      timestamp: new Date(),
      phase: response.phase,
      intent: response.intent,
      richContent: response.richContent,
      quickActions: response.quickActions,
      pendingChanges: response.pendingChanges,
      tripUpdate: response.tripUpdate,
      followUp: response.followUp,
      // 三人格守护者系统
      personaInsights: response.personaInsights,
      guardianEvaluation: response.guardianEvaluation,
      disclaimer: response.disclaimer,
      // 意图消歧系统
      meta: response.meta,
    };
    setMessages(prev => [...prev, message]);
    
    // 更新当前阶段
    if (response.phase) {
      setCurrentPhase(response.phase);
    }
    
    // 更新待确认修改
    if (response.pendingChanges) {
      setPendingChanges(response.pendingChanges);
    }
    
    // 通知行程更新
    if (response.tripUpdate && onTripUpdate) {
      onTripUpdate(response.tripUpdate);
    }
    
    return id;
  }, [generateMessageId, onTripUpdate]);

  /**
   * 处理错误
   */
  const handleError = useCallback((err: Error) => {
    setError(err.message);
    if (onError) {
      onError(err);
    }
    console.error('[useTripPlannerAssistant] 错误:', err);
  }, [onError]);

  /**
   * 开始会话
   */
  const startSession = useCallback(async () => {
    if (!tripId || loading || initializingRef.current) return;
    
    initializingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const response = await tripPlannerApi.start({ tripId });
      
      setSessionId(response.sessionId);
      setCurrentPhase(response.phase);
      
      // 🔍 调试：打印初始 richContent 数据
      console.log('[useTripPlannerAssistant] 初始 richContent:', {
        type: response.richContent?.type,
        hasData: !!response.richContent,
        data: response.richContent,
      });
      if (response.richContent?.type === 'timeline') {
        const timelineData = response.richContent as any;
        console.log('[useTripPlannerAssistant] 初始 Timeline 数据:', {
          days: timelineData.data?.length,
          firstDay: timelineData.data?.[0],
          firstDayItems: timelineData.data?.[0]?.items,
          // 检查 items 的字段
          firstItem: timelineData.data?.[0]?.items?.[0],
          firstItemKeys: timelineData.data?.[0]?.items?.[0] ? Object.keys(timelineData.data[0].items[0]) : [],
        });
      }
      
      // 添加欢迎消息
      const welcomeMessage: PlannerMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        phase: response.phase,
        intent: response.intent,
        richContent: response.richContent,
        quickActions: response.quickActions,
      };
      setMessages([welcomeMessage]);
      setIsInitialized(true);
      
      console.log('[useTripPlannerAssistant] 会话已启动:', response.sessionId);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
      initializingRef.current = false;
    }
  }, [tripId, loading, generateMessageId, handleError]);

  /**
   * 发送消息
   */
  const sendMessage = useCallback(async (
    message: string, 
    options?: SendMessageOptions
  ) => {
    if (!tripId || !message.trim() || loading) return;
    
    // 添加用户消息
    addUserMessage(message);
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await tripPlannerApi.chat({
        tripId,
        message: message.trim(),
        sessionId: sessionId || undefined,
        targetDay: options?.targetDay,
        targetItemId: options?.targetItemId,
        context: {
          language: 'zh',
          // 🆕 传递完整上下文
          selectedContext: options?.context?.selectedContext,
          adjacentItems: options?.context?.adjacentItems,
          dayStats: options?.context?.dayStats,
        },
        // 🆕 传递澄清数据
        clarificationData: options?.clarificationData,
      });
      
      // 更新 sessionId（首次对话时会返回）
      if (response.sessionId && !sessionId) {
        setSessionId(response.sessionId);
      }
      
      // 添加助手回复
      addAssistantMessage(response);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [tripId, sessionId, loading, addUserMessage, addAssistantMessage, handleError]);

  /**
   * 执行快捷操作
   */
  const executeAction = useCallback(async (
    action: QuickActionType, 
    params?: Record<string, unknown>
  ) => {
    if (!tripId || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 添加用户操作提示
      const actionLabels: Record<QuickActionType, string> = {
        OPTIMIZE_ROUTE: '优化行程路线',
        ARRANGE_MEALS: '推荐餐厅',
        CREATE_CHECKLIST: '生成行前清单',
        SHOW_OVERVIEW: '查看行程概览',
        PLAN_TRANSPORT: '规划交通',
        FILL_FREE_TIME: '填充空闲时间',
        GET_SUGGESTION: '获取建议',
        EXPORT_ITINERARY: '导出行程',
        APPLY_PACE_ADJUSTMENT: '应用节奏调整',
        MANUAL_ADJUST: '手动调整',
      };
      addUserMessage(`🎯 ${actionLabels[action] || action}`);
      
      const response = await tripPlannerApi.action({
        tripId,
        action,
        sessionId: sessionId || undefined,
        params,
      });
      
      // 更新 sessionId
      if (response.sessionId && !sessionId) {
        setSessionId(response.sessionId);
      }
      
      // 添加助手回复
      addAssistantMessage(response);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [tripId, sessionId, loading, addUserMessage, addAssistantMessage, handleError]);

  /**
   * 确认修改
   */
  const confirmChanges = useCallback(async (changeIds?: string[]) => {
    if (!tripId || !sessionId || loading) return;
    
    const idsToConfirm = changeIds || pendingChanges.map(c => c.id);
    if (idsToConfirm.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await tripPlannerApi.confirm({
        tripId,
        sessionId,
        changeIds: idsToConfirm,
      });
      
      // 清除已确认的修改
      setPendingChanges(prev => 
        prev.filter(c => !idsToConfirm.includes(c.id))
      );
      
      // 添加确认消息
      const confirmMessage: PlannerMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: response.message || response.messageCN || '修改已确认并应用 ✅',
        timestamp: new Date(),
        tripUpdate: response.tripUpdate,
      };
      setMessages(prev => [...prev, confirmMessage]);
      
      // 通知行程更新
      if (response.tripUpdate && onTripUpdate) {
        onTripUpdate(response.tripUpdate);
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [tripId, sessionId, loading, pendingChanges, generateMessageId, onTripUpdate, handleError]);

  /**
   * 拒绝修改
   */
  const rejectChanges = useCallback(() => {
    setPendingChanges([]);
    
    // 添加拒绝消息
    const rejectMessage: PlannerMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: '好的，已取消这些修改。有其他需要帮助的吗？',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, rejectMessage]);
  }, [generateMessageId]);

  /**
   * 清空消息
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setPendingChanges([]);
    setIsInitialized(false);
    setError(null);
  }, []);

  // 记录上一次的 tripId，用于检测变化
  const prevTripIdRef = useRef<string | null>(null);

  // tripId 变化时重置（仅当 tripId 真正变化时）
  useEffect(() => {
    if (tripId && prevTripIdRef.current && prevTripIdRef.current !== tripId) {
      clearMessages();
    }
    prevTripIdRef.current = tripId;
  }, [tripId, clearMessages]);

  // 自动开始会话（使用 ref 防止 Strict Mode 重复调用）
  const hasStartedRef = useRef(false);
  useEffect(() => {
    // 防止重复启动：检查 ref 标记和 sessionId
    if (autoStart && tripId && !isInitialized && !initializingRef.current && !hasStartedRef.current && !sessionId) {
      hasStartedRef.current = true;
      startSession();
    }
  }, [autoStart, tripId, isInitialized, startSession, sessionId]);

  return {
    // 状态
    messages,
    sessionId,
    currentPhase,
    loading,
    error,
    pendingChanges,
    isInitialized,
    
    // 操作方法
    startSession,
    sendMessage,
    executeAction,
    confirmChanges,
    rejectChanges,
    clearMessages,
  };
}

export default useTripPlannerAssistant;
