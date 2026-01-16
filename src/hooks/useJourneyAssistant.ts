/**
 * 行程助手 Hook
 * 
 * 提供行程助手的完整功能，包括：
 * - 旅途中对话
 * - 行程状态跟踪
 * - 提醒管理
 * - 突发事件处理
 * - 行程调整
 * - 紧急求助
 * - 附近搜索
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  journeyAssistantApi,
  type JourneyPhase,
  type JourneyAssistantResponse,
  type JourneyState,
  type ScheduleItem,
  type Reminder,
  type TripEvent,
  type EmergencyOption,
  type AdjustmentResult,
  type SearchResults,
  type SuggestedAction,
  type Location,
  type NarrativeSection,
  type ExpertCitation,
  type DegradationInfo,
} from '@/api/assistant';
import { handleApiError } from '@/utils/errorHandler';

/**
 * 消息类型
 * V2.1: 新增 sections, citations, degradation 字段
 */
export interface JourneyMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  
  // 助手消息的额外数据
  journeyState?: JourneyState;
  reminders?: Reminder[];
  event?: TripEvent;
  options?: EmergencyOption[];
  adjustmentResult?: AdjustmentResult;
  searchResults?: SearchResults;
  suggestedActions?: SuggestedAction[];
  
  // V2.1 新增：结构化内容
  sections?: NarrativeSection[];
  citations?: ExpertCitation[];
  degradation?: DegradationInfo;
}

/**
 * Hook 配置
 */
export interface UseJourneyAssistantConfig {
  tripId: string;
  userId: string;
  autoFetchStatus?: boolean;
  autoFetchReminders?: boolean;
  pollInterval?: number; // 轮询间隔（毫秒）
}

/**
 * Hook 返回类型
 */
export interface UseJourneyAssistantReturn {
  // 状态
  messages: JourneyMessage[];
  journeyState: JourneyState | null;
  phase: JourneyPhase | null;
  reminders: Reminder[];
  loading: boolean;
  error: string | null;
  
  // 当前对话数据
  currentEvent: TripEvent | null;
  currentOptions: EmergencyOption[] | null;
  currentSearchResults: SearchResults | null;
  currentSuggestedActions: SuggestedAction[] | null;
  
  // 方法
  sendMessage: (message: string, location?: Location) => Promise<JourneyAssistantResponse | null>;
  fetchStatus: () => Promise<JourneyState | null>;
  fetchReminders: () => Promise<Reminder[]>;
  handleEvent: (eventId: string, selectedOptionId?: string) => Promise<JourneyAssistantResponse | null>;
  adjustSchedule: (itemId: string, options: {
    newTime?: string;
    cancel?: boolean;
    replace?: { type: string; details: Record<string, unknown> };
  }) => Promise<JourneyAssistantResponse | null>;
  emergency: (location?: Location) => Promise<JourneyAssistantResponse | null>;
  nearbySearch: (message: string, location?: Location) => Promise<JourneyAssistantResponse | null>;
  executeAction: (action: SuggestedAction) => Promise<void>;
  clearMessages: () => void;
}

/**
 * 行程助手 Hook
 */
export function useJourneyAssistant(config: UseJourneyAssistantConfig): UseJourneyAssistantReturn {
  const { 
    tripId, 
    userId, 
    autoFetchStatus = true, 
    autoFetchReminders = true,
    pollInterval = 60000, // 默认1分钟轮询
  } = config;
  
  // 消息列表
  const [messages, setMessages] = useState<JourneyMessage[]>([]);
  
  // 行程状态
  const [journeyState, setJourneyState] = useState<JourneyState | null>(null);
  const [phase, setPhase] = useState<JourneyPhase | null>(null);
  
  // 提醒列表
  const [reminders, setReminders] = useState<Reminder[]>([]);
  
  // 加载和错误状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 当前对话数据
  const [currentEvent, setCurrentEvent] = useState<TripEvent | null>(null);
  const [currentOptions, setCurrentOptions] = useState<EmergencyOption[] | null>(null);
  const [currentSearchResults, setCurrentSearchResults] = useState<SearchResults | null>(null);
  const [currentSuggestedActions, setCurrentSuggestedActions] = useState<SuggestedAction[] | null>(null);
  
  // 用于生成消息 ID
  const messageIdRef = useRef(0);
  const generateMessageId = () => `journey-msg-${Date.now()}-${++messageIdRef.current}`;
  
  /**
   * 处理助手响应
   * V2.1: 支持新的结构化字段
   */
  const handleAssistantResponse = useCallback((response: JourneyAssistantResponse) => {
    // 更新状态
    if (response.journeyState) {
      setJourneyState(response.journeyState);
      setPhase(response.journeyState.phase);
    }
    
    // 更新当前对话数据
    setCurrentEvent(response.event || null);
    setCurrentOptions(response.options || null);
    setCurrentSearchResults(response.searchResults || null);
    setCurrentSuggestedActions(response.suggestedActions || null);
    
    // 更新提醒（如果有）
    if (response.reminders) {
      setReminders(response.reminders);
    }
    
    // 创建助手消息
    const assistantMessage: JourneyMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: response.messageCN || response.message || '',
      timestamp: new Date(),
      journeyState: response.journeyState,
      reminders: response.reminders,
      event: response.event,
      options: response.options,
      adjustmentResult: response.adjustmentResult,
      searchResults: response.searchResults,
      suggestedActions: response.suggestedActions,
      // V2.1 新增字段
      sections: response.sections,
      citations: response.citations,
      degradation: response.degradation,
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    
    return response;
  }, []);
  
  /**
   * 获取行程状态
   */
  const fetchStatus = useCallback(async (): Promise<JourneyState | null> => {
    if (!tripId) return null;
    
    try {
      const response = await journeyAssistantApi.getTripStatus(tripId);
      if (response.journeyState) {
        setJourneyState(response.journeyState);
        setPhase(response.journeyState.phase);
      }
      return response.journeyState || null;
    } catch (err) {
      console.error('Failed to fetch journey status:', err);
      return null;
    }
  }, [tripId]);
  
  /**
   * 获取提醒列表
   */
  const fetchReminders = useCallback(async (): Promise<Reminder[]> => {
    if (!tripId) return [];
    
    try {
      const data = await journeyAssistantApi.getReminders(tripId);
      setReminders(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch reminders:', err);
      return [];
    }
  }, [tripId]);
  
  /**
   * 发送消息
   */
  const sendMessage = useCallback(async (
    message: string, 
    location?: Location
  ): Promise<JourneyAssistantResponse | null> => {
    if (!message.trim() || !tripId || !userId) return null;
    
    // 添加用户消息
    const userMessage: JourneyMessage = {
      id: generateMessageId(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await journeyAssistantApi.chat({
        tripId,
        userId,
        message,
        language: 'zh',
        context: location ? { currentLocation: location } : undefined,
      });
      
      return handleAssistantResponse(response);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      
      // 添加错误消息
      const errorAssistantMessage: JourneyMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: `抱歉，发生了错误：${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorAssistantMessage]);
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId, userId, handleAssistantResponse]);
  
  /**
   * 处理突发事件
   */
  const handleEvent = useCallback(async (
    eventId: string, 
    selectedOptionId?: string
  ): Promise<JourneyAssistantResponse | null> => {
    if (!tripId || !userId) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await journeyAssistantApi.handleEvent({
        tripId,
        userId,
        eventId,
        selectedOptionId,
        language: 'zh',
      });
      
      return handleAssistantResponse(response);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId, userId, handleAssistantResponse]);
  
  /**
   * 调整行程
   */
  const adjustSchedule = useCallback(async (
    itemId: string, 
    options: {
      newTime?: string;
      cancel?: boolean;
      replace?: { type: string; details: Record<string, unknown> };
    }
  ): Promise<JourneyAssistantResponse | null> => {
    if (!tripId || !userId) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await journeyAssistantApi.adjustSchedule({
        tripId,
        userId,
        adjustmentParams: {
          itemId,
          ...options,
        },
        language: 'zh',
      });
      
      return handleAssistantResponse(response);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId, userId, handleAssistantResponse]);
  
  /**
   * 紧急求助
   */
  const emergency = useCallback(async (
    location?: Location
  ): Promise<JourneyAssistantResponse | null> => {
    if (!tripId || !userId) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await journeyAssistantApi.emergency({
        tripId,
        userId,
        language: 'zh',
        context: location ? { currentLocation: location } : undefined,
      });
      
      return handleAssistantResponse(response);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId, userId, handleAssistantResponse]);
  
  /**
   * 附近搜索
   */
  const nearbySearch = useCallback(async (
    message: string,
    location?: Location
  ): Promise<JourneyAssistantResponse | null> => {
    if (!tripId || !userId || !message.trim()) return null;
    
    // 添加用户消息
    const userMessage: JourneyMessage = {
      id: generateMessageId(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await journeyAssistantApi.nearbySearch({
        tripId,
        userId,
        message,
        language: 'zh',
        context: location ? { currentLocation: location } : undefined,
      });
      
      return handleAssistantResponse(response);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId, userId, handleAssistantResponse]);
  
  /**
   * 执行建议操作
   */
  const executeAction = useCallback(async (action: SuggestedAction) => {
    // 根据 action.action 执行不同操作
    const actionType = action.action;
    
    if (actionType.startsWith('navigate_')) {
      // 导航操作
      await sendMessage(`导航到 ${action.labelCN || action.label}`);
    } else if (actionType === 'find_hospital') {
      await nearbySearch('找最近的医院');
    } else if (actionType === 'call_police') {
      // 这个应该触发打电话，由 UI 层处理
      console.log('Call police action');
    } else if (actionType === 'contact_embassy') {
      await sendMessage('联系大使馆');
    } else if (actionType === 'view_schedule') {
      await sendMessage('查看今日行程');
    } else {
      // 默认发送消息
      await sendMessage(action.labelCN || action.label);
    }
  }, [sendMessage, nearbySearch]);
  
  /**
   * 清空消息
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);
  
  // 自动获取状态
  useEffect(() => {
    if (autoFetchStatus && tripId) {
      fetchStatus();
    }
  }, [autoFetchStatus, tripId, fetchStatus]);
  
  // 自动获取提醒
  useEffect(() => {
    if (autoFetchReminders && tripId) {
      fetchReminders();
    }
  }, [autoFetchReminders, tripId, fetchReminders]);
  
  // 轮询状态更新
  useEffect(() => {
    if (!tripId || !pollInterval) return;
    
    const intervalId = setInterval(() => {
      fetchStatus();
      fetchReminders();
    }, pollInterval);
    
    return () => clearInterval(intervalId);
  }, [tripId, pollInterval, fetchStatus, fetchReminders]);
  
  return {
    // 状态
    messages,
    journeyState,
    phase,
    reminders,
    loading,
    error,
    
    // 当前对话数据
    currentEvent,
    currentOptions,
    currentSearchResults,
    currentSuggestedActions,
    
    // 方法
    sendMessage,
    fetchStatus,
    fetchReminders,
    handleEvent,
    adjustSchedule,
    emergency,
    nearbySearch,
    executeAction,
    clearMessages,
  };
}
