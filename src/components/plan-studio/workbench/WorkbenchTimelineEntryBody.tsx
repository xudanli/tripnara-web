import { useState, type ReactNode } from 'react';
import { BedDouble, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { WorkbenchTimelineEntry } from './useWorkbenchItineraryData';
import {
  workbenchHighlightStarIcon,
  workbenchLinkClass,
  workbenchSplitGroupLabelBadge,
} from './workbench-ui';

export interface WorkbenchTimelineEntryBodyProps {
  entry: WorkbenchTimelineEntry;
  selected?: boolean;
  onSelect?: () => void;
  /** 标题行右侧操作区（锁定/编辑等），详情展开后占满整行宽度 */
  trailing?: ReactNode;
  className?: string;
}

function hasExpandableDetail(entry: WorkbenchTimelineEntry): boolean {
  const detail = entry.detail;
  if (!detail) return false;
  return Boolean(
    detail.description ||
      detail.phone ||
      detail.website ||
      (detail.tags && detail.tags.length > 0),
  );
}

/** 工作台时间轴条目：缩略图 + 类型徽章 + 标题/副标题 + 内联详情 */
export function WorkbenchTimelineEntryBody({
  entry,
  selected = false,
  onSelect,
  trailing,
  className,
}: WorkbenchTimelineEntryBodyProps) {
  const [imageError, setImageError] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const showImage = entry.imageUrl && !imageError;
  const showDetail = hasExpandableDetail(entry);

  const headerBlock = (
    <>
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {entry.typeEmoji && entry.typeLabel ? (
          <Badge
            variant="outline"
            className="h-4 shrink-0 rounded-full px-1.5 py-0 text-[9px] font-normal"
          >
            {entry.typeEmoji} {entry.typeLabel}
          </Badge>
        ) : null}
        {entry.isLodging ? (
          <Badge
            variant="outline"
            className="h-4 shrink-0 rounded-full border-gate-allow-border/60 bg-gate-allow/10 px-1.5 py-0 text-[9px] font-normal text-gate-allow-foreground"
          >
            <BedDouble className="mr-0.5 inline h-2.5 w-2.5" />
            当晚住宿
          </Badge>
        ) : null}
        <span className="min-w-0 text-xs font-medium leading-snug text-foreground break-words">
          {entry.title}
        </span>
        {entry.splitGroupLabel ? (
          <Badge
            variant="outline"
            className={cn(
              'rounded-full px-1.5 py-0 text-[10px] font-normal',
              workbenchSplitGroupLabelBadge,
            )}
          >
            {entry.splitGroupLabel}
            {entry.splitPhaseLabel ? ` · ${entry.splitPhaseLabel}` : ''}
          </Badge>
        ) : null}
        {entry.highlight ? (
          <Star className={cn('h-3 w-3 shrink-0', workbenchHighlightStarIcon)} />
        ) : null}
      </div>
      {entry.subtitle ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{entry.subtitle}</p>
      ) : null}
      {entry.address ? (
        <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground/90">{entry.address}</p>
      ) : null}
    </>
  );

  const detailBlock = showDetail ? (
    <Collapsible open={detailsExpanded} onOpenChange={setDetailsExpanded}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 h-6 w-full justify-start px-0 text-[10px] text-muted-foreground hover:text-foreground"
        >
          {detailsExpanded ? (
            <>
              收起详情
              <ChevronUp className="ml-1 h-3 w-3" />
            </>
          ) : (
            <>
              查看详情
              <ChevronDown className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 space-y-2 border-t border-dashed border-border/60 pt-2 text-xs">
          {entry.detail?.description ? (
            <p className="w-full text-[11px] leading-relaxed text-muted-foreground">
              {entry.detail.description}
            </p>
          ) : null}
          {entry.detail?.phone || entry.detail?.website ? (
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
              {entry.detail.phone ? <span>📞 {entry.detail.phone}</span> : null}
              {entry.detail.website ? (
                <a
                  href={entry.detail.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={workbenchLinkClass}
                >
                  🔗 官网
                </a>
              ) : null}
            </div>
          ) : null}
          {entry.detail?.tags && entry.detail.tags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              {entry.detail.tags.map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="px-1.5 py-0 text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  ) : null;

  return (
    <div className={cn('min-w-0 w-full', className)}>
      <div className="flex min-w-0 items-start gap-2">
        {showImage ? (
          <img
            src={entry.imageUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-md border border-border/50 object-cover"
            onError={() => setImageError(true)}
          />
        ) : entry.isLodging ? (
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gate-allow-border/50 bg-gate-allow/10 text-gate-allow-foreground">
            <BedDouble className="h-4 w-4" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          {onSelect ? (
            <button
              type="button"
              className={cn('w-full text-left', selected && 'outline-none')}
              onClick={onSelect}
            >
              {headerBlock}
            </button>
          ) : (
            headerBlock
          )}
        </div>
        {trailing ? <div className="flex shrink-0 items-center gap-0.5">{trailing}</div> : null}
      </div>
      {detailBlock}
    </div>
  );
}
