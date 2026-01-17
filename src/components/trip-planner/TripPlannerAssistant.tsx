/**
 * 行程规划智能助手组件
 * 
 * 规划工作台右侧的 AI 助手聊天界面
 * 支持：
 * - 自然语言对话
 * - 富文本内容展示（时间线、对比表、清单）
 * - 快捷操作按钮
 * - 修改确认/拒绝
 */

import { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect, forwardRef, useImperativeHandle } from 'react';
import { 
  useTripPlannerAssistant, 
  type PlannerMessage,
} from '@/hooks/useTripPlannerAssistant';
import type { 
  QuickAction, 
  RichContent,
  ComparisonRichContent,
  ChecklistRichContent,
  POIRichContent,
  PendingChange,
  FollowUp,
  // 三人格守护者系统
  GuardianPersona,
  // 意图消歧系统
  GapHighlightRichContent,
  GapSeverity,
  PlannerResponseMeta,
  DetectedGap,
} from '@/api/trip-planner';
import { IntentUncertainty } from '@/api/trip-planner';
import { GuardianPanel, DisclaimerBanner } from './guardian';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Send,
  Sparkles,
  User,
  MapPin,
  Check,
  X,
  Star,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageCircle,
  List,
  ListChecks,
  BarChart3,
  ChevronRight,
  Lightbulb,
  Info,
  Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { usePlanStudioAssistant, type SelectedContext, type PendingSuggestion } from '@/contexts/PlanStudioContext';
import { tripsApi } from '@/api/trips';

/**
 * 安全使用 PlanStudio 上下文
 * 当组件在 Provider 外部使用时返回默认值
 */
function usePlanStudioSafe() {
  try {
    return usePlanStudioAssistant();
  } catch {
    // 在 Provider 外部使用时返回默认值
    return {
      selectedContext: {
        dayIndex: null,
        date: null,
        itemId: null,
        placeName: null,
        itemType: null,
      } as SelectedContext,
      pendingSuggestions: [] as PendingSuggestion[],
      recentAction: null,
      addSuggestion: (_suggestion: Omit<PendingSuggestion, 'id'>) => {},
      applySuggestion: (_id: string) => {},
      dismissSuggestion: (_id: string) => {},
      setOnAskAssistant: (_handler: (question: string, context: SelectedContext) => void) => {},
      setOnApplySuggestion: (_handler: (suggestion: PendingSuggestion) => Promise<boolean>) => {},
    };
  }
}

// ==================== Props 定义 ====================

interface TripPlannerAssistantProps {
  tripId: string;
  className?: string;
  onTripUpdate?: () => void; // 当行程被修改后的回调
  compact?: boolean; // 紧凑模式
}

// 暴露给父组件的方法
export interface TripPlannerAssistantRef {
  refresh: () => void;
  isLoading: boolean;
}

// ==================== 子组件 ====================

/**
 * 打字机效果 Hook
 */
function useTypewriter(text: string, enabled: boolean, speed: number = 25) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    setDisplayedText('');
    setIsTyping(true);

    let currentIndex = 0;
    const intervalId = setInterval(() => {
      if (currentIndex < text.length) {
        const charsToAdd = Math.min(
          Math.floor(Math.random() * 2) + 1,
          text.length - currentIndex
        );
        setDisplayedText(text.slice(0, currentIndex + charsToAdd));
        currentIndex += charsToAdd;
      } else {
        setIsTyping(false);
        clearInterval(intervalId);
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, enabled, speed]);

  return { displayedText, isTyping };
}

// ==================== 虚拟滚动相关 ====================

/**
 * 消息项高度缓存
 */
interface HeightCache {
  [key: string]: number;
}

/**
 * 虚拟列表配置
 */
interface VirtualConfig {
  estimatedItemHeight: number; // 预估单条消息高度
  overscan: number; // 上下缓冲区条数
  threshold: number; // 启用虚拟滚动的消息数量阈值
}

const DEFAULT_VIRTUAL_CONFIG: VirtualConfig = {
  estimatedItemHeight: 120, // 预估消息高度（含富文本可能更高）
  overscan: 3, // 上下各缓冲 3 条
  threshold: 20, // 超过 20 条消息启用虚拟滚动
};

/**
 * 虚拟滚动 Hook
 * 
 * 只在消息数量超过阈值时启用，避免小数据量时的额外开销
 */
function useVirtualMessages<T extends { id: string }>(
  items: T[],
  containerRef: React.RefObject<HTMLElement | null>,
  config: Partial<VirtualConfig> = {}
) {
  const { estimatedItemHeight, overscan, threshold } = {
    ...DEFAULT_VIRTUAL_CONFIG,
    ...config,
  };

  // 高度缓存
  const heightCacheRef = useRef<HeightCache>({});
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // 是否启用虚拟滚动
  const isVirtualEnabled = items.length > threshold;

  // 监听滚动事件
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isVirtualEnabled) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef, isVirtualEnabled]);

  // 监听容器大小变化
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };
    
    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [containerRef]);

  // 获取单项高度（使用缓存或预估值）
  const getItemHeight = useCallback((id: string): number => {
    return heightCacheRef.current[id] || estimatedItemHeight;
  }, [estimatedItemHeight]);

  // 更新高度缓存
  const measureHeight = useCallback((id: string, height: number) => {
    if (heightCacheRef.current[id] !== height) {
      heightCacheRef.current[id] = height;
    }
  }, []);

  // 计算可见范围和总高度
  const virtualData = useMemo(() => {
    if (!isVirtualEnabled) {
      return {
        visibleItems: items.map((item, index) => ({ item, index, offset: 0 })),
        totalHeight: 0,
        startOffset: 0,
        enabled: false,
      };
    }

    // 计算每项的偏移量和总高度
    let totalHeight = 0;
    const itemMeta: { item: T; index: number; offset: number; height: number }[] = [];
    
    items.forEach((item, index) => {
      const height = getItemHeight(item.id);
      itemMeta.push({ item, index, offset: totalHeight, height });
      totalHeight += height;
    });

    // 计算可见范围
    const startOffset = scrollTop;
    const endOffset = scrollTop + containerHeight;

    // 找到第一个可见项
    let startIndex = 0;
    for (let i = 0; i < itemMeta.length; i++) {
      if (itemMeta[i].offset + itemMeta[i].height > startOffset) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
    }

    // 找到最后一个可见项
    let endIndex = items.length - 1;
    for (let i = startIndex; i < itemMeta.length; i++) {
      if (itemMeta[i].offset > endOffset) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
    }

    // 返回可见项
    const visibleItems = itemMeta.slice(startIndex, endIndex + 1);
    const visibleStartOffset = visibleItems.length > 0 ? visibleItems[0].offset : 0;

    return {
      visibleItems,
      totalHeight,
      startOffset: visibleStartOffset,
      enabled: true,
    };
  }, [items, scrollTop, containerHeight, getItemHeight, overscan, isVirtualEnabled]);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [containerRef]);

  return {
    ...virtualData,
    measureHeight,
    scrollToBottom,
    isVirtualEnabled,
  };
}

/**
 * 测量消息高度的包装组件
 */
function MeasuredMessageWrapper({
  children,
  messageId,
  onMeasure,
}: {
  children: React.ReactNode;
  messageId: string;
  onMeasure: (id: string, height: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current) {
      const height = ref.current.getBoundingClientRect().height;
      onMeasure(messageId, height);
    }
  });

  return (
    <div ref={ref}>
      {children}
    </div>
  );
}

/**
 * 打字指示器
 */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-slate-500/60 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 bg-slate-500/60 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 bg-slate-500/60 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-sm text-muted-foreground">NARA 正在思考...</span>
    </div>
  );
}

/**
 * 行程项上下文卡片
 * 视觉设计：简洁的信息卡片，显示选中行程项的关键信息
 */
function SelectedItemCard({ context }: { context: SelectedContext }) {
  if (!context.placeName) return null;
  
  // 类型映射
  const typeLabels: Record<string, { label: string; emoji: string; color: string }> = {
    'ATTRACTION': { label: '景点', emoji: '🏛️', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    'RESTAURANT': { label: '餐厅', emoji: '🍽️', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    'CAFE': { label: '咖啡', emoji: '☕', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    'HOTEL': { label: '住宿', emoji: '🏨', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    'SHOPPING': { label: '购物', emoji: '🛍️', color: 'bg-pink-50 text-pink-700 border-pink-200' },
    'TRANSIT': { label: '交通', emoji: '🚌', color: 'bg-slate-50 text-slate-700 border-slate-200' },
    'MEAL_ANCHOR': { label: '用餐', emoji: '🍴', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    'ACTIVITY': { label: '活动', emoji: '🎯', color: 'bg-green-50 text-green-700 border-green-200' },
  };
  
  const typeInfo = typeLabels[context.itemType || ''] || { label: '地点', emoji: '📍', color: 'bg-slate-50 text-slate-700 border-slate-200' };

  return (
    <div className="mb-2 animate-in fade-in slide-in-from-left-2 duration-200">
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs",
        typeInfo.color
      )}>
        <span>{typeInfo.emoji}</span>
        <span className="font-medium">{context.placeName}</span>
        {context.itemTime && (
          <>
            <span className="opacity-50">·</span>
            <span className="opacity-75">{context.itemTime.start}-{context.itemTime.end}</span>
          </>
        )}
        {context.dayIndex && (
          <>
            <span className="opacity-50">·</span>
            <span className="opacity-75">第{context.dayIndex}天</span>
          </>
                        )}
                      </div>
    </div>
  );
}

/**
 * 对比表渲染组件
 */
function ComparisonContent({ content }: { content: ComparisonRichContent }) {
  return (
    <div className="mt-3">
      <div className="text-sm font-medium mb-2 flex items-center gap-2">
        <BarChart3 className="w-4 h-4" />
        {content.titleCN || content.title}
      </div>
      <div className="grid gap-2">
        {content.items.map((item) => (
          <Card 
            key={item.id}
            className={cn(
              "overflow-hidden",
              item.recommended && "ring-2 ring-green-300 bg-green-50/50"
            )}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{item.nameCN || item.name}</span>
                {item.recommended && (
                  <Badge className="bg-green-500">推荐</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(item.metrics).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-2" />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-green-600 font-medium">优点</span>
                  <ul className="mt-1 space-y-0.5">
                    {item.pros.map((pro, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-orange-600 font-medium">缺点</span>
                  <ul className="mt-1 space-y-0.5">
                    {item.cons.map((con, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <X className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * 清单渲染组件
 */
function ChecklistContent({ content }: { content: ChecklistRichContent }) {
  const [items, setItems] = useState(content.items);
  
  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof items> = {};
    items.forEach((item) => {
      const category = item.categoryCN || item.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    return groups;
  }, [items]);

  const progress = useMemo(() => {
    const checked = items.filter(i => i.checked).length;
    return Math.round((checked / items.length) * 100);
  }, [items]);

  const handleToggle = (itemId: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, checked: !item.checked } : item
    ));
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <List className="w-4 h-4" />
          <span className="font-medium text-sm">{content.titleCN || content.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={progress} className="w-20 h-2" />
          <span className="text-xs text-muted-foreground">{progress}%</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <div key={category}>
            <div className="text-xs font-medium text-muted-foreground mb-1.5">
              {category}
            </div>
            <div className="space-y-1">
              {categoryItems.map((item) => (
                <div 
                  key={item.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors",
                    item.checked && "opacity-60"
                  )}
                >
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={() => handleToggle(item.id)}
                    className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                  <span className={cn(
                    "text-sm flex-1",
                    item.checked && "line-through"
                  )}>
                    {item.textCN || item.text}
                  </span>
                  {item.priority === 'high' && (
                    <Badge variant="destructive" className="text-xs">重要</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * POI 推荐列表组件
 */
function POIListContent({ content }: { content: POIRichContent }) {
  return (
    <div className="mt-3">
      <div className="text-sm font-medium mb-2 flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        {content.titleCN || content.title}
      </div>
      <div className="space-y-2">
        {content.items.map((poi) => (
          <Card key={poi.id} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                {poi.imageUrl && (
                  <img 
                    src={poi.imageUrl} 
                    alt={poi.nameCN || poi.name}
                    className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">
                      {poi.nameCN || poi.name}
                    </span>
                    {poi.rating && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-xs">{poi.rating}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">
                      {poi.type}
                    </Badge>
                    {poi.distance && <span>{poi.distance}</span>}
                    {poi.priceLevel && <span>{poi.priceLevel}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {poi.reasonCN || poi.reason}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * 富文本内容渲染器
 * 注：timeline 类型不再渲染，因为左侧已有完整行程列表，避免信息冗余
 */
function RichContentRenderer({ content }: { content: RichContent }) {
  switch (content.type) {
    case 'timeline':
      // 不渲染 timeline，左侧行程列表已提供完整信息
      return null;
    case 'comparison':
      return <ComparisonContent content={content} />;
    case 'checklist':
      return <ChecklistContent content={content} />;
    case 'poi_list':
      return <POIListContent content={content} />;
    default:
      return null;
  }
}

// ==================== 快捷命令配置 ====================

// 输入框下方的常用快捷命令（与开场白功能介绍一致）
const inputQuickCommands: { id: string; label: string; action: string }[] = [
  { id: 'quick-optimize', label: '🎯 优化行程', action: '帮我优化行程路线和景点安排' },
  { id: 'quick-arrange', label: '📝 细化安排', action: '帮我添加餐厅和填充空闲时间' },
  { id: 'quick-ask', label: '💡 解答疑问', action: '我想了解一些旅行相关的问题' },
  { id: 'quick-prepare', label: '✅ 行前准备', action: '帮我生成行前准备清单' },
];

/**
 * 格式化消息内容渲染器
 * 解析简单的 Markdown 格式并美化显示
 */
function FormattedMessage({ content, itemNameMap }: { content: string; itemNameMap?: Map<string, string> }) {
  // 简化的消息解析：过滤冗余内容，只保留核心信息
  // 遵循 TripNARA "Clarity over Charm" 原则
  const parseContent = (text: string) => {
    const lines = text.split('\n');
    const segments: Array<{
      type: 'text' | 'problem-list';
      content: string;
      problems?: Array<{ description: string; suggestion?: string }>;
    }> = [];
    
    let currentProblemList: Array<{ description: string; suggestion?: string }> = [];
    let currentText: string[] = [];
    let inProblemSection = false;
    const processedLineIndices = new Set<number>(); // 跟踪已处理的行索引
    
    const shouldSkip = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      
      // 1. 跳过引导语
      if (/^现在我可以帮您/.test(trimmed)) return true;
      if (/^有什么.*帮.*吗/.test(trimmed)) return true;
      if (/^我可以帮您/.test(trimmed)) return true;
      if (/^您可以/.test(trimmed)) return true;
      
      // 2. 跳过功能介绍行（包含 **加粗标题** 和描述的行）
      // 匹配模式：包含 **xxx** 格式的行，通常是功能介绍
      if (/\*\*[^*]+\*\*/.test(trimmed) && /[-–—:：]/.test(trimmed)) {
        // 检查是否包含功能关键词
        if (/优化|细化|解答|行前|准备|填充|路线|餐厅|交通|天气|签证|清单|提醒|导出/.test(trimmed)) {
          return true;
        }
      }
      
      // 3. 跳过 emoji 开头的功能介绍行
      const firstChars = [...trimmed].slice(0, 2).join('');
      if (/\p{Emoji}/u.test(firstChars) && trimmed.includes('**')) {
        return true;
      }
      
      // 4. 跳过单独的功能关键词行
      if (/^(优化行程|细化安排|解答疑问|行前准备|智能填充|路线优化)/.test(trimmed)) return true;
      
      return false;
    };
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      
      // 跳过已处理的行
      if (processedLineIndices.has(lineIndex)) {
        continue;
      }
      
      // 跳过冗余内容
      if (shouldSkip(line)) {
        continue;
      }
      
      // 检测待处理项标题（支持多种格式）
      const trimmedLine = line.trim();
      const isProblemHeader = 
        (trimmedLine.includes('**发现') && trimmedLine.includes('问题**')) ||
        trimmedLine.includes('问题需要解决') ||
        trimmedLine.includes('必须解决的问题') ||
        trimmedLine.includes('潜在问题') ||
        (trimmedLine.includes('问题') && trimmedLine.includes('以下'));
      
      if (isProblemHeader) {
        // 结束之前的文本段
        if (currentText.length > 0) {
          segments.push({ type: 'text', content: currentText.join('\n') });
          currentText = [];
        }
        // 如果之前有问题列表，先保存
        if (currentProblemList.length > 0) {
          segments.push({ type: 'problem-list', content: '', problems: currentProblemList });
          currentProblemList = [];
        }
        inProblemSection = true;
        continue;
      }
      
      // 跳过"待处理"标题行本身
      if (trimmedLine.includes('待处理') && trimmedLine.match(/待处理\s*·\s*\d+/)) {
        continue;
      }
      
      // 检测待处理项 (数字. 内容) - 支持多种格式
      const problemMatch = trimmedLine.match(/^\d+[\.、]\s*(.+)$/);
      
      if (problemMatch) {
        // 清理问题项内容：分离问题和解决方案
        let problemText = problemMatch[1].trim();
        let suggestion: string | undefined;
        
        // 检查是否在同一行包含解决方案（以"→"开头）
        const suggestionMatch = problemText.match(/\s*→\s*(.+)$/);
        if (suggestionMatch) {
          suggestion = suggestionMatch[1].trim();
          problemText = problemText.split(/\s*→/)[0].trim();
        }
        
        // 检查下一行是否是解决方案
        if (!suggestion && lineIndex + 1 < lines.length) {
          const nextLineIndex = lineIndex + 1;
          const nextLine = lines[nextLineIndex].trim();
          if (nextLine.startsWith('→') || nextLine.startsWith('建议') || nextLine.startsWith('请')) {
            suggestion = nextLine.replace(/^[→建议请]\s*/, '').trim();
            processedLineIndices.add(nextLineIndex); // 标记为已处理
          }
        }
        
        // 容错处理：将"未命名活动"替换为更友好的提示
        // 后端已修复：会显示真实的活动名称，但前端仍保留容错处理作为备用
        problemText = problemText
          .replace(/「未命名活动」/g, '「活动（名称缺失）」')
          .replace(/未命名活动/g, '活动（名称缺失）');
        
        // 替换 itemId 为中文名称（备用方案）
        // 后端已修复：会从上下文查找真实名称，但前端仍保留此逻辑作为备用
        // 如果后端返回的消息中仍包含 itemId（如 "活动 c0af6b"），前端会尝试替换为中文名称
        if (itemNameMap && itemNameMap.size > 0) {
          itemNameMap.forEach((name, itemId) => {
            // 转义 itemId 中的特殊字符
            const escapedItemId = itemId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // 替换「itemId」格式
            problemText = problemText.replace(new RegExp(`「${escapedItemId}」`, 'g'), `「${name}」`);
            // 替换 itemId（不在引号中，使用单词边界）
            problemText = problemText.replace(new RegExp(`\\b${escapedItemId}\\b`, 'g'), name);
            // 替换 "活动 itemId" 格式（后端可能返回 "活动 c0af6b"）
            problemText = problemText.replace(new RegExp(`活动\\s+${escapedItemId}`, 'g'), name);
          });
        }
        
        // 跳过空内容
        if (!problemText) {
          continue;
        }
        
        const problemItem = { description: problemText, suggestion };
        
        if (inProblemSection) {
          // 在问题区块中，直接添加（去重：基于描述）
          const exists = currentProblemList.some(p => p.description === problemText);
          if (!exists) {
            currentProblemList.push(problemItem);
          }
          continue;
        } else {
          // 不在问题区块中，检查上下文（更严格的条件）
          const prevText = currentText.slice(-3).join('\n'); // 只检查最近3行
          if ((prevText.includes('问题') || prevText.includes('冲突')) && 
              (prevText.includes('需要解决') || prevText.includes('以下') || prevText.includes('存在'))) {
            // 结束之前的文本段
            if (currentText.length > 0) {
              segments.push({ type: 'text', content: currentText.join('\n') });
              currentText = [];
            }
            inProblemSection = true;
            const exists = currentProblemList.some(p => p.description === problemText);
            if (!exists) {
              currentProblemList.push(problemItem);
            }
            continue;
          }
        }
      }
      
      // 如果当前在问题区块中，且这一行是解决方案，附加到最后一个问题
      if (inProblemSection && currentProblemList.length > 0) {
        if (trimmedLine.startsWith('→') || trimmedLine.startsWith('建议') || trimmedLine.startsWith('请')) {
          const lastProblem = currentProblemList[currentProblemList.length - 1];
          if (!lastProblem.suggestion) {
            lastProblem.suggestion = trimmedLine.replace(/^[→建议请]\s*/, '').trim();
          }
          processedLineIndices.add(lineIndex); // 标记为已处理
          continue;
        }
      }
      
      // 普通文本处理
      if (trimmedLine) {
        // 如果当前在问题区块中，但这一行不是问题项格式，结束问题区块
        if (inProblemSection && currentProblemList.length > 0) {
          segments.push({ type: 'problem-list', content: '', problems: currentProblemList });
          currentProblemList = [];
          inProblemSection = false;
        }
        // 添加到普通文本
        currentText.push(line);
      }
    }
    
    // 处理剩余内容
    if (currentText.length > 0) {
      segments.push({ type: 'text', content: currentText.join('\n') });
    }
    if (currentProblemList.length > 0) {
      segments.push({ type: 'problem-list', content: '', problems: currentProblemList });
    }
    
    return segments;
  };

  const segments = parseContent(content);

  // 合并所有问题列表并去重
  const problemMap = new Map<string, { description: string; suggestion?: string }>();
  const problemListSegments = segments.filter(s => s.type === 'problem-list');
  const textSegments = segments.filter(s => s.type === 'text');
  
  // 收集所有问题并去重（基于 description）
  problemListSegments.forEach(segment => {
    segment.problems?.forEach(p => {
      // 如果已存在相同描述的问题，保留有解决方案的版本
      if (!problemMap.has(p.description) || (!problemMap.get(p.description)?.suggestion && p.suggestion)) {
        problemMap.set(p.description, p);
      }
    });
  });
  
  const uniqueProblems = Array.from(problemMap.values());
  
  // 如果有多于一个问题列表段，合并为一个
  const finalSegments: typeof segments = [...textSegments];
  if (uniqueProblems.length > 0 && problemListSegments.length > 0) {
    finalSegments.push({
      type: 'problem-list',
      content: '',
      problems: uniqueProblems,
    });
  }

  // 只有普通文本时直接返回
  if (finalSegments.length === 1 && finalSegments[0].type === 'text') {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>;
  }

  return (
    <div className="space-y-2">
      {finalSegments.map((segment, idx) => {
        switch (segment.type) {
          case 'text':
            return (
              <p key={idx} className="whitespace-pre-wrap text-sm leading-relaxed">
                {segment.content}
              </p>
            );
          
          case 'problem-list':
            if (!segment.problems || segment.problems.length === 0) {
              return null;
            }
            
            return (
              <div key={idx} className="mt-4 -mx-1">
                {/* 标题行：使用柔和的分隔线和图标 */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ListChecks className="w-3 h-3" />
                    待处理 · {segment.problems.length}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent" />
                </div>
                {/* 列表项：清晰的层级和可读性 */}
                <div className="space-y-1.5">
                  {segment.problems.map((problem, i) => (
                    <div
                      key={i}
                      className="group flex flex-col gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100/50 transition-colors cursor-default"
                    >
                      <div className="flex items-start gap-2.5">
                        {/* 编号：使用胶囊形状，更现代 */}
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-slate-200/70 text-slate-500 text-[10px] font-semibold mt-0.5 flex-shrink-0">
                          {i + 1}
                        </span>
                        {/* 问题描述 - 后端已确保活动名称不为空 */}
                        <span className="text-[13px] text-slate-600 leading-relaxed flex-1">
                          {problem.description}
                        </span>
                      </div>
                      {/* 解决方案 */}
                      {problem.suggestion && (
                        <div className="flex items-start gap-2.5 ml-[26px]">
                          <span className="text-[11px] text-slate-500 flex-1 leading-relaxed">
                            → {problem.suggestion}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          
          default:
            return null;
        }
      })}
    </div>
  );
}

// 上下文相关的快捷命令
const contextQuickCommands = {
  // 选中地点时的命令
  place: [
    { id: 'ctx-nearby', label: '🍽️ 附近餐厅', action: (name: string) => `在${name}附近推荐一个好吃的餐厅` },
    { id: 'ctx-duration', label: '⏱️ 停留时间', action: (name: string) => `${name}建议游玩多长时间？` },
    { id: 'ctx-tips', label: '💡 注意事项', action: (name: string) => `去${name}有什么注意事项？` },
    { id: 'ctx-alt', label: '🔄 替代方案', action: (name: string) => `有没有${name}的替代景点推荐？` },
  ],
  // 选中天时的命令
  day: [
    { id: 'ctx-optimize', label: '🚀 优化当天', action: (day: number) => `帮我优化第${day}天的行程安排` },
    { id: 'ctx-fill', label: '✨ 填充空闲', action: (day: number) => `第${day}天有空闲时间吗？帮我填充` },
    { id: 'ctx-meal', label: '🍽️ 餐厅推荐', action: (day: number) => `第${day}天推荐一个午餐地点` },
    { id: 'ctx-route', label: '📍 路线优化', action: (day: number) => `帮我优化第${day}天的路线顺序` },
  ],
};

/**
 * 输入框下方快捷命令条
 * 智能切换：有上下文时显示上下文相关命令，无上下文时显示通用命令
 */
function QuickCommandsBar({ 
  onCommandClick,
  disabled,
  visible = true,
  context,
}: { 
  onCommandClick: (command: string) => void;
  disabled?: boolean;
  visible?: boolean;
  context?: SelectedContext;
}) {
  if (!visible) return null;

  // 智能选择命令
  const hasPlaceContext = context?.placeName;
  const hasDayContext = context?.dayIndex && !hasPlaceContext;
  
  // 根据上下文选择命令列表
  let commands: Array<{ id: string; label: string; action: string }>;
  let labelPrefix: string;
  
  if (hasPlaceContext) {
    commands = contextQuickCommands.place.map(cmd => ({
      id: cmd.id,
      label: cmd.label,
      action: cmd.action(context.placeName!),
    }));
    labelPrefix = '关于此地点：';
  } else if (hasDayContext) {
    commands = contextQuickCommands.day.map(cmd => ({
      id: cmd.id,
      label: cmd.label,
      action: cmd.action(context.dayIndex!),
    }));
    labelPrefix = `Day ${context.dayIndex}：`;
  } else {
    commands = inputQuickCommands;
    labelPrefix = '快捷：';
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200">
      <span className={cn(
        "text-[10px] font-medium flex-shrink-0 mr-1",
        hasPlaceContext || hasDayContext ? "text-blue-500" : "text-slate-400"
      )}>
        {labelPrefix}
      </span>
      {commands.map((cmd) => (
        <button
          key={cmd.id}
          onClick={() => onCommandClick(cmd.action)}
          disabled={disabled}
          className={cn(
            "flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150",
            hasPlaceContext || hasDayContext 
              ? "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:border-blue-300"
              : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 hover:border-slate-300 hover:text-slate-700",
            "active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {cmd.label}
        </button>
      ))}
    </div>
  );
}

/**
 * 上下文状态栏
 * 显示当前选中的天数/行程项，提供快捷操作入口
 */
function ContextStatusBar({ 
  context,
  onAskAbout,
}: { 
  context: SelectedContext;
  onAskAbout: (question: string) => void;
}) {
  const { dayIndex, date, placeName, itemType } = context;
  
  // 没有选中任何内容时不显示
  if (!dayIndex && !placeName) return null;

  const typeLabels: Record<string, string> = {
    'ACTIVITY': '活动',
    'TRANSIT': '交通',
    'MEAL_ANCHOR': '用餐',
    'MEAL_FLOATING': '用餐',
    'REST': '休息',
  };

  const contextQuickActions = placeName ? [
    { label: '附近餐厅', action: `在${placeName}附近推荐一个好吃的餐厅` },
    { label: '停留时间', action: `${placeName}建议游玩多长时间？` },
    { label: '注意事项', action: `去${placeName}有什么注意事项？` },
  ] : dayIndex ? [
    { label: '优化当天', action: `帮我优化第${dayIndex}天的行程安排` },
    { label: '填充空闲', action: `第${dayIndex}天有空闲时间吗？帮我填充` },
    { label: '餐厅推荐', action: `第${dayIndex}天推荐一个午餐地点` },
  ] : [];

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200/60 p-2.5 mb-2">
      {/* 当前上下文 */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center">
          <MapPin className="w-3 h-3 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-blue-800 truncate">
            {placeName ? (
              <>
                <span className="text-blue-500">Day {dayIndex}</span>
                <span className="mx-1 text-blue-300">›</span>
                <span>{placeName}</span>
                {itemType && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-blue-100 text-[10px] text-blue-600">
                    {typeLabels[itemType] || itemType}
                  </span>
                )}
              </>
            ) : (
              <>
                <span>正在查看：</span>
                <span className="text-blue-600">第 {dayIndex} 天</span>
                {date && (
                  <span className="ml-1 text-blue-400 text-[10px]">
                    ({format(new Date(date), 'M月d日')})
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* 快捷问题 */}
      <div className="flex flex-wrap gap-1">
        {contextQuickActions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => onAskAbout(action.action)}
            className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/80 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-colors"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 待处理建议面板
 * 显示 NARA 推荐的地点/操作，支持一键添加到行程
 */
function PendingSuggestionsPanel({ 
  suggestions,
  onApply,
  onDismiss,
  loading,
}: { 
  suggestions: PendingSuggestion[];
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
  loading?: boolean;
}) {
  if (suggestions.length === 0) return null;

  const categoryIcons: Record<string, string> = {
    'RESTAURANT': '🍽️',
    'CAFE': '☕',
    'ATTRACTION': '🏛️',
    'MUSEUM': '🖼️',
    'PARK': '🌳',
    'SHOPPING': '🛍️',
    'HOTEL': '🏨',
    'OTHER': '📍',
  };

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200/60 p-2.5 mb-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs font-medium text-emerald-800">
          NARA 的建议 ({suggestions.length})
        </span>
      </div>
      
      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <div 
            key={suggestion.id}
            className="bg-white/80 rounded-lg border border-emerald-200 p-2"
          >
            <div className="flex items-start gap-2">
              {/* 图标 */}
              <span className="text-lg flex-shrink-0">
                {suggestion.place?.category 
                  ? categoryIcons[suggestion.place.category] || '📍'
                  : '💡'}
              </span>
              
              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-slate-800 truncate">
                  {suggestion.place?.nameCN || suggestion.description}
                </div>
                {suggestion.place?.address && (
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    📍 {suggestion.place.address}
                  </div>
                )}
                {suggestion.place?.rating && (
                  <div className="text-[11px] text-amber-600 mt-0.5">
                    ⭐ {suggestion.place.rating}
                  </div>
                )}
                <div className="text-[10px] text-slate-400 mt-1">
                  建议添加到 Day {suggestion.targetDay}
                  {suggestion.suggestedTime && ` · ${suggestion.suggestedTime}`}
                </div>
              </div>
              
              {/* 操作按钮 */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => onApply(suggestion.id)}
                  disabled={loading}
                  className="px-2 py-1 rounded text-[10px] font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                >
                  ➕ 添加
                </button>
                <button
                  onClick={() => onDismiss(suggestion.id)}
                  disabled={loading}
                  className="px-2 py-1 rounded text-[10px] font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                >
                  忽略
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 意图消歧系统组件 ====================

/**
 * 缺口高亮卡片
 * 用于显示发现的行程缺口（用餐/住宿/交通等）
 */
function GapHighlightCard({ 
  data,
}: { 
  data: GapHighlightRichContent['data'];
}) {
  const { highlight } = data;
  
  // TripNARA 克制风格 - 使用左边框 + 图标，避免大面积彩色背景
  const severityConfig: Record<GapSeverity, {
    borderColor: string;
    bgColor: string;
    icon: React.ReactNode;
    iconColor: string;
    label: string;
  }> = {
    CRITICAL: {
      borderColor: 'border-l-red-500',
      bgColor: 'bg-red-50/50',
      icon: <AlertTriangle className="w-4 h-4" />,
      iconColor: 'text-red-500',
      label: '需关注',
    },
    SUGGESTED: {
      borderColor: 'border-l-amber-500',
      bgColor: 'bg-amber-50/50',
      icon: <Lightbulb className="w-4 h-4" />,
      iconColor: 'text-amber-500',
      label: '建议',
    },
    OPTIONAL: {
      borderColor: 'border-l-blue-500',
      bgColor: 'bg-blue-50/50',
      icon: <Info className="w-4 h-4" />,
      iconColor: 'text-blue-500',
      label: '可选',
    },
  };
  
  const config = severityConfig[highlight.severity];
  
  return (
    <div 
      className={cn(
        "rounded-lg border-l-4 p-3 mb-3",
        config.borderColor,
        config.bgColor
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* 图标 */}
        <div className={cn("flex-shrink-0 mt-0.5", config.iconColor)}>
          {config.icon}
        </div>
        
        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {config.label}
            </Badge>
            <span className="text-xs font-medium text-slate-700">
              第{highlight.dayNumber}天
            </span>
            <span className="text-xs text-slate-500">
              {highlight.timeSlot.start} - {highlight.timeSlot.end}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            {highlight.description}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 澄清选项按钮组
 * 用于显示意图澄清选项
 */
function ClarificationOptions({ 
  actions, 
  onSelect,
  disabled,
  followUp,
  onFreeTextSubmit,
}: { 
  actions: QuickAction[];
  onSelect: (action: QuickAction) => void;
  disabled?: boolean;
  followUp?: FollowUp;
  onFreeTextSubmit?: (text: string) => void;
}) {
  const [freeText, setFreeText] = useState('');
  
  // 分离主要和次要选项
  const primaryActions = actions.filter(a => a.style === 'primary');
  const secondaryActions = actions.filter(a => a.style !== 'primary');
  
  const handleFreeTextSubmit = () => {
    if (freeText.trim() && onFreeTextSubmit) {
      onFreeTextSubmit(freeText.trim());
      setFreeText('');
    }
  };

  return (
    <div className="mt-3 space-y-3">
      {/* 选项按钮 */}
    <div className="flex flex-wrap gap-2">
        {/* 主要选项 */}
        {primaryActions.map((action) => (
          <button
          key={action.id}
            onClick={() => onSelect(action)}
          disabled={disabled}
            className={cn(
              "flex-1 min-w-[140px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "border-2 border-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <span className="block">{action.label}</span>
            {action.description && (
              <span className="block text-[11px] opacity-80 mt-0.5">
                {action.description}
              </span>
            )}
          </button>
        ))}
        
        {/* 次要选项 */}
        {secondaryActions.map((action) => (
          <button
            key={action.id}
            onClick={() => onSelect(action)}
            disabled={disabled}
            className={cn(
              "flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              "bg-slate-100 text-slate-700 hover:bg-slate-200",
              "border border-slate-200",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <span className="block">{action.label}</span>
            {action.description && (
              <span className="block text-[11px] text-slate-500 mt-0.5">
                {action.description}
              </span>
            )}
          </button>
      ))}
      </div>
      
      {/* 自由输入框（当 followUp.type 为 text 时） */}
      {followUp?.type === 'text' && onFreeTextSubmit && (
        <div className="flex gap-2">
          <Input
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="或者告诉我您的想法..."
            disabled={disabled}
            className="flex-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleFreeTextSubmit();
              }
            }}
          />
          <Button
            onClick={handleFreeTextSubmit}
            disabled={disabled || !freeText.trim()}
            size="sm"
          >
            发送
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * 缺口检测面板
 * 视觉设计：简洁的警告卡片，显示午餐、住宿等未安排的缺口
 */
function DetectedGapsPanel({ gaps }: { gaps: DetectedGap[] }) {
  if (!gaps || gaps.length === 0) return null;
  
  // 缺口类型配置
  const gapConfig: Record<string, { emoji: string; label: string; color: string }> = {
    MEAL: { emoji: '🍽️', label: '用餐', color: 'text-orange-600 bg-orange-50 border-orange-200' },
    HOTEL: { emoji: '🏨', label: '住宿', color: 'text-purple-600 bg-purple-50 border-purple-200' },
    TRANSPORT: { emoji: '🚌', label: '交通', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    ACTIVITY: { emoji: '🎯', label: '活动', color: 'text-green-600 bg-green-50 border-green-200' },
    FREE_TIME: { emoji: '⏰', label: '空闲', color: 'text-slate-600 bg-slate-50 border-slate-200' },
  };
  
  // 严重程度配置
  const severityConfig: Record<string, { badge: string; icon: string }> = {
    CRITICAL: { badge: 'bg-red-100 text-red-700 border-red-200', icon: '❗' },
    SUGGESTED: { badge: 'bg-amber-100 text-amber-700 border-amber-200', icon: '💡' },
    OPTIONAL: { badge: 'bg-slate-100 text-slate-600 border-slate-200', icon: '💭' },
  };
  
  // 按严重程度排序
  const sortedGaps = [...gaps].sort((a, b) => {
    const order = { CRITICAL: 0, SUGGESTED: 1, OPTIONAL: 2 };
    return (order[a.severity] || 2) - (order[b.severity] || 2);
  });
  
  return (
    <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>检测到 {gaps.length} 个待完善项</span>
      </div>
      
      <div className="space-y-1.5">
        {sortedGaps.map((gap) => {
          const config = gapConfig[gap.type] || gapConfig.ACTIVITY;
          const severity = severityConfig[gap.severity] || severityConfig.SUGGESTED;
          
          return (
            <div 
              key={gap.id}
              className={cn(
                "flex items-start gap-2.5 px-3 py-2 rounded-lg border text-sm",
                config.color
              )}
            >
              <span className="text-base flex-shrink-0 mt-0.5">{config.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">第{gap.dayNumber}天 {config.label}</span>
                  {gap.severity === 'CRITICAL' && (
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border", severity.badge)}>
                      {severity.icon} 必要
                    </span>
                  )}
                </div>
                <p className="text-xs opacity-80 mt-0.5">{gap.description}</p>
                {gap.context?.beforeItem && gap.context?.afterItem && (
                  <p className="text-[10px] opacity-60 mt-1">
                    在「{gap.context.beforeItem}」和「{gap.context.afterItem}」之间
                  </p>
                )}
              </div>
              <span className="text-xs opacity-60 flex-shrink-0">
                {gap.timeSlot.start}-{gap.timeSlot.end}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 判断是否为澄清响应
 */
function isClarificationResponse(meta?: PlannerResponseMeta): boolean {
  return (
    meta?.uncertainty !== undefined &&
    meta.uncertainty !== IntentUncertainty.CLEAR
  );
}

/**
 * 待确认修改面板
 */
function PendingChangesPanel({
  changes,
  onConfirm,
  onReject,
  loading,
}: {
  changes: PendingChange[];
  onConfirm: () => void;
  onReject: () => void;
  loading?: boolean;
}) {
  if (changes.length === 0) return null;
  
  // 修改类型映射
  const changeTypeLabels: Record<string, { label: string; color: string }> = {
    add: { label: '添加', color: 'bg-green-50 text-green-700 border-green-200' },
    remove: { label: '删除', color: 'bg-red-50 text-red-700 border-red-200' },
    modify: { label: '修改', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    reorder: { label: '调整顺序', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    update: { label: '更新', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  };
  
  const getChangeTypeInfo = (type: string) => {
    const lowerType = type.toLowerCase();
    return changeTypeLabels[lowerType] || { label: type, color: 'bg-slate-50 text-slate-700 border-slate-200' };
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          待确认的修改 ({changes.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
          {changes.map((change) => {
            const typeInfo = getChangeTypeInfo(change.type);
            return (
            <div 
              key={change.id}
              className="flex items-start gap-2 text-sm p-2 bg-white rounded"
            >
                <Badge variant="outline" className={cn("text-xs flex-shrink-0", typeInfo.color)}>
                  {typeInfo.label}
              </Badge>
              <span>{change.descriptionCN || change.description}</span>
            </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            disabled={loading}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-1" />
            取消
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-1" />
            )}
            确认应用
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 追问选项组件
 */
function FollowUpOptions({
  followUp,
  onSelect,
}: {
  followUp: FollowUp;
  onSelect: (value: string) => void;
}) {
  const options = followUp.optionsCN || followUp.options || [];

  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm text-muted-foreground">
        {followUp.questionCN || followUp.question}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option, idx) => (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            onClick={() => onSelect(option)}
            className="text-xs"
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * P3: 人格显示偏好设置条
 * 允许用户切换各人格的显示状态
 */
const PERSONA_TOGGLES: Array<{
  persona: GuardianPersona;
  emoji: string;
  name: string;
  description: string;
  animal: string;
}> = [
  { persona: 'Abu', emoji: '🐻‍❄️', name: 'Abu', description: '安全与边界守护者', animal: '北极熊' },
  { persona: 'DrDre', emoji: '🐕', name: 'Dr.Dre', description: '节奏与体力设计师', animal: '牧羊犬' },
  { persona: 'Neptune', emoji: '🦦', name: 'Neptune', description: '修复与替代魔法师', animal: '海獭' },
];

/**
 * 顾问团状态类型
 */
type GuardianStatus = 'standby' | 'analyzing' | 'has_insights' | 'all_clear';

function PersonaPreferencesBar({
  hiddenPersonas,
  onToggle,
  status = 'standby',
  hasAnyInsights = false,
}: {
  hiddenPersonas: Set<GuardianPersona>;
  onToggle: (persona: GuardianPersona) => void;
  status?: GuardianStatus;
  hasAnyInsights?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasHidden = hiddenPersonas.size > 0;

  // 如果没有任何洞察数据，显示待命/分析状态
  if (!hasAnyInsights) {
    return (
      <div className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all",
        status === 'analyzing' 
          ? "bg-slate-100 border border-slate-200" 
          : "bg-slate-50/50 border border-dashed border-slate-200"
      )}>
        {/* 人格头像 */}
        <div className="flex -space-x-1.5">
          {PERSONA_TOGGLES.map(({ persona, emoji }) => (
            <span 
              key={persona}
              className={cn(
                "text-sm transition-all",
                status === 'analyzing' ? "animate-pulse" : "opacity-40 grayscale"
              )}
            >
              {emoji}
            </span>
          ))}
        </div>
        
        {/* 状态文案 */}
        <div className="flex-1">
          {status === 'analyzing' ? (
            <div className="flex items-center gap-2 text-slate-600">
              <span>顾问团分析中</span>
              <div className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1 h-1 rounded-full bg-slate-400 animate-bounce"
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">
              顾问团待命中，将在需要时自动分析
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 紧凑视图 - 点击展开 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all",
          "bg-slate-100/80 hover:bg-slate-100 border border-slate-200/50",
          expanded && "bg-slate-100"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">顾问团</span>
          <div className="flex -space-x-1">
            {PERSONA_TOGGLES.map(({ persona, emoji }) => (
              <span 
                key={persona}
                className={cn(
                  "text-sm transition-opacity",
                  hiddenPersonas.has(persona) && "opacity-30"
                )}
              >
                {emoji}
              </span>
            ))}
          </div>
          {hasHidden && (
            <span className="text-amber-600 text-xs">
              ({hiddenPersonas.size} 已隐藏)
            </span>
          )}
        </div>
        <ChevronRight className={cn(
          "w-3.5 h-3.5 text-muted-foreground transition-transform",
          expanded && "rotate-90"
        )} />
      </button>

      {/* 展开视图 - 带动画 */}
      {expanded && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200 px-1">
          <div className="flex gap-2">
            {PERSONA_TOGGLES.map(({ persona, emoji, name, description, animal }) => {
              const isHidden = hiddenPersonas.has(persona);
              return (
                <button
                  key={persona}
                  onClick={() => onToggle(persona)}
                  className={cn(
                    "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all",
                    "border hover:shadow-sm",
                    isHidden 
                      ? "bg-slate-50 border-slate-200 opacity-60" 
                      : "bg-white border-slate-200 hover:border-slate-300"
                  )}
                >
                  <span className={cn("text-base", isHidden && "grayscale")}>{emoji}</span>
                  <div className="flex-1 text-left">
                    <div className={cn(
                      "font-medium",
                      isHidden ? "text-slate-400" : "text-slate-700"
                    )}>
                      {name}
                    </div>
                    <div className="text-muted-foreground text-[10px]">{animal} · {description}</div>
                  </div>
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                    isHidden 
                      ? "border-slate-300 bg-slate-100" 
                      : "border-slate-900 bg-slate-900"
                  )}>
                    {!isHidden && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 消息气泡组件
 */
function MessageBubble({
  message,
  onFollowUpSelect,
  onClarificationSelect,
  onClarificationFreeText,
  onAcceptSuggestion,
  onRejectSuggestion,
  onIgnoreWarning,
  onAcknowledgeDisclaimer,
  hiddenPersonas,
  isLatest,
  isNewMessage,
  loading,
  itemNameMap,
}: {
  message: PlannerMessage;
  onFollowUpSelect?: (value: string) => void;
  /** 🆕 澄清选项选择回调 */
  onClarificationSelect?: (action: QuickAction) => void;
  /** 🆕 澄清自由文本输入回调 */
  onClarificationFreeText?: (text: string) => void;
  onAcceptSuggestion?: (persona: GuardianPersona, suggestionId?: string) => void;
  onRejectSuggestion?: (persona: GuardianPersona, reason?: string) => void;
  onIgnoreWarning?: (persona: GuardianPersona) => void;
  onAcknowledgeDisclaimer?: () => void;
  hiddenPersonas?: Set<GuardianPersona>;
  isLatest?: boolean;
  isNewMessage?: boolean;
  loading?: boolean;
  /** itemId -> 中文名称映射 */
  itemNameMap?: Map<string, string>;
}) {
  const isUser = message.role === 'user';
  
  const enableTypewriter = !isUser && isNewMessage === true;
  const { displayedText, isTyping } = useTypewriter(
    message.content,
    enableTypewriter,
    20
  );
  
  const textToShow = enableTypewriter ? displayedText : message.content;

  // 过滤隐藏的人格
  const visibleInsights = useMemo(() => {
    if (!message.personaInsights || !hiddenPersonas) return message.personaInsights;
    return message.personaInsights.filter(insight => !hiddenPersonas.has(insight.persona));
  }, [message.personaInsights, hiddenPersonas]);

  // 是否显示守护者面板
  const showGuardianPanel = !isUser && visibleInsights && visibleInsights.length > 0 && !isTyping;

  // 🆕 是否是澄清响应
  const isClarification = !isUser && isClarificationResponse(message.meta);
  
  // 🆕 检查是否有缺口高亮内容
  const gapHighlight = message.richContent?.type === 'gap_highlight' 
    ? (message.richContent as GapHighlightRichContent) 
    : null;

  return (
    <div className={cn(
      "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* 头像 */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser
          ? "bg-slate-200"
          : "bg-gradient-to-br from-slate-700 to-slate-900"
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-slate-600" />
        ) : (
          <Sparkles className="w-4 h-4 text-white" />
        )}
      </div>

      {/* 消息内容 */}
      <div className={cn(
        "flex flex-col max-w-[85%]",
        isUser ? "items-end" : "items-start"
      )}>
        {/* 角色标签 */}
        <span className="text-xs text-muted-foreground mb-1">
          {isUser ? '我' : '🧳 NARA'}
        </span>

        {/* 🆕 用户消息的行程上下文卡片 */}
        {isUser && message.selectedContext?.placeName && (
          <SelectedItemCard context={message.selectedContext as SelectedContext} />
        )}

        {/* 消息气泡 */}
        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800 rounded-tl-sm border border-slate-200/50"
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{textToShow}</p>
          ) : (
            <>
              <FormattedMessage content={textToShow} itemNameMap={itemNameMap} />
            {isTyping && (
              <span className="inline-block w-0.5 h-4 bg-slate-600 ml-0.5 animate-pulse" />
            )}
            </>
          )}
        </div>

        {/* 🆕 缺口高亮卡片（意图消歧系统） */}
        {!isUser && gapHighlight && !isTyping && (
          <div className="mt-3 w-full">
            <GapHighlightCard data={gapHighlight.data} />
          </div>
        )}

        {/* 富文本内容（非缺口高亮时） */}
        {!isUser && message.richContent && !gapHighlight && !isTyping && (
          <div className="w-full">
            <RichContentRenderer content={message.richContent} />
          </div>
        )}

        {/* 🆕 责任声明横幅 */}
        {!isUser && message.disclaimer && !isTyping && (
          <div className="mt-3 w-full animate-in fade-in slide-in-from-bottom-1 duration-300">
            <DisclaimerBanner
              disclaimer={message.disclaimer}
              onAcknowledge={onAcknowledgeDisclaimer}
            />
          </div>
        )}

        {/* 🆕 守护者面板 - 带动画效果 */}
        {showGuardianPanel && (
          <div className="mt-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            <GuardianPanel
              insights={visibleInsights!}
              evaluation={message.guardianEvaluation}
              onAcceptSuggestion={onAcceptSuggestion}
              onRejectSuggestion={onRejectSuggestion}
              onIgnoreWarning={onIgnoreWarning}
            />
          </div>
        )}

        {/* 追问选项（非澄清响应时） */}
        {!isUser && !isClarification && message.followUp && isLatest && !isTyping && onFollowUpSelect && (
          <FollowUpOptions 
            followUp={message.followUp}
            onSelect={onFollowUpSelect}
          />
        )}

        {/* 🆕 缺口检测面板 */}
        {!isUser && message.meta?.detectedGaps && message.meta.detectedGaps.length > 0 && !isTyping && (
          <DetectedGapsPanel gaps={message.meta.detectedGaps} />
        )}

        {/* 🆕 澄清选项（意图消歧系统 - 包含 followUp） */}
        {!isUser && isClarification && message.quickActions && message.quickActions.length > 0 && isLatest && !isTyping && onClarificationSelect && (
          <div className="mt-3 w-full">
            <ClarificationOptions
              actions={message.quickActions}
              onSelect={onClarificationSelect}
              disabled={loading}
              followUp={message.followUp}
              onFreeTextSubmit={onClarificationFreeText}
            />
          </div>
        )}

        {/* 时间戳 */}
        <span className="text-xs text-muted-foreground mt-1">
          {format(message.timestamp, 'HH:mm')}
        </span>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

const TripPlannerAssistant = forwardRef<TripPlannerAssistantRef, TripPlannerAssistantProps>(({
  tripId,
  className,
  onTripUpdate,
  compact = false,
}, ref) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [newMessageId, setNewMessageId] = useState<string | null>(null);
  // itemId -> 中文名称映射
  const [itemNameMap, setItemNameMap] = useState<Map<string, string>>(new Map());

  // 左右联动上下文
  const { 
    selectedContext, 
    pendingSuggestions,
    applySuggestion,
    dismissSuggestion,
    setOnAskAssistant,
  } = usePlanStudioSafe();

  const {
    messages,
    currentPhase,
    sessionId,
    loading,
    error,
    pendingChanges,
    isInitialized,
    sendMessage,
    confirmChanges,
    rejectChanges,
    undoLastChange,
    startSession,
  } = useTripPlannerAssistant({
    tripId,
    autoStart: true,
    onTripUpdate: onTripUpdate ? () => onTripUpdate() : undefined,
  });

  // 获取行程数据并构建 itemId -> 中文名称映射
  useEffect(() => {
    const loadTripItems = async () => {
      try {
        const trip = await tripsApi.getById(tripId);
        const nameMap = new Map<string, string>();
        
        // 遍历所有天和行程项
        if (trip.TripDay) {
          trip.TripDay.forEach(day => {
            if (day.ItineraryItem) {
              day.ItineraryItem.forEach(item => {
                // 检查 item 是否有 Place 属性
                if (item.id && 'Place' in item && item.Place) {
                  const place = item.Place as { nameCN?: string; nameEN?: string };
                  const name = place.nameCN || place.nameEN || '';
                  if (name) {
                    nameMap.set(item.id, name);
                  }
                }
              });
            }
          });
        }
        
        setItemNameMap(nameMap);
      } catch (error) {
        console.error('[TripPlannerAssistant] 获取行程数据失败:', error);
      }
    };
    
    if (tripId) {
      loadTripItems();
    }
  }, [tripId]);

  // 注册来自左侧的提问处理
  useEffect(() => {
    setOnAskAssistant((question: string, context: SelectedContext) => {
      console.log('[TripPlannerAssistant] 收到左侧提问:', { question, context });
      
      // 带完整上下文发送消息
      sendMessage(question, {
        targetDay: context.dayIndex || undefined,
        targetItemId: context.itemId || undefined,
        context: {
          selectedContext: {
            dayIndex: context.dayIndex || undefined,
            date: context.date || undefined,
            itemId: context.itemId || undefined,
            placeName: context.placeName || undefined,
            itemType: context.itemType || undefined,
            itemTime: context.itemTime,
          },
          adjacentItems: context.prevItem || context.nextItem ? {
            prevItem: context.prevItem,
            nextItem: context.nextItem,
          } : undefined,
          dayStats: context.dayStats,
        },
      });
    });
  }, [setOnAskAssistant, sendMessage]);

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    refresh: () => startSession(),
    isLoading: loading,
  }), [startSession, loading]);

  // 虚拟滚动
  const {
    visibleItems,
    totalHeight,
    startOffset,
    measureHeight,
    scrollToBottom,
    isVirtualEnabled,
  } = useVirtualMessages(messages, scrollContainerRef, {
    estimatedItemHeight: 150, // 消息可能包含富文本，预估高一些
    overscan: 3,
    threshold: 15, // 超过 15 条消息启用虚拟滚动
  });

  // 自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, loading, scrollToBottom]);

  // 监听新消息，设置打字机效果（只在消息数量增加时触发）
  const prevMessageCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        setNewMessageId(lastMessage.id);
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // 构建上下文参数
  const buildContextOptions = useCallback(() => ({
    context: {
      selectedContext: selectedContext.dayIndex || selectedContext.itemId ? {
        dayIndex: selectedContext.dayIndex || undefined,
        date: selectedContext.date || undefined,
        itemId: selectedContext.itemId || undefined,
        placeName: selectedContext.placeName || undefined,
        itemType: selectedContext.itemType || undefined,
      } : undefined,
      adjacentItems: selectedContext.prevItem || selectedContext.nextItem ? {
        prevItem: selectedContext.prevItem,
        nextItem: selectedContext.nextItem,
      } : undefined,
      dayStats: selectedContext.dayStats,
    },
    targetDay: selectedContext.dayIndex || undefined,
    targetItemId: selectedContext.itemId || undefined,
  }), [selectedContext]);

  // 发送消息
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || loading) return;
    const message = inputValue.trim();
    setInputValue('');
    // 🆕 带上下文发送
    await sendMessage(message, buildContextOptions());
    inputRef.current?.focus();
  }, [inputValue, loading, sendMessage, buildContextOptions]);

  // 发送预设命令（用于快捷命令）
  const handleSendCommand = useCallback(async (command: string) => {
    if (!command.trim() || loading) return;
    // 🆕 带上下文发送
    await sendMessage(command.trim(), buildContextOptions());
    inputRef.current?.focus();
  }, [loading, sendMessage, buildContextOptions]);

  // 键盘事件
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // 追问选择
  const handleFollowUpSelect = useCallback(async (value: string) => {
    await sendMessage(value);
  }, [sendMessage]);

  // 🆕 澄清选项选择
  const handleClarificationSelect = useCallback(async (action: QuickAction) => {
    console.log('[ClarificationSelect] 选择的 action:', action);
    
    // 直接使用 label 作为消息（更自然）
    const confirmMessage = action.label;
    
    // 🔧 从 params 推断 selectedAction（如果后端没设置）
    let selectedAction = action.data?.selectedAction;
    if (!selectedAction && action.data?.params) {
      // 如果有 dayNumber 或 timeSlot，说明是添加到行程
      if (action.data.params.dayNumber || action.data.params.timeSlot) {
        selectedAction = 'ADD_TO_ITINERARY';
      }
    }
    
    console.log('[ClarificationSelect] 发送消息:', {
      message: confirmMessage,
      selectedAction,
      params: action.data?.params,
    });
    
    // 发送消息（带上澄清参数和上下文）
    await sendMessage(confirmMessage, {
      targetDay: action.data?.params?.dayNumber,
      targetItemId: action.data?.params?.targetItemId,
      // 🆕 传递澄清数据（确保 selectedAction 被设置）
      clarificationData: {
        selectedAction: selectedAction,
        params: action.data?.params,
      },
      // 🆕 传递当前上下文
      context: {
        selectedContext: {
          dayIndex: selectedContext.dayIndex || undefined,
          date: selectedContext.date || undefined,
          itemId: selectedContext.itemId || undefined,
          placeName: selectedContext.placeName || undefined,
          itemType: selectedContext.itemType || undefined,
        },
        adjacentItems: selectedContext.prevItem || selectedContext.nextItem ? {
          prevItem: selectedContext.prevItem,
          nextItem: selectedContext.nextItem,
        } : undefined,
        dayStats: selectedContext.dayStats,
      },
    });
  }, [sendMessage, selectedContext]);

  // 🆕 澄清自由文本输入
  const handleClarificationFreeText = useCallback(async (text: string) => {
    await sendMessage(text);
  }, [sendMessage]);

  // ==================== 人格偏好设置 (P3) ====================
  
  const [hiddenPersonas, setHiddenPersonas] = useState<Set<GuardianPersona>>(() => {
    // 从 localStorage 读取偏好
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nara_hidden_personas');
      if (saved) {
        try {
          return new Set(JSON.parse(saved) as GuardianPersona[]);
        } catch {
          // 忽略解析错误
        }
      }
    }
    return new Set();
  });

  // 切换人格显示
  const togglePersona = useCallback((persona: GuardianPersona) => {
    setHiddenPersonas(prev => {
      const next = new Set(prev);
      if (next.has(persona)) {
        next.delete(persona);
      } else {
        next.add(persona);
      }
      // 保存到 localStorage
      localStorage.setItem('nara_hidden_personas', JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  // ==================== 守护者交互处理 ====================

  // 接受建议
  const handleAcceptSuggestion = useCallback(async (persona: GuardianPersona, suggestionId?: string) => {
    // 发送接受建议的消息
    const personaNames: Record<GuardianPersona, string> = {
      Abu: 'Abu (北极熊)',
      DrDre: 'Dr.Dre (牧羊犬)',
      Neptune: 'Neptune (海獭)',
    };
    await sendMessage(`接受${personaNames[persona]}的建议${suggestionId ? `: ${suggestionId}` : ''}`);
  }, [sendMessage]);

  // 拒绝建议
  const handleRejectSuggestion = useCallback(async (persona: GuardianPersona, reason?: string) => {
    const personaNames: Record<GuardianPersona, string> = {
      Abu: 'Abu (北极熊)',
      DrDre: 'Dr.Dre (牧羊犬)',
      Neptune: 'Neptune (海獭)',
    };
    await sendMessage(`忽略${personaNames[persona]}的建议${reason ? `，原因：${reason}` : ''}`);
  }, [sendMessage]);

  // 忽略警告
  const handleIgnoreWarning = useCallback(async (persona: GuardianPersona) => {
    const personaNames: Record<GuardianPersona, string> = {
      Abu: 'Abu (北极熊)',
      DrDre: 'Dr.Dre (牧羊犬)',
      Neptune: 'Neptune (海獭)',
    };
    await sendMessage(`我了解风险，忽略${personaNames[persona]}的警告`);
  }, [sendMessage]);

  // 确认责任声明
  const handleAcknowledgeDisclaimer = useCallback(() => {
    // 可以发送确认消息或仅在本地记录
    console.log('[TripPlannerAssistant] 用户确认责任声明');
  }, []);

  // 阶段标签
  const phaseLabels: Record<string, string> = {
    OVERVIEW: '概览',
    OPTIMIZING: '优化中',
    DETAILING: '细化中',
    CONSULTING: '咨询中',
    EXECUTING: '执行中',
  };

  return (
    <div className={cn(
      "flex flex-col bg-background border rounded-xl overflow-hidden",
      compact ? "h-[500px]" : "h-full",
      className
    )}>
      {/* 头部 - 当嵌入到 AgentChatSidebar 时不显示，由外层统一处理 */}
      {/* 注意：这个头部现在仅在 compact 模式下显示，避免与 AgentChatSidebar 重复 */}
      {compact && (
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">NARA</h3>
              <p className="text-xs text-muted-foreground">
                {isInitialized ? phaseLabels[currentPhase] || currentPhase : '连接中...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 消息区域 - 支持虚拟滚动 */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4"
      >
        {isVirtualEnabled ? (
          /* 虚拟滚动模式 */
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${startOffset}px)` }}>
              <div className="space-y-4">
                {visibleItems.map(({ item: msg, index: idx }) => (
                  <MeasuredMessageWrapper
                    key={msg.id}
                    messageId={msg.id}
                    onMeasure={measureHeight}
                  >
                    <MessageBubble
                      message={msg}
                      onFollowUpSelect={handleFollowUpSelect}
                      onClarificationSelect={handleClarificationSelect}
                      onClarificationFreeText={handleClarificationFreeText}
                      onAcceptSuggestion={handleAcceptSuggestion}
                      onRejectSuggestion={handleRejectSuggestion}
                      onIgnoreWarning={handleIgnoreWarning}
                      onAcknowledgeDisclaimer={handleAcknowledgeDisclaimer}
                      hiddenPersonas={hiddenPersonas}
                      isLatest={idx === messages.length - 1}
                      isNewMessage={msg.id === newMessageId}
                      loading={loading}
                      itemNameMap={itemNameMap}
                    />
                  </MeasuredMessageWrapper>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* 普通模式 - 消息较少时不启用虚拟滚动 */
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onFollowUpSelect={handleFollowUpSelect}
                onClarificationSelect={handleClarificationSelect}
                onClarificationFreeText={handleClarificationFreeText}
                onAcceptSuggestion={handleAcceptSuggestion}
                onRejectSuggestion={handleRejectSuggestion}
                onIgnoreWarning={handleIgnoreWarning}
                onAcknowledgeDisclaimer={handleAcknowledgeDisclaimer}
                hiddenPersonas={hiddenPersonas}
                isLatest={idx === messages.length - 1}
                isNewMessage={msg.id === newMessageId}
                loading={loading}
                itemNameMap={itemNameMap}
              />
            ))}
          </div>
        )}

        {/* 加载状态 */}
        {loading && <TypingIndicator />}
      </div>

      {/* 待确认修改面板 */}
      {pendingChanges.length > 0 && (
        <div className="px-4 pb-2">
          <PendingChangesPanel
            changes={pendingChanges}
            onConfirm={confirmChanges}
            onReject={rejectChanges}
            loading={loading}
          />
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 输入区域 */}
      <div className="p-4 border-t bg-slate-50/50 space-y-2.5">
        {/* P3: 人格显示偏好设置条 */}
        <PersonaPreferencesBar 
          hiddenPersonas={hiddenPersonas}
          onToggle={togglePersona}
          status={loading ? 'analyzing' : 'standby'}
          hasAnyInsights={messages.some(m => m.personaInsights && m.personaInsights.length > 0)}
        />

        {/* 待处理建议面板 - 支持一键添加到行程 */}
        <PendingSuggestionsPanel
          suggestions={pendingSuggestions}
          onApply={applySuggestion}
          onDismiss={dismissSuggestion}
          loading={loading}
        />

        {/* 上下文状态栏 - 显示当前选中的天/行程项 */}
        <ContextStatusBar
          context={selectedContext}
          onAskAbout={handleSendCommand}
        />

        {/* 快捷命令条 - 输入框上方（智能切换：有上下文时显示上下文命令，无上下文时显示通用命令） */}
        <QuickCommandsBar
          onCommandClick={handleSendCommand}
          disabled={loading || !isInitialized}
          visible={messages.length > 0}
          context={selectedContext}
        />
        
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="输入您的需求，如：帮我优化今天的行程..."
            disabled={loading || !isInitialized}
            className="flex-1 bg-white"
          />
          {/* 撤销按钮 - 只有在有会话时显示 */}
          {sessionId && (
            <Button
              onClick={undoLastChange}
              disabled={loading || !isInitialized}
              variant="outline"
              size="icon"
              title="撤销上一次修改"
              className="flex-shrink-0"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || loading || !isInitialized}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
});

TripPlannerAssistant.displayName = 'TripPlannerAssistant';

export default TripPlannerAssistant;
