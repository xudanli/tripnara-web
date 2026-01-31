/**
 * 证据节点组件
 * 显示证据引用的卡片
 * 
 * 视觉策略：像"研究/审计工具"而不是"资讯流"
 * 必须可视化：来源、时间戳、可信度、引用位置
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Paperclip, ExternalLink, Clock, User } from 'lucide-react';
import type { EvidenceRef } from '@/types/decision-draft';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface EvidenceNodeProps {
  evidence: EvidenceRef;
  selected?: boolean;
  onClick?: () => void;
}

export default function EvidenceNode({
  evidence,
  selected = false,
  onClick,
}: EvidenceNodeProps) {
  return (
    <Card
      className={cn(
        'w-[180px] cursor-pointer transition-all hover:shadow-md border-l-2 border-l-muted-foreground/20',
        selected && 'ring-2 ring-primary border-l-primary'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          <Paperclip className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xs font-semibold line-clamp-2">
              {evidence.source_title}
            </CardTitle>
            {/* 发布者 */}
            {evidence.publisher && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                <span className="truncate">{evidence.publisher}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {/* 时间戳（审计工具风格） */}
        {(evidence.published_at || evidence.retrieved_at) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              {evidence.published_at
                ? format(new Date(evidence.published_at), 'yyyy-MM-dd')
                : evidence.retrieved_at
                ? format(new Date(evidence.retrieved_at), 'yyyy-MM-dd')
                : ''}
            </span>
          </div>
        )}

        {/* 相关性 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">相关性</span>
            <span className="font-medium">{Math.round(evidence.relevance * 100)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${evidence.relevance * 100}%` }}
            />
          </div>
        </div>

        {/* 置信度 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">置信度</span>
            <span className="font-medium">{Math.round(evidence.confidence * 100)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/80 transition-all"
              style={{ width: `${evidence.confidence * 100}%` }}
            />
          </div>
        </div>

        {/* 摘要 */}
        {evidence.excerpt && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-2 pt-2 border-t">
            {evidence.excerpt}
          </p>
        )}

        {/* 来源链接 */}
        {evidence.source_url && (
          <a
            href={evidence.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
          >
            <ExternalLink className="w-3 h-3" />
            <span>查看来源</span>
          </a>
        )}
      </CardContent>
    </Card>
  );
}
