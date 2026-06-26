/**
 * 结构化消息内容块渲染器
 * 
 * 根据 PlannerResponseBlock 类型动态渲染不同的内容块
 * 遵循 TripNARA 设计原则：Clarity over Charm, Evidence is the aesthetic
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlannerResponseBlock } from '@/types/trip';
import { 
  MapPin, 
  Calendar, 
  Users, 
  Wallet, 
  Info, 
  AlertTriangle, 
  CheckCircle2,
  Route,
  Clock,
  Lightbulb,
} from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import Logo from '@/components/common/Logo';

interface ResponseBlockRendererProps {
  block: PlannerResponseBlock;
  /** 同条消息的全部块，用于从列表块提取人数补充到摘要卡片 */
  allBlocks?: PlannerResponseBlock[];
  className?: string;
}

/** 从列表块中提取 "出行人数 X人" 文本，用于补充 summary_card 的 travelers */
function extractTravelersFromBlocks(blocks?: PlannerResponseBlock[]): string | null {
  if (!blocks?.length) return null;
  for (const b of blocks) {
    if (b.type === 'list' && Array.isArray(b.items)) {
      const found = b.items.find(
        (item) => typeof item === 'string' && /出行人数\s*.+/.test(item)
      );
      if (found && typeof found === 'string') {
        const m = found.match(/出行人数\s*(\S+)/);
        return m ? m[1] : found;
      }
    }
  }
  return null;
}

/** 是否为与 summary_card 重复的行程概览列表（保留上面的卡片，跳过此列表） */
function isDuplicateItineraryList(block: PlannerResponseBlock): boolean {
  if (block.type !== 'list') return false;
  const t = (block.title || '').trim();
  return t === '当前行程概览' || t === '已确认信息';
}

/**
 * 段落块渲染
 */
function ParagraphBlock({ content, className }: { content: string; className?: string }) {
  return (
    <p className={cn("text-sm leading-relaxed text-slate-700 mb-3", className)}>
      {content}
    </p>
  );
}

/**
 * 标题块渲染
 */
function HeadingBlock({ level, text, className }: { level?: 1 | 2 | 3; text?: string; className?: string }) {
  if (!text) return null;
  
  const baseClasses = "font-semibold text-slate-800 mb-2";
  const levelClasses = {
    1: "text-base mt-4 mb-2",
    2: "text-sm mt-3 mb-1.5",
    3: "text-sm mt-2 mb-1",
  };
  
  const Tag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
  
  return (
    <Tag className={cn(baseClasses, levelClasses[level || 2], className)}>
      {text}
    </Tag>
  );
}

/**
 * 列表块渲染
 */
function ListBlock({ 
  title, 
  items, 
  ordered, 
  className 
}: { 
  title?: string; 
  items?: string[]; 
  ordered?: boolean; 
  className?: string;
}) {
  if (!items || items.length === 0) return null;
  
  const ListTag = ordered ? 'ol' : 'ul';
  const listStyle = ordered ? 'list-decimal list-inside' : 'list-disc list-inside';
  
  return (
    <div className={cn("mb-3", className)}>
      {title && (
        <p className="text-sm font-medium text-slate-700 mb-2">{title}</p>
      )}
      <ListTag className={cn("text-sm leading-relaxed text-slate-700 space-y-1.5 ml-4", listStyle)}>
        {items.map((item, idx) => (
          <li key={idx} className="pl-1">
            {item}
          </li>
        ))}
      </ListTag>
    </div>
  );
}

/**
 * 摘要卡片渲染
 * 当 summary.travelers 缺失或为「未指定」时，从同消息的列表块中提取出行人数
 */
function SummaryCardBlock({ 
  summary, 
  travelersFallback,
  className 
}: { 
  summary: PlannerResponseBlock['summary']; 
  travelersFallback?: string | null;
  className?: string;
}) {
  if (!summary) return null;
  const travelersDisplay = summary.travelers && summary.travelers !== '未指定' 
    ? summary.travelers 
    : (travelersFallback || summary.travelers);
  // 优先使用预格式化字符串 dayAllocationDisplay
  const dayAllocationText = summary.dayAllocationDisplay
    ?? (Array.isArray(summary.dayAllocation)
      ? summary.dayAllocation?.map(a => `${a.city} ${a.days} 天`).join('、')
      : summary.dayAllocation && typeof summary.dayAllocation === 'object' && !Array.isArray(summary.dayAllocation) && Object.keys(summary.dayAllocation).length > 0
        ? Object.entries(summary.dayAllocation).map(([city, days]) => `${city} ${days} 天`).join('、')
        : null);

  return (
    <div className={cn("w-full mb-3", className)}>
      {/* Logo 压在卡片边框上，左侧，无边框 */}
      <div className="flex justify-start pl-4 -mb-7 relative z-10">
        <Logo variant="icon" size={64} className="opacity-95" />
      </div>
      <Card className={cn(
        "w-full border border-slate-200 bg-transparent overflow-visible",
        "rounded-xl shadow-sm"
      )}>
        <CardContent className="p-6 pt-10 pl-8">
          {/* 标题区 */}
          <div className="mb-5 -mt-4">
            <h3 className="text-base font-bold text-slate-900">行程信息</h3>
            <p className="text-xs text-slate-500 mt-1">您的旅程将从这里开始</p>
          </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          {summary.destination && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-500">目的地</span>
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="text-slate-800">{summary.destination}</span>
              </div>
            </div>
          )}
          {(summary.startDate || summary.duration) && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-500">出行时间</span>
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="text-slate-800">
                  {summary.startDate
                    ? new Date(summary.startDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
                    : summary.duration}
                </span>
              </div>
            </div>
          )}
          {summary.endDate && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-500">返程时间</span>
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="text-slate-800">
                  {new Date(summary.endDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>
          )}
          {travelersDisplay && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-500">出行人数</span>
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="text-slate-800">{travelersDisplay}</span>
              </div>
            </div>
          )}
          {summary.budget && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-500">预算</span>
              <div className="flex items-center gap-2.5">
                <Wallet className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="text-slate-800">
                  {formatCurrency(summary.budget.amount, summary.budget.currency || 'CNY')}
                </span>
              </div>
            </div>
          )}
          {dayAllocationText ? (
            <div className="flex flex-col gap-0.5 col-span-2">
              <span className="text-xs text-slate-500">天数分配</span>
              <div className="flex items-center gap-2.5 flex-wrap">
                <Route className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="text-slate-800">{dayAllocationText}</span>
              </div>
            </div>
          ) : null}
          {summary.mustHavePois && summary.mustHavePois.length > 0 && (
            <div className="flex flex-col gap-0.5 col-span-2">
              <span className="text-xs text-slate-500">必含景点</span>
              <div className="flex items-center gap-2.5 flex-wrap">
                <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="text-slate-800">
                  {summary.mustHavePois.join('、')}
                </span>
              </div>
            </div>
          )}
        </div>
        {summary.budget?.details && summary.budget.details.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-2">预算包含：</p>
            <div className="flex flex-wrap gap-2">
              {summary.budget.details.map((detail, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {detail}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {/* 城市天数分配：杭州 3 天、千岛湖 1 天，优先使用 dayAllocationDisplay */}
        {dayAllocationText ? (
          <div className="mt-5 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-2">行程分配</p>
            <p className="text-sm text-slate-800">{dayAllocationText}</p>
          </div>
        ) : null}
        {/* 必含景点 */}
        {summary.mustHavePois && summary.mustHavePois.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-2">必含景点</p>
            <div className="flex flex-wrap gap-2">
              {summary.mustHavePois.map((poi, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {poi}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

/**
 * 高亮块渲染
 */
function HighlightBlock({ 
  highlightText, 
  highlightType, 
  className 
}: { 
  highlightText?: string; 
  highlightType?: 'info' | 'warning' | 'success';
  className?: string;
}) {
  if (!highlightText) return null;
  
  const typeConfig = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      icon: Info,
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      icon: AlertTriangle,
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      icon: CheckCircle2,
    },
  };
  
  const config = typeConfig[highlightType || 'info'];
  const Icon = config.icon;
  
  return (
    <div className={cn(
      "rounded-lg border p-3 mb-3 flex items-start gap-2",
      config.bg,
      config.border,
      className
    )}>
      <Icon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", config.text)} />
      <p className={cn("text-sm leading-relaxed", config.text)}>
        {highlightText}
      </p>
    </div>
  );
}

/**
 * 预算摘要块渲染
 */
function BudgetSummaryBlock({ budget, className }: { budget: PlannerResponseBlock['budget']; className?: string }) {
  if (!budget) return null;
  
  return (
    <Card className={cn("w-full border border-slate-200 bg-slate-50/50 mb-3", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          预算概览
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-lg font-semibold text-slate-800">
          {formatCurrency(budget.estimatedAmount, budget.currency || 'CNY')}
        </div>
        <div className="text-xs text-muted-foreground">
          {budget.duration} · {budget.travelers}
        </div>
        
        {/* 预算明细 */}
        {budget.breakdown && budget.breakdown.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-slate-200">
            {budget.breakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{item.category}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">
                    {formatCurrency(item.amount, budget.currency || 'CNY')}
                  </span>
                  {item.percentage !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      {item.percentage}%
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 行程概览块渲染
 */
function ItineraryOverviewBlock({ itinerary, className }: { itinerary: PlannerResponseBlock['itinerary']; className?: string }) {
  if (!itinerary) return null;
  
  return (
    <Card className={cn("w-full border border-slate-200 bg-slate-50/50 mb-3", className)}>
      <CardContent className="p-4 space-y-3">
        {itinerary.theme && (
          <div className="flex items-start gap-2">
            <Route className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-800 mb-1">行程主题</p>
              <p className="text-sm text-slate-700">{itinerary.theme}</p>
            </div>
          </div>
        )}
        
        {itinerary.route && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-800 mb-1">路线安排</p>
              <p className="text-sm text-slate-700">{itinerary.route}</p>
            </div>
          </div>
        )}
        
        {itinerary.dailyStructure && (
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-800 mb-1">每日结构</p>
              <p className="text-sm text-slate-700">{itinerary.dailyStructure}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 为什么推荐块（体验兑现系统 why_recommended）
 */
function WhyRecommendedBlock({ block, className }: { block: PlannerResponseBlock; className?: string }) {
  const bullets = Array.isArray(block.bullets) ? block.bullets : [];
  if (!bullets.length && !block.overallSummary) return null;

  const changingFactors = block.dimensions?.changingFactors;
  const factorList = Array.isArray(changingFactors)
    ? changingFactors
    : typeof changingFactors === 'string'
      ? [changingFactors]
      : [];

  return (
    <Card className={cn('w-full border border-blue-100 bg-blue-50/30 mb-3', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-blue-600" />
          {block.title ?? '为什么推荐这样安排'}
        </CardTitle>
        {(block.overallLabel || block.overallSummary) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {block.overallLabel && (
              <Badge variant="outline" className="text-xs border-blue-200 bg-white text-blue-800">
                {block.overallLabel}
              </Badge>
            )}
            {block.overallSummary && (
              <p className="text-xs text-muted-foreground">{block.overallSummary}</p>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {bullets.length > 0 && (
          <ul className="space-y-1.5">
            {bullets.map((line, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}
        {block.dimensions && (
          <div className="space-y-1.5 text-xs text-muted-foreground border-t pt-2">
            {block.dimensions.routeFeasibility && (
              <p>{block.dimensions.routeFeasibility}</p>
            )}
            {block.dimensions.experienceMatch && (
              <p>{block.dimensions.experienceMatch}</p>
            )}
            {factorList.map((f, i) => (
              <p key={i}>{f}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 问题卡片占位符（实际渲染由父组件处理）
 */
function QuestionCardPlaceholder(_props: { questionId?: string; className?: string }) {
  // 这个占位符只是标记位置，实际的问题卡片会在父组件中渲染
  return null;
}

/**
 * 主渲染器组件
 */
export function ResponseBlockRenderer({ block, allBlocks, className }: ResponseBlockRendererProps) {
  switch (block.type) {
    case 'paragraph':
      const content = block.content ?? '';
      return content ? (
        <ParagraphBlock content={content} className={className} />
      ) : null;
      
    case 'heading':
      return block.text ? (
        <HeadingBlock level={block.level} text={block.text} className={className} />
      ) : null;
      
    case 'list':
      if (isDuplicateItineraryList(block)) return null;
      return (
        <ListBlock 
          title={block.title} 
          items={Array.isArray(block.items) ? block.items : []}
          ordered={block.ordered}
          className={className}
        />
      );
      
    case 'summary_card':
      return (
        <SummaryCardBlock 
          summary={block.summary} 
          travelersFallback={extractTravelersFromBlocks(allBlocks)}
          className={className} 
        />
      );
      
    case 'question_card':
      // 问题卡片由父组件统一处理，这里只返回占位符
      return <QuestionCardPlaceholder questionId={block.questionId} className={className} />;
      
    case 'highlight':
      return (
        <HighlightBlock 
          highlightText={block.highlightText ?? ''}
          highlightType={block.highlightType ?? 'info'}
          className={className}
        />
      );
      
    case 'budget_summary':
      return (
        <BudgetSummaryBlock budget={block.budget} className={className} />
      );
      
    case 'itinerary_overview':
      return (
        <ItineraryOverviewBlock itinerary={block.itinerary} className={className} />
      );

    case 'why_recommended':
      return <WhyRecommendedBlock block={block} className={className} />;
      
    default:
      return null;
  }
}
