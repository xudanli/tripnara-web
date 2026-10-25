import { useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { BedDouble, ChevronDown, ChevronUp, ExternalLink, GitBranch, Star, Users, CloudRain, Package, MapPin, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PlaceImageViewerDialog } from '@/components/plan-studio/PlaceImageViewerDialog';
import { BOOKING_STATUS_LABELS } from '@/lib/itinerary-booking-display.util';
import { canAddParallelActivity } from '@/lib/itinerary-split-participants.util';
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
  /** memberId → 展示名 */
  memberLabelById?: Map<string, string>;
  totalMemberCount?: number;
  onAddParallel?: () => void;
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
  memberLabelById,
  totalMemberCount = 0,
  onAddParallel,
  className,
}: WorkbenchTimelineEntryBodyProps) {
  const [imageError, setImageError] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const images =
    entry.images && entry.images.length > 0
      ? entry.images
      : entry.imageUrl
        ? [{ url: entry.imageUrl }]
        : [];
  const showImage = images.length > 0 && !imageError;
  const showDetail = hasExpandableDetail(entry);
  const participantIds = entry.participantIds ?? [];
  const participantLabels = participantIds
    .map((id) => memberLabelById?.get(id) ?? id)
    .filter(Boolean);
  const showParallel =
    Boolean(onAddParallel) &&
    canAddParallelActivity({
      phase: entry.splitPhase,
      totalMemberCount,
      selectedMemberCount: participantIds.length,
    });
  const remainingCount = Math.max(0, totalMemberCount - participantIds.length);

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
        {entry.productBind?.bound ? (
          <Badge
            variant="outline"
            className="h-4 shrink-0 rounded-full border-primary/40 bg-primary/5 px-1.5 py-0 text-[9px] font-normal text-foreground"
          >
            {entry.productBind.productSessionId || entry.productBind.productOfferingId
              ? '体验·班次'
              : '体验项目'}
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
      {entry.productBind?.bound && entry.productBind.subtitleLines.length > 2 ? (
        <ul className="mt-1 space-y-0.5 text-[10px] text-muted-foreground">
          {entry.productBind.subtitleLines.slice(2).map((line) => (
            <li key={line} className="flex min-w-0 items-start gap-1">
              {line.includes('装备') ? (
                <Package className="mt-0.5 h-3 w-3 shrink-0" />
              ) : line.includes('取消') ? (
                <Clock3 className="mt-0.5 h-3 w-3 shrink-0" />
              ) : line.includes('天气') || line.includes('Plan B') ? (
                <CloudRain className="mt-0.5 h-3 w-3 shrink-0" />
              ) : line.includes('集合') ? (
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              ) : null}
              <span className="min-w-0 leading-snug">{line}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {participantLabels.length > 0 ? (
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">
          <Users className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {participantLabels.slice(0, 3).join('、')}
            {participantLabels.length > 3 ? ` 等 ${participantLabels.length} 人` : ''}
          </span>
        </p>
      ) : null}
      {entry.bookingStatus ? (
        <div className="mt-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    'h-4 max-w-full cursor-pointer truncate rounded-full px-1.5 py-0 text-[9px] font-normal',
                    BOOKING_STATUS_LABELS[entry.bookingStatus]?.color,
                  )}
                >
                  {BOOKING_STATUS_LABELS[entry.bookingStatus]?.icon}{' '}
                  {BOOKING_STATUS_LABELS[entry.bookingStatus]?.label}
                  {entry.bookingConfirmation
                    ? ` · ${entry.bookingConfirmation}`
                    : ''}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <div>状态: {BOOKING_STATUS_LABELS[entry.bookingStatus]?.label}</div>
                  {entry.bookingConfirmation ? (
                    <div>确认号: {entry.bookingConfirmation}</div>
                  ) : null}
                  {entry.bookedAt ? (
                    <div>
                      预订时间: {format(new Date(entry.bookedAt), 'yyyy-MM-dd HH:mm')}
                    </div>
                  ) : null}
                  {entry.bookingUrl ? (
                    <a
                      href={entry.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(workbenchLinkClass, 'flex items-center gap-1')}
                    >
                      <ExternalLink className="h-3 w-3" /> 查看预订
                    </a>
                  ) : null}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ) : null}
      {entry.address ? (
        <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground/90">{entry.address}</p>
      ) : null}
    </>
  );

  const parallelBlock = showParallel ? (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="mt-1 h-6 px-1.5 text-[10px] text-primary hover:text-primary"
      onClick={() => onAddParallel?.()}
    >
      <GitBranch className="mr-1 h-3 w-3" />
      添加并行活动（剩 {remainingCount} 人）
    </Button>
  ) : null;

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
          <button
            type="button"
            className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={(event) => {
              event.stopPropagation();
              setImageViewerOpen(true);
            }}
            aria-label={
              images.length > 1
                ? `查看 ${entry.title} 的 ${images.length} 张图片`
                : `查看 ${entry.title} 的图片`
            }
            title={images.length > 1 ? `共 ${images.length} 张，点击查看` : '点击查看大图'}
          >
            <img
              src={images[0]?.url}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
            {images.length > 1 ? (
              <span className="absolute bottom-0 right-0 rounded-tl bg-black/65 px-1 py-px text-[9px] leading-none text-white">
                {images.length}
              </span>
            ) : null}
          </button>
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
          {parallelBlock}
        </div>
        {trailing ? <div className="flex shrink-0 items-center gap-0.5">{trailing}</div> : null}
      </div>
      {detailBlock}
      <PlaceImageViewerDialog
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
        images={images}
        initialIndex={0}
        title={entry.title}
      />
    </div>
  );
}
