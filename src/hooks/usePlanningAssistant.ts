/**
 * 规划助手 Hook
 * 
 * 提供规划助手的完整对话功能，包括：
 * - 会话管理
 * - 发送/接收消息
 * - 对话阶段跟踪
 * - 引导问题/推荐/方案候选的处理
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  planningAssistantApi,
  type PlanningPhase,
  type PlanningChatResponse,
  type GuidingQuestion,
  type DestinationRecommendation,
  type PlanCandidate,
  type PlanComparison,
  type SuggestedAction,
  type UserPreferenceSummaryResponse,
  type NarrativeSection,
  type ExpertCitation,
  type DegradationInfo,
} from '@/api/assistant';
import { handleApiError } from '@/utils/errorHandler';

/**
 * 消息类型
 * V2.1: 新增 sections, citations, degradation 字段
 */
export interface PlanningMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  
  // 助手消息的额外数据
  phase?: PlanningPhase;
  guidingQuestions?: GuidingQuestion[];
  recommendations?: DestinationRecommendation[];
  planCandidates?: PlanCandidate[];
  comparison?: PlanComparison;
  confirmedTripId?: string;
  suggestedActions?: SuggestedAction[];
  
  // V2.1 新增：结构化内容
  sections?: NarrativeSection[];
  citations?: ExpertCitation[];
  degradation?: DegradationInfo;
}

/**
 * Hook 返回类型
 */
export interface UsePlanningAssistantReturn {
  // 状态
  sessionId: string | null;
  messages: PlanningMessage[];
  phase: PlanningPhase;
  loading: boolean;
  error: string | null;
  
  // 当前对话数据（最新响应）
  currentGuidingQuestions: GuidingQuestion[] | null;
  currentRecommendations: DestinationRecommendation[] | null;
  currentPlanCandidates: PlanCandidate[] | null;
  currentComparison: PlanComparison | null;
  confirmedTripId: string | null;
  currentSuggestedActions: SuggestedAction[] | null;
  
  // 用户偏好 (P1 新功能)
  userPreferences: UserPreferenceSummaryResponse | null;
  preferencesLoading: boolean;
  
  // 方法
  createSession: (userId?: string) => Promise<string>;
  sendMessage: (message: string) => Promise<PlanningChatResponse | null>;
  selectOption: (option: string) => Promise<PlanningChatResponse | null>;
  selectRecommendation: (recommendationId: string) => Promise<PlanningChatResponse | null>;
  selectPlan: (planId: string) => Promise<PlanningChatResponse | null>;
  confirmPlan: () => Promise<PlanningChatResponse | null>;
  reset: () => void;
  
  // 用户偏好方法 (P1 新功能)
  fetchUserPreferences: () => Promise<UserPreferenceSummaryResponse | null>;
  clearUserPreferences: () => Promise<boolean>;
}

const STORAGE_KEY = 'planning-assistant-session';

/**
 * 规划助手 Hook
 */
export function usePlanningAssistant(userId?: string): UsePlanningAssistantReturn {
  // 会话状态
  const [sessionId, setSessionId] = useState<string | null>(() => {
    // 从 localStorage 恢复会话
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.sessionId || null;
      } catch {
        return null;
      }
    }
    return null;
  });
  
  // 消息列表
  const [messages, setMessages] = useState<PlanningMessage[]>([]);
  
  // 当前阶段
  const [phase, setPhase] = useState<PlanningPhase>('INITIAL');
  
  // 加载和错误状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 当前对话数据
  const [currentGuidingQuestions, setCurrentGuidingQuestions] = useState<GuidingQuestion[] | null>(null);
  const [currentRecommendations, setCurrentRecommendations] = useState<DestinationRecommendation[] | null>(null);
  const [currentPlanCandidates, setCurrentPlanCandidates] = useState<PlanCandidate[] | null>(null);
  const [currentComparison, setCurrentComparison] = useState<PlanComparison | null>(null);
  const [confirmedTripId, setConfirmedTripId] = useState<string | null>(null);
  const [currentSuggestedActions, setCurrentSuggestedActions] = useState<SuggestedAction[] | null>(null);
  
  // 用户偏好状态 (P1 新功能)
  const [userPreferences, setUserPreferences] = useState<UserPreferenceSummaryResponse | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  
  // 用于生成消息 ID
  const messageIdRef = useRef(0);
  const generateMessageId = () => `msg-${Date.now()}-${++messageIdRef.current}`;
  
  // 持久化会话
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId }));
    }
  }, [sessionId]);
  
  /**
   * 创建新会话
   */
  const createSession = useCallback(async (userIdOverride?: string): Promise<string> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await planningAssistantApi.createSession({
        userId: userIdOverride || userId,
      });
      
      setSessionId(response.sessionId);
      setMessages([]);
      setPhase('INITIAL');
      setCurrentGuidingQuestions(null);
      setCurrentRecommendations(null);
      setCurrentPlanCandidates(null);
      setCurrentComparison(null);
      setConfirmedTripId(null);
      setCurrentSuggestedActions(null);
      
      return response.sessionId;
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  /**
   * 处理助手响应
   * V2.1: 支持新的结构化字段
   */
  const handleAssistantResponse = useCallback((response: PlanningChatResponse) => {
    // 更新阶段
    setPhase(response.phase);
    
    // 更新当前对话数据
    setCurrentGuidingQuestions(response.guidingQuestions || null);
    setCurrentRecommendations(response.recommendations || null);
    setCurrentPlanCandidates(response.planCandidates || null);
    setCurrentComparison(response.comparison || null);
    setConfirmedTripId(response.confirmedTripId || null);
    setCurrentSuggestedActions(response.suggestedActions || null);
    
    // 创建助手消息
    const assistantMessage: PlanningMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: response.messageCN || response.message,
      timestamp: new Date(),
      phase: response.phase,
      guidingQuestions: response.guidingQuestions,
      recommendations: response.recommendations,
      planCandidates: response.planCandidates,
      comparison: response.comparison,
      confirmedTripId: response.confirmedTripId,
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
   * 发送消息
   */
  const sendMessage = useCallback(async (message: string): Promise<PlanningChatResponse | null> => {
    if (!message.trim()) return null;
    
    // 确保有会话
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      try {
        currentSessionId = await createSession();
      } catch {
        return null;
      }
    }
    
    // 添加用户消息
    const userMessage: PlanningMessage = {
      id: generateMessageId(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await planningAssistantApi.chat({
        sessionId: currentSessionId,
        message,
        userId,
        language: 'zh',
      });
      
      return handleAssistantResponse(response);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      
      // 添加错误消息
      const errorAssistantMessage: PlanningMessage = {
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
  }, [sessionId, userId, createSession, handleAssistantResponse]);
  
  /**
   * 选择引导问题的选项
   */
  const selectOption = useCallback(async (option: string): Promise<PlanningChatResponse | null> => {
    return sendMessage(option);
  }, [sendMessage]);
  
  /**
   * 选择目的地推荐
   */
  const selectRecommendation = useCallback(async (recommendationId: string): Promise<PlanningChatResponse | null> => {
    const recommendation = currentRecommendations?.find(r => r.id === recommendationId);
    if (recommendation) {
      return sendMessage(`我想去${recommendation.nameCN || recommendation.name}`);
    }
    return null;
  }, [currentRecommendations, sendMessage]);
  
  /**
   * 选择方案
   */
  const selectPlan = useCallback(async (planId: string): Promise<PlanningChatResponse | null> => {
    const plan = currentPlanCandidates?.find(p => p.id === planId);
    if (plan) {
      return sendMessage(`我选择${plan.nameCN || plan.name}方案`);
    }
    return null;
  }, [currentPlanCandidates, sendMessage]);
  
  /**
   * 确认方案
   */
  const confirmPlan = useCallback(async (): Promise<PlanningChatResponse | null> => {
    return sendMessage('确认这个方案');
  }, [sendMessage]);
  
  /**
   * 重置会话
   */
  const reset = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setPhase('INITIAL');
    setCurrentGuidingQuestions(null);
    setCurrentRecommendations(null);
    setCurrentPlanCandidates(null);
    setCurrentComparison(null);
    setConfirmedTripId(null);
    setCurrentSuggestedActions(null);
    setUserPreferences(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);
  
  /**
   * 获取用户偏好 (P1 新功能)
   */
  const fetchUserPreferences = useCallback(async (): Promise<UserPreferenceSummaryResponse | null> => {
    if (!userId) return null;
    
    setPreferencesLoading(true);
    try {
      const preferences = await planningAssistantApi.getUserPreferences(userId);
      setUserPreferences(preferences);
      return preferences;
    } catch (err) {
      console.error('Failed to fetch user preferences:', err);
      return null;
    } finally {
      setPreferencesLoading(false);
    }
  }, [userId]);
  
  /**
   * 清除用户偏好 (P1 新功能)
   */
  const clearUserPreferences = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    
    setPreferencesLoading(true);
    try {
      const result = await planningAssistantApi.clearUserPreferences(userId);
      if (result.success) {
        setUserPreferences(null);
      }
      return result.success;
    } catch (err) {
      console.error('Failed to clear user preferences:', err);
      return false;
    } finally {
      setPreferencesLoading(false);
    }
  }, [userId]);
  
  return {
    // 状态
    sessionId,
    messages,
    phase,
    loading,
    error,
    
    // 当前对话数据
    currentGuidingQuestions,
    currentRecommendations,
    currentPlanCandidates,
    currentComparison,
    confirmedTripId,
    currentSuggestedActions,
    
    // 用户偏好 (P1 新功能)
    userPreferences,
    preferencesLoading,
    
    // 方法
    createSession,
    sendMessage,
    selectOption,
    selectRecommendation,
    selectPlan,
    confirmPlan,
    reset,
    
    // 用户偏好方法 (P1 新功能)
    fetchUserPreferences,
    clearUserPreferences,
  };
}
