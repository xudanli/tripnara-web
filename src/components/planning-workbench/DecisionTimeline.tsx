/**
 * DecisionTimeline - 决策日志时间线组件
 * 
 * 以时间线形式展示决策演进历史
 * 设计原则：Evidence is the aesthetic - 证据就是美学
 */
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  ChevronDown, 
  ChevronUp,
  Shield, 
  Activity, 
  Wrench,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface DecisionLogEntry {
  id: string;
  timestamp: string;
  persona?: 'ABU' | 'DR_DRE' | 'NEPTUNE' | 'SYSTEM';
  action: string;
  verdict?: 'ALLOW' | 'NEED_CONFIRM' | 'NEED_ADJUST' | 'REJECT' | 'SUGGEST_REPLACE';
  reason?: string;
  evidenceRefs?: string[];
  planVersion?: number;
}

export interface DecisionTimelineProps {
  /** 决策日志条目 */
  entries: DecisionLogEntry[];
  /** 默认显示条数 */
  defaultVisibleCount?: number;
  /** 自定义类名 */
  className?: string;
  /** 点击证据引用时的回调 */
  onEvidenceClick?: (evidenceRef: string) => void;
}

// 人格配置
const PERSONA_CONFIG = {
  ABU: {
    icon: Shield,
    label: 'Abu',
    slogan: '安全与现实守门',
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-100',
    borderClass: 'border-blue-300',
  },
  DR_DRE: {
    icon: Activity,
    label: 'Dr.Dre',
    slogan: '节奏与体感',
    colorClass: 'text-green-600',
    bgClass: 'bg-green-100',
    borderClass: 'border-green-300',
  },
  NEPTUNE: {
    icon: Wrench,
    label: 'Neptune',
    slogan: '空间结构修复',
    colorClass: 'text-purple-600',
    bgClass: 'bg-purple-100',
    borderClass: 'border-purple-300',
  },
  SYSTEM: {
    icon: FileText,
    label: '系统',
    slogan: '自动处理',
    colorClass: 'text-gray-600',
    bgClass: 'bg-gray-100',
    borderClass: 'border-gray-300',
  },
};

// 裁决配置
const VERDICT_CONFIG = {
  ALLOW: {
    icon: CheckCircle2,
    label: '通过',
    colorClass: 'text-green-600',
    bgClass: 'bg-green-100',
    variant: 'default' as const,
  },
  NEED_CONFIRM: {
    icon: AlertTriangle,
    label: '需确认',
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-100',
    variant: 'secondary' as const,
  },
  NEED_ADJUST: {
    icon: AlertTriangle,
    label: '需调整',
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-100',
    variant: 'secondary' as const,
  },
  SUGGEST_REPLACE: {
    icon: Wrench,
    label: '建议替换',
    colorClass: 'text-purple-600',
    bgClass: 'bg-purple-100',
    variant: 'outline' as const,
  },
  REJECT: {
    icon: XCircle,
    label: '拒绝',
    colorClass: 'text-red-600',
    bgClass: 'bg-red-100',
    variant: 'destructive' as const,
  },
};

function DecisionTimelineEntry({ 
  entry, 
  isLast,
  onEvidenceClick 
}: { 
  entry: DecisionLogEntry; 
  isLast: boolean;
  onEvidenceClick?: (evidenceRef: string) => void;
}) {
  const persona = entry.persona ? PERSONA_CONFIG[entry.persona] : PERSONA_CONFIG.SYSTEM;
  const verdict = entry.verdict ? VERDICT_CONFIG[entry.verdict] : null;
  const PersonaIcon = persona.icon;
  const VerdictIcon = verdict?.icon;

  // 格式化时间
  const formattedTime = useMemo(() => {
    try {
      const date = new Date(entry.timestamp);
      return format(date, 'HH:mm', { locale: zhCN });
    } catch {
      return '--:--';
    }
  }, [entry.timestamp]);

  const formattedDate = useMemo(() => {
    try {
      const date = new Date(entry.timestamp);
      return format(date, 'MM/dd', { locale: zhCN });
    } catch {
      return '--/--';
    }
  }, [entry.timestamp]);

  return (
    <div className="relative pl-6 pb-6">
      {/* 时间线 */}
      {!isLast && (
        <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-border" />
      )}
      
      {/* 时间点标记 */}
      <div className={cn(
        'absolute left-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center',
        'bg-background',
        persona.borderClass
      )}>
        <PersonaIcon className={cn('w-2.5 h-2.5', persona.colorClass)} />
      </div>

      {/* 内容区域 */}
      <div className="space-y-1">
        {/* 头部：时间 + 人格 + 裁决 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-mono">
            {formattedDate} {formattedTime}
          </span>
          <Badge variant="outline" className={cn('text-xs py-0', persona.bgClass, persona.colorClass)}>
            {persona.label}
          </Badge>
          {verdict && (
            <Badge variant={verdict.variant} className="text-xs py-0">
              {VerdictIcon && <VerdictIcon className="w-3 h-3 mr-1" />}
              {verdict.label}
            </Badge>
          )}
          {entry.planVersion && (
            <span className="text-xs text-muted-foreground">
              v{entry.planVersion}
            </span>
          )}
        </div>

        {/* 动作描述 */}
        <p className="text-sm font-medium">{entry.action}</p>

        {/* 原因说明 */}
        {entry.reason && (
          <p className="text-xs text-muted-foreground">{entry.reason}</p>
        )}

        {/* 证据引用 */}
        {entry.evidenceRefs && entry.evidenceRefs.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mt-1">
            <span className="text-xs text-muted-foreground">证据：</span>
            {entry.evidenceRefs.map((ref, index) => (
              <button
                key={index}
                onClick={() => onEvidenceClick?.(ref)}
                className="text-xs text-primary hover:underline"
              >
                [{index + 1}]
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function DecisionTimeline({
  entries,
  defaultVisibleCount = 5,
  className,
  onEvidenceClick,
}: DecisionTimelineProps) {
  const [showAll, setShowAll] = useState(false);

  // 按时间倒序排列
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [entries]);

  const visibleEntries = showAll 
    ? sortedEntries 
    : sortedEntries.slice(0, defaultVisibleCount);
  
  const hasMore = sortedEntries.length > defaultVisibleCount;

  if (entries.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">暂无决策记录</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold">决策演进历史</h4>
        <span className="text-xs text-muted-foreground">
          共 {entries.length} 条记录
        </span>
      </div>

      {/* 时间线列表 */}
      <div className="relative">
        {visibleEntries.map((entry, index) => (
          <DecisionTimelineEntry
            key={entry.id}
            entry={entry}
            isLast={index === visibleEntries.length - 1}
            onEvidenceClick={onEvidenceClick}
          />
        ))}
      </div>

      {/* 展开/收起按钮 */}
      {hasMore && (
        <Collapsible open={showAll} onOpenChange={setShowAll}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full mt-2">
              {showAll ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  收起
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  查看更多历史 ({sortedEntries.length - defaultVisibleCount} 条)
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      )}
    </div>
  );
}

export default DecisionTimeline;
