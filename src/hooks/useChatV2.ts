/**
 * Planning Assistant V2 - 对话 Hook
 * 
 * 提供发送消息、接收回复、管理对话历史的功能
 */

import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  chatApi,
  type ChatRequest,
  type ChatResponse,
} from '@/api/planning-assistant-v2';

import type { RoutingTarget } from '@/api/planning-assistant-v2';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  phase?: string;
  routing?: {
    target: RoutingTarget;
    reason: string;
    reasonCN?: string;
    params?: Record<string, any>;
  };
  // 推荐和方案数据
  recommendations?: any[]; // 推荐数据（如果有）
  plans?: any[]; // 方案数据（如果有）
  // MCP 服务响应数据
  hotels?: any[]; // 酒店列表
  airbnbListings?: any[]; // Airbnb 房源列表
  restaurants?: any[]; // 餐厅列表
  weather?: any; // 天气信息
  searchResults?: any[]; // 搜索结果
  flights?: any[]; // 航班列表
  railRoutes?: any[]; // 铁路路线列表
  translation?: any; // 翻译结果
  currencyConversion?: any; // 货币转换结果
  images?: any[]; // 图片列表
  // 其他字段
  actions?: Array<{
    type: string;
    data: any;
  }>;
  suggestions?: string[];
}

export interface UseChatV2Return {
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | null;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
}

/**
 * Planning Assistant V2 对话 Hook
 */
export function useChatV2(
  sessionId: string | null,
  userId?: string
): UseChatV2Return {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messageIdCounter = useState(0)[1];

  const generateMessageId = useCallback(() => {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const sendMessageMutation = useMutation({
    mutationFn: (data: ChatRequest) => chatApi.sendMessage(data),
    onMutate: async (variables) => {
      // 乐观更新：立即显示用户消息
      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'user',
        content: variables.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
    },
    onSuccess: (data) => {
      // 添加AI回复
      // 优先使用 reply（根据用户输入语言自动选择），如果没有则使用 replyCN 或 messageCN
      const replyContent = data.reply || data.replyCN || data.messageCN || data.message || '收到回复，但内容为空';
      const aiMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: replyContent,
        timestamp: new Date(),
        phase: data.phase,
        routing: data.routing,
        // 推荐和方案数据
        recommendations: data.recommendations,
        plans: data.plans,
        // MCP 服务响应数据
        hotels: data.hotels,
        airbnbListings: data.airbnbListings,
        restaurants: data.restaurants,
        weather: data.weather,
        searchResults: data.searchResults,
        flights: data.flights,
        railRoutes: data.railRoutes,
        translation: data.translation,
        currencyConversion: data.currencyConversion,
        images: data.images,
        // 其他字段
        actions: data.actions,
        suggestions: data.suggestions,
      };
      setMessages((prev) => [...prev, aiMessage]);
      
      // 调试日志
      console.log('[useChatV2] AI回复:', {
        reply: data.reply,
        replyCN: data.replyCN,
        message: data.message,
        messageCN: data.messageCN,
        finalContent: replyContent,
        phase: data.phase,
        routing: data.routing,
        recommendationsCount: data.recommendations?.length || 0,
        plansCount: data.plans?.length || 0,
        hotelsCount: data.hotels?.length || 0,
        airbnbListingsCount: data.airbnbListings?.length || 0,
        restaurantsCount: data.restaurants?.length || 0,
        searchResultsCount: data.searchResults?.length || 0,
        flightsCount: data.flights?.length || 0,
        imagesCount: data.images?.length || 0,
        hasWeather: !!data.weather,
        hasTranslation: !!data.translation,
        hasCurrencyConversion: !!data.currencyConversion,
        fullData: data,
      });

      // 更新会话状态
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['planning-session-v2', sessionId] });
      }
    },
    onError: (error) => {
      console.error('发送消息失败:', error);
      // 可以在这里添加错误消息到对话列表
    },
  });

  const sendMessage = useCallback(
    async (message: string) => {
      if (!sessionId || !message.trim()) return;

      await sendMessageMutation.mutateAsync({
        sessionId,
        message: message.trim(),
        userId,
        language: 'zh',
      });
    },
    [sessionId, userId, sendMessageMutation]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // 当 sessionId 变化时，清空消息
  useEffect(() => {
    if (sessionId) {
      setMessages([]);
    }
  }, [sessionId]);

  return {
    messages,
    isLoading: sendMessageMutation.isPending,
    error: (sendMessageMutation.error as Error) || null,
    sendMessage,
    clearMessages,
  };
}
