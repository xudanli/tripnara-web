import { useState, useEffect, useRef, useCallback, useMemo, useContext, createContext, type ReactNode } from 'react';
/**
 * 规划工作台上下文
 * 
 * 实现左侧行程数据与右侧 NARA 助手的深度融合：
 * - 上下文感知：助手知道用户当前查看的天数、选中的行程项
 * - 双向联动：左侧操作触发助手响应，助手建议可直接应用到行程
 * - 状态同步：行程变更实时通知助手
 */

import type { ItineraryAdjustDraftPreview } from '@/lib/itinerary-adjust-response';

export type { ItineraryAdjustDraftPreview };

export interface SelectedContext {
  /** 当前选中的天数 (1-based) */
  dayIndex: number | null;
  /** 当前选中的日期 */
  date: string | null;
  /** 当前选中的行程项 ID */
  itemId: string | null;
  /** 当前选中的地点名称 */
  placeName: string | null;
  /** 当前选中的行程项类型 */
  itemType: string | null;
  
  // ========== 扩展上下文 (P1) ==========
  /** 当前行程项的时间 */
  itemTime?: { start: string; end: string };
  /** 前一个行程项 */
  prevItem?: { name: string; endTime: string };
  /** 后一个行程项 */
  nextItem?: { name: string; startTime: string };
  /** 当天统计 */
  dayStats?: {
    totalItems: number;
    hasMeal: boolean;
    hasTransit: boolean;
  };
}

export interface PendingSuggestion {
  /** 建议 ID */
  id: string;
  /** 建议类型 */
  type: 'add_place' | 'modify_time' | 'add_meal' | 'optimize_route';
  /** 建议的地点信息（如果是添加地点） */
  place?: {
    name: string;
    nameCN: string;
    category: string;
    address?: string;
    rating?: number;
    /** 地点经纬度（用于距离计算） */
    location?: {
      lat: number;
      lng: number;
    };
  };
  /** 目标天数 */
  targetDay: number;
  /** 建议的时间 */
  suggestedTime?: string;
  /** 描述 */
  description: string;
}

export interface UserAction {
  /** 操作类型 */
  type: 'view_day' | 'select_item' | 'add_item' | 'delete_item' | 'modify_item' | 'ask_about_item';
  /** 相关天数 */
  dayIndex?: number;
  /** 相关行程项 */
  itemId?: string;
  /** 地点名称 */
  placeName?: string;
  /** 额外数据 */
  payload?: any;
  /** 时间戳 */
  timestamp: Date;
}

/** 选中行程项时的扩展上下文 */
export interface SelectItemExtendedContext {
  itemTime?: { start: string; end: string };
  prevItem?: { name: string; endTime: string; type?: string };
  nextItem?: { name: string; startTime: string; type?: string };
  dayStats?: {
    totalItems: number;
    hasMeal: boolean;
    hasTransit: boolean;
  };
}

interface PlanStudioContextValue {
  // ========== 上下文状态 ==========
  /** 当前选中的上下文 */
  selectedContext: SelectedContext;
  /** 待处理的建议列表 */
  pendingSuggestions: PendingSuggestion[];
  /** 最近的用户操作 */
  recentAction: UserAction | null;
  /** 是否有未保存的时间轴改动 */
  hasUnsavedScheduleChanges: boolean;
  /** 设置是否有未保存的时间轴改动 */
  setHasUnsavedScheduleChanges: (hasChanges: boolean) => void;
  /** 改排草案预览（待确认）；勿为此单独 GET Trip 拼总结 */
  itineraryAdjustDraftPreview: ItineraryAdjustDraftPreview | null;
  setItineraryAdjustDraftPreview: (preview: ItineraryAdjustDraftPreview | null) => void;
  clearItineraryAdjustDraftPreview: () => void;
  
  // ========== 左侧 → 右侧 (行程 → 助手) ==========
  /** 选中某一天 */
  selectDay: (dayIndex: number, date: string, dayStats?: SelectedContext['dayStats']) => void;
  /** 选中某个行程项（支持扩展上下文） */
  selectItem: (itemId: string, placeName: string, itemType: string, extendedContext?: SelectItemExtendedContext) => void;
  /** 清除选中 */
  clearSelection: () => void;
  /** 记录用户操作 */
  recordAction: (action: Omit<UserAction, 'timestamp'>) => void;
  /** 请求助手帮助（关于当前选中项，可传入 context 覆盖） */
  askAssistantAbout: (question: string, contextOverride?: SelectedContext) => void;
  
  // ========== 右侧 → 左侧 (助手 → 行程) ==========
  /** 添加待处理建议 */
  addSuggestion: (suggestion: Omit<PendingSuggestion, 'id'>) => void;
  /** 应用建议到行程 */
  applySuggestion: (suggestionId: string) => void;
  /** 忽略建议 */
  dismissSuggestion: (suggestionId: string) => void;
  /** 清空所有建议 */
  clearSuggestions: () => void;
  
  // ========== 回调注册 ==========
  /** 注册助手问题处理器 */
  onAskAssistant: ((question: string, context: SelectedContext) => void) | null;
  setOnAskAssistant: (handler: (question: string, context: SelectedContext) => void) => void;
  /** 注册建议应用处理器 */
  onApplySuggestion: ((suggestion: PendingSuggestion) => Promise<boolean>) | null;
  setOnApplySuggestion: (handler: (suggestion: PendingSuggestion) => Promise<boolean>) => void;
  /** 注册打开助手抽屉处理器 */
  onOpenAssistant: (() => void) | null;
  setOnOpenAssistant: (handler: () => void) => void;

  // ========== Plan Gate 抽屉（原决策评估 Tab） ==========
  /** 方案预览与提交抽屉是否打开 */
  planGateOpen: boolean;
  /** 打开方案抽屉；autoGenerate 为 true 时挂载后自动 execute(generate) */
  openPlanGate: (options?: { autoGenerate?: boolean }) => void;
  closePlanGate: () => void;
  /** 抽屉会话序号，用于 remount PlanningWorkbenchTab */
  planGateSession: number;
  /** 本次打开是否自动触发生成 */
  planGateAutoGenerate: boolean;
  /** 方案提交到行程后刷新时间轴等 */
  notifyPlanCommitted: () => void;
  setOnPlanCommitted: (handler: (() => void) | null) => void;
}

// ==================== Context 创建 ====================

const PlanStudioContext = createContext<PlanStudioContextValue | null>(null);

// ==================== Provider 组件 ====================

export function PlanStudioProvider({ children }: { children: ReactNode }) {
  // 选中上下文
  const [selectedContext, setSelectedContext] = useState<SelectedContext>({
    dayIndex: null,
    date: null,
    itemId: null,
    placeName: null,
    itemType: null,
  });
  
  // 使用 ref 存储最新的 selectedContext，避免 askAssistantAbout 依赖导致循环
  const selectedContextRef = useRef<SelectedContext>(selectedContext);
  useEffect(() => {
    selectedContextRef.current = selectedContext;
  }, [selectedContext]);
  
  // 待处理建议
  const [pendingSuggestions, setPendingSuggestions] = useState<PendingSuggestion[]>([]);
  
  // 最近操作
  const [recentAction, setRecentAction] = useState<UserAction | null>(null);
  
  // 🆕 未保存的时间轴改动状态
  const [hasUnsavedScheduleChanges, setHasUnsavedScheduleChanges] = useState(false);

  const [itineraryAdjustDraftPreview, setItineraryAdjustDraftPreviewState] =
    useState<ItineraryAdjustDraftPreview | null>(null);

  const setItineraryAdjustDraftPreview = useCallback(
    (preview: ItineraryAdjustDraftPreview | null) => {
      setItineraryAdjustDraftPreviewState(preview);
    },
    []
  );

  const clearItineraryAdjustDraftPreview = useCallback(() => {
    setItineraryAdjustDraftPreviewState(null);
  }, []);
  
  // 回调处理器
  const [onAskAssistant, setOnAskAssistantState] = useState<((question: string, context: SelectedContext) => void) | null>(null);
  const [onApplySuggestion, setOnApplySuggestionState] = useState<((suggestion: PendingSuggestion) => Promise<boolean>) | null>(null);
  const [onOpenAssistant, setOnOpenAssistantState] = useState<(() => void) | null>(null);

  const [planGateOpen, setPlanGateOpen] = useState(false);
  const [planGateSession, setPlanGateSession] = useState(0);
  const [planGateAutoGenerate, setPlanGateAutoGenerate] = useState(false);
  const onPlanCommittedRef = useRef<(() => void) | null>(null);
  
  // 使用 ref 存储回调处理器，避免依赖导致循环
  const onAskAssistantRef = useRef<((question: string, context: SelectedContext) => void) | null>(null);
  const onOpenAssistantRef = useRef<(() => void) | null>(null);
  
  useEffect(() => {
    onAskAssistantRef.current = onAskAssistant;
  }, [onAskAssistant]);
  
  useEffect(() => {
    onOpenAssistantRef.current = onOpenAssistant;
  }, [onOpenAssistant]);

  // ========== 左侧 → 右侧 ==========
  
  const selectDay = useCallback((dayIndex: number, date: string, dayStats?: SelectedContext['dayStats']) => {
    setSelectedContext(prev => ({
      ...prev,
      dayIndex,
      date,
      itemId: null,
      placeName: null,
      itemType: null,
      // 清除行程项相关的扩展上下文
      itemTime: undefined,
      prevItem: undefined,
      nextItem: undefined,
      // 保存当天统计
      dayStats,
    }));
    setRecentAction({
      type: 'view_day',
      dayIndex,
      timestamp: new Date(),
    });
  }, []);

  const selectItem = useCallback((
    itemId: string, 
    placeName: string, 
    itemType: string,
    extendedContext?: SelectItemExtendedContext
  ) => {
    setSelectedContext(prev => ({
      ...prev,
      itemId,
      placeName,
      itemType,
      // 🆕 保存扩展上下文
      itemTime: extendedContext?.itemTime,
      prevItem: extendedContext?.prevItem,
      nextItem: extendedContext?.nextItem,
      dayStats: extendedContext?.dayStats || prev.dayStats,
    }));
    setRecentAction({
      type: 'select_item',
      itemId,
      placeName,
      timestamp: new Date(),
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedContext({
      dayIndex: null,
      date: null,
      itemId: null,
      placeName: null,
      itemType: null,
    });
  }, []);

  const recordAction = useCallback((action: Omit<UserAction, 'timestamp'>) => {
    setRecentAction({
      ...action,
      timestamp: new Date(),
    });
  }, []);

  const askAssistantAbout = useCallback((question: string, contextOverride?: SelectedContext) => {
    // 先打开助手抽屉
    if (onOpenAssistantRef.current) {
      onOpenAssistantRef.current();
    }
    // 然后发送问题（优先使用传入的 context，解决异步状态更新问题）
    if (onAskAssistantRef.current) {
      onAskAssistantRef.current(question, contextOverride || selectedContextRef.current);
    }
  }, []); // 移除所有依赖，使用 ref 访问最新值

  // ========== 右侧 → 左侧 ==========

  const addSuggestion = useCallback((suggestion: Omit<PendingSuggestion, 'id'>) => {
    const id = `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setPendingSuggestions(prev => [...prev, { ...suggestion, id }]);
  }, []);

  const applySuggestion = useCallback(async (suggestionId: string) => {
    const suggestion = pendingSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    if (onApplySuggestion) {
      const success = await onApplySuggestion(suggestion);
      if (success) {
        setPendingSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      }
    }
  }, [pendingSuggestions, onApplySuggestion]);

  const dismissSuggestion = useCallback((suggestionId: string) => {
    setPendingSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);

  const clearSuggestions = useCallback(() => {
    setPendingSuggestions([]);
  }, []);

  // ========== 回调设置 ==========

  const setOnAskAssistant = useCallback((handler: (question: string, context: SelectedContext) => void) => {
    setOnAskAssistantState(() => handler);
  }, []);

  const setOnApplySuggestion = useCallback((handler: (suggestion: PendingSuggestion) => Promise<boolean>) => {
    setOnApplySuggestionState(() => handler);
  }, []);

  const setOnOpenAssistant = useCallback((handler: () => void) => {
    setOnOpenAssistantState(() => handler);
  }, []);

  const openPlanGate = useCallback((options?: { autoGenerate?: boolean }) => {
    setPlanGateAutoGenerate(options?.autoGenerate === true);
    setPlanGateSession((n) => n + 1);
    setPlanGateOpen(true);
  }, []);

  const closePlanGate = useCallback(() => {
    setPlanGateOpen(false);
    setPlanGateAutoGenerate(false);
  }, []);

  const notifyPlanCommitted = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
    }
    onPlanCommittedRef.current?.();
  }, []);

  const setOnPlanCommitted = useCallback((handler: (() => void) | null) => {
    onPlanCommittedRef.current = handler;
  }, []);

  // ========== Context Value ==========

  const value = useMemo<PlanStudioContextValue>(() => ({
    selectedContext,
    pendingSuggestions,
    recentAction,
    hasUnsavedScheduleChanges,
    setHasUnsavedScheduleChanges,
    itineraryAdjustDraftPreview,
    setItineraryAdjustDraftPreview,
    clearItineraryAdjustDraftPreview,
    selectDay,
    selectItem,
    clearSelection,
    recordAction,
    askAssistantAbout,
    addSuggestion,
    applySuggestion,
    dismissSuggestion,
    clearSuggestions,
    onAskAssistant,
    setOnAskAssistant,
    onApplySuggestion,
    setOnApplySuggestion,
    onOpenAssistant,
    setOnOpenAssistant,
    planGateOpen,
    openPlanGate,
    closePlanGate,
    planGateSession,
    planGateAutoGenerate,
    notifyPlanCommitted,
    setOnPlanCommitted,
  }), [
    selectedContext,
    pendingSuggestions,
    recentAction,
    hasUnsavedScheduleChanges,
    itineraryAdjustDraftPreview,
    setItineraryAdjustDraftPreview,
    clearItineraryAdjustDraftPreview,
    selectDay,
    selectItem,
    clearSelection,
    recordAction,
    askAssistantAbout,
    addSuggestion,
    applySuggestion,
    dismissSuggestion,
    clearSuggestions,
    onAskAssistant,
    setOnAskAssistant,
    onApplySuggestion,
    setOnApplySuggestion,
    onOpenAssistant,
    setOnOpenAssistant,
    planGateOpen,
    openPlanGate,
    closePlanGate,
    planGateSession,
    planGateAutoGenerate,
    notifyPlanCommitted,
    setOnPlanCommitted,
  ]);

  return (
    <PlanStudioContext.Provider value={value}>
      {children}
    </PlanStudioContext.Provider>
  );
}

// ==================== Hook ====================

export function usePlanStudio() {
  const context = useContext(PlanStudioContext);
  if (!context) {
    throw new Error('usePlanStudio must be used within a PlanStudioProvider');
  }
  return context;
}

// ==================== 便捷 Hooks ====================

/**
 * 获取当前上下文状态（只读）
 */
export function usePlanStudioContext() {
  const { selectedContext, recentAction } = usePlanStudio();
  return { selectedContext, recentAction };
}

/**
 * 左侧行程组件使用：通知助手
 */
export function usePlanStudioActions() {
  const { selectDay, selectItem, clearSelection, recordAction, askAssistantAbout } = usePlanStudio();
  return { selectDay, selectItem, clearSelection, recordAction, askAssistantAbout };
}

/**
 * 右侧助手组件使用：接收上下文、发送建议
 */
export function usePlanStudioAssistant() {
  const { 
    selectedContext, 
    pendingSuggestions,
    recentAction,
    addSuggestion, 
    applySuggestion, 
    dismissSuggestion,
    setOnAskAssistant,
    setOnApplySuggestion,
  } = usePlanStudio();
  
  return { 
    selectedContext, 
    pendingSuggestions,
    recentAction,
    addSuggestion, 
    applySuggestion, 
    dismissSuggestion,
    setOnAskAssistant,
    setOnApplySuggestion,
  };
}

export default PlanStudioContext;
