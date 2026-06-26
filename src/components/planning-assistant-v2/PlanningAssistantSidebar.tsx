/**
 * Planning Assistant V2 - 侧边栏适配组件
 * 
 * 用于规划工作台右侧边栏，适配 AgentChatSidebar 的布局要求
 * 
 * 支持两种场景：
 * 1. 创建新行程（无 tripId）
 * 2. 优化已创建行程（有 tripId）- 自动提取行程上下文信息并传递给对话接口
 * 
 * 功能：
 * - 自动提取行程上下文（countryCode、目的地、日期、预算等）
 * - 接收来自左侧行程项的提问（通过 PlanStudioContext）
 * - 自动生成关于行程项的问题并发送给 AI
 */

import { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { PlanningAssistant } from './PlanningAssistant';
import { tripsApi } from '@/api/trips';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import type { TripDetail } from '@/types/trip';
import type { SelectedContext } from '@/contexts/PlanStudioContext';
import PlanStudioContext from '@/contexts/PlanStudioContext';
import { DrawerContext } from '@/components/layout/DashboardLayout';

interface PlanningAssistantSidebarProps {
  userId?: string;
  tripId?: string | null;
  className?: string;
  onTripUpdate?: () => void;
  /** 通知父组件清空函数已准备好（供标题栏按钮调用） */
  onClearReady?: (clear: () => void) => void;
}

/**
 * Planning Assistant V2 侧边栏组件
 * 
 * 适配规划工作台右侧边栏的布局和交互
 * 
 * 功能：
 * - 当有 tripId 时，自动加载行程信息
 * - 提取行程上下文信息（countryCode、目的地、日期、预算等）
 * - 将上下文信息传递给 PlanningAssistant，最终传递给对话接口
 * - 后端 API 可以通过 tripId 自动获取完整的行程信息
 */
export function PlanningAssistantSidebar({
  userId,
  tripId,
  className,
  onTripUpdate: _onTripUpdate,
  onClearReady,
}: PlanningAssistantSidebarProps) {
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [tripInfo, setTripInfo] = useState<TripDetail | null>(null);
  const [_isLoadingTrip, setIsLoadingTrip] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // 用户偏好：用于住宿搜索语言映射（userCountryCode: CN→zh、JP→ja 等）
  const { preferences } = useUserPreferences();
  const userCountryCode = useMemo(
    () => preferences?.residencyCountry || preferences?.nationality || null,
    [preferences?.residencyCountry, preferences?.nationality]
  );
  
  // 🆕 规划工作台上下文（用于接收来自左侧的提问）
  // 注意：可能不在 PlanStudioProvider 上下文中，需要安全处理
  // 使用 useContext 直接访问，如果不在 Provider 中会返回 null
  const planStudioContext = useContext(PlanStudioContext);
  const drawerContext = useContext(DrawerContext);
  
  // 从 context 中提取需要的方法（如果 context 存在）
  const planStudioAssistant = planStudioContext ? {
    setOnAskAssistant: planStudioContext.setOnAskAssistant,
    setOnOpenAssistant: planStudioContext.setOnOpenAssistant,
  } : null;
  
  const drawer = drawerContext ? {
    setDrawerOpen: drawerContext.setDrawerOpen,
    setDrawerTab: drawerContext.setDrawerTab,
  } : null;
  
  // 🆕 保存 sendMessage 函数的引用
  const sendMessageRef = useRef<((message: string) => Promise<void>) | null>(null);

  // 从 tripId 加载行程信息并提取上下文
  useEffect(() => {
    if (!tripId) {
      setCountryCode(null);
      setTripInfo(null);
      return;
    }

    const loadTrip = async () => {
      setIsLoadingTrip(true);
      try {
        const trip = await tripsApi.getById(tripId);
        setTripInfo(trip);
        
        // destination 格式可能是 "IS" 或 "IS, Reykjavik"
        // 提取第一部分作为 countryCode
        const destinationParts = trip.destination?.split(',') || [];
        const code = destinationParts[0]?.trim().toUpperCase() || null;
        setCountryCode(code);

        console.log('[PlanningAssistantSidebar] 行程上下文已加载:', {
          tripId: trip.id,
          destination: trip.destination,
          countryCode: code,
          startDate: trip.startDate,
          endDate: trip.endDate,
          totalBudget: trip.totalBudget,
          status: trip.status,
        });
      } catch (error) {
        console.error('[PlanningAssistantSidebar] 加载行程失败:', error);
        setCountryCode(null);
        setTripInfo(null);
      } finally {
        setIsLoadingTrip(false);
      }
    };

    loadTrip();
  }, [tripId, refetchTrigger]);

  // 🆕 注册打开助手抽屉的回调
  useEffect(() => {
    if (!planStudioAssistant || !drawer) return;
    
    planStudioAssistant.setOnOpenAssistant(() => {
      // 注意：drawerTab 的类型是 'evidence' | 'risk' | 'decision'，但我们需要 'chat'
      // 这里可能需要调整，或者使用其他方式打开对话框
      drawer.setDrawerOpen(true);
      // drawer.setDrawerTab('chat'); // 暂时注释，因为类型不匹配
    });
  }, [planStudioAssistant, drawer]);

  // 🆕 注册接收来自左侧提问的回调
  useEffect(() => {
    if (!planStudioAssistant || !planStudioAssistant.setOnAskAssistant) return;
    
    planStudioAssistant.setOnAskAssistant((question: string, context: SelectedContext) => {
      console.log('[PlanningAssistantSidebar] 收到来自左侧的提问:', { question, context });
      
      // 构建包含行程项信息的完整问题
      let fullQuestion = question;
      
      // 如果问题中没有明确提到行程项信息，自动补充
      if (context.placeName && !question.includes(context.placeName)) {
        const placeInfo = [];
        if (context.placeName) placeInfo.push(`关于"${context.placeName}"`);
        if (context.itemType) placeInfo.push(`（${context.itemType}）`);
        if (context.itemTime?.start) {
          const startTime = new Date(context.itemTime.start).toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          });
          placeInfo.push(`时间：${startTime}`);
        }
        
        if (placeInfo.length > 0) {
          fullQuestion = `${placeInfo.join('，')}，${question}`;
        }
      }
      
      // 如果有前后行程项信息，也添加到问题中
      if (context.prevItem || context.nextItem) {
        const contextInfo = [];
        if (context.prevItem) {
          contextInfo.push(`前一个行程项是"${context.prevItem.name}"`);
        }
        if (context.nextItem) {
          contextInfo.push(`后一个行程项是"${context.nextItem.name}"`);
        }
        if (contextInfo.length > 0) {
          fullQuestion = `${fullQuestion}（${contextInfo.join('，')}）`;
        }
      }
      
      // 发送消息
      if (sendMessageRef.current) {
        sendMessageRef.current(fullQuestion);
      } else {
        console.warn('[PlanningAssistantSidebar] sendMessage 尚未准备好');
      }
    });
  }, [planStudioAssistant]);

  return (
    <div className={className || 'h-full'}>
      <PlanningAssistant
        userId={userId}
        tripId={tripId || undefined}
        countryCode={countryCode || undefined}
        userCountryCode={userCountryCode ?? undefined}
        tripInfo={tripInfo || undefined}
        onSendMessageReady={(sendMessage) => {
          sendMessageRef.current = sendMessage;
        }}
        onClearReady={onClearReady}
        onAddToTripSuccess={() => {
          setRefetchTrigger((t) => t + 1);
          window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
        }}
      />
    </div>
  );
}
