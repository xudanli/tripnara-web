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
} from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface ResponseBlockRendererProps {
  block: PlannerResponseBlock;
  className?: string;
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
 */
function SummaryCardBlock({ summary, className }: { summary: PlannerResponseBlock['summary']; className?: string }) {
  if (!summary) return null;
  
  return (
    <Card className={cn(
      "w-full border border-slate-200 bg-slate-50/50 mb-3",
      className
    )}>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* 目的地 */}
          {summary.destination && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-slate-800">{summary.destination}</span>
            </div>
          )}
          
          {/* 天数 */}
          {summary.duration && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-slate-700">{summary.duration}</span>
            </div>
          )}
          
          {/* 同行人 */}
          {summary.travelers && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-slate-700">{summary.travelers}</span>
            </div>
          )}
          
          {/* 预算 */}
          {summary.budget && (
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-slate-700">
                {formatCurrency(summary.budget.amount, summary.budget.currency || 'CNY')}
              </span>
            </div>
          )}
        </div>
        
        {/* 预算明细 */}
        {summary.budget?.details && summary.budget.details.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-muted-foreground mb-1.5">预算包含：</p>
            <div className="flex flex-wrap gap-1.5">
              {summary.budget.details.map((detail, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {detail}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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
 * 问题卡片占位符（实际渲染由父组件处理）
 */
function QuestionCardPlaceholder({ questionId, className }: { questionId?: string; className?: string }) {
  // 这个占位符只是标记位置，实际的问题卡片会在父组件中渲染
  return null;
}

/**
 * 主渲染器组件
 */
export function ResponseBlockRenderer({ block, className }: ResponseBlockRendererProps) {
  switch (block.type) {
    case 'paragraph':
      return block.content ? (
        <ParagraphBlock content={block.content} className={className} />
      ) : null;
      
    case 'heading':
      return block.text ? (
        <HeadingBlock level={block.level} text={block.text} className={className} />
      ) : null;
      
    case 'list':
      return (
        <ListBlock 
          title={block.title} 
          items={block.items} 
          ordered={block.ordered}
          className={className}
        />
      );
      
    case 'summary_card':
      return (
        <SummaryCardBlock summary={block.summary} className={className} />
      );
      
    case 'question_card':
      // 问题卡片由父组件统一处理，这里只返回占位符
      return <QuestionCardPlaceholder questionId={block.questionId} className={className} />;
      
    case 'highlight':
      return (
        <HighlightBlock 
          highlightText={block.highlightText} 
          highlightType={block.highlightType}
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
      
    default:
      return null;
  }
}
