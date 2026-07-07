import {
  CalendarClock,
  Clock,
  Footprints,
  GitBranch,
  MapPin,
  Minus,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AttractionExploreItem } from '@/types/attraction-explore';
import { formatDetourMethodLabel } from '@/lib/attraction-explore-route-options.util';
import {
  workbenchAttractionExploreCard,
  workbenchPrimaryAction,
} from '../workbench-ui';

const PHYSICAL_LABEL: Record<'low' | 'medium' | 'high', string> = {
  low: '体力低',
  medium: '体力中',
  high: '体力高',
};

export interface AttractionExploreCardProps {
  item: AttractionExploreItem;
  inCandidates?: boolean;
  addPending?: boolean;
  removePending?: boolean;
  onViewDetails?: (item: AttractionExploreItem) => void;
  onAddToCandidates?: (item: AttractionExploreItem) => void;
  onRemoveFromCandidates?: (item: AttractionExploreItem) => void;
  className?: string;
}

export function AttractionExploreCard({
  item,
  inCandidates = false,
  addPending = false,
  removePending = false,
  onViewDetails,
  onAddToCandidates,
  onRemoveFromCandidates,
  className,
}: AttractionExploreCardProps) {
  return (
    <article className={cn(workbenchAttractionExploreCard, className)}>
      <div className="relative aspect-[16/10] overflow-hidden bg-muted/15">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            暂无图片
          </div>
        )}
        {item.badge ? (
          <Badge className="absolute left-2 top-2 border-0 bg-background/90 text-[10px] font-medium text-foreground shadow-sm">
            {item.badge}
          </Badge>
        ) : null}
        {item.metadata.distanceFromRouteKm != null ? (
          <Badge className="absolute right-2 top-2 border-0 bg-primary text-[10px] font-medium text-primary-foreground">
            距路线 {item.metadata.distanceFromRouteKm}km
          </Badge>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="mb-1 flex flex-wrap items-center gap-1">
          <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
        </div>
        <p className="mb-1 text-[10px] text-muted-foreground">
          {[item.categoryLabel, item.regionLabel].filter(Boolean).join(' · ')}
        </p>
        <p className="mb-3 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
          {item.description}
        </p>

        <div className="mb-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          {item.metadata.stayMinutes ? (
            <Meta icon={Clock} label={`建议 ${item.metadata.stayMinutes} 分钟`} />
          ) : null}
          {item.metadata.detourMinutes != null ? (
            <Meta
              icon={GitBranch}
              label={`+${item.metadata.detourMinutes}min${
                item.metadata.detourMethod
                  ? ` · ${formatDetourMethodLabel(item.metadata.detourMethod)}`
                  : ''
              }`}
            />
          ) : null}
          {item.metadata.physicalLevel ? (
            <Meta icon={Footprints} label={PHYSICAL_LABEL[item.metadata.physicalLevel]} />
          ) : null}
          {item.metadata.bookingRequired ? (
            <Meta icon={CalendarClock} label="需预约" />
          ) : null}
          {!item.metadata.distanceFromRouteKm && item.regionLabel ? (
            <Meta icon={MapPin} label={item.regionLabel} />
          ) : null}
        </div>

        <div className="mt-auto flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 flex-1 rounded-lg text-[11px]"
            onClick={() => onViewDetails?.(item)}
          >
            查看详情
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={
              addPending ||
              removePending ||
              (!inCandidates && !onAddToCandidates) ||
              (inCandidates && !onRemoveFromCandidates)
            }
            variant={inCandidates ? 'outline' : 'default'}
            className={cn(
              'h-8 flex-1 rounded-lg text-[11px]',
              !inCandidates && workbenchPrimaryAction,
            )}
            onClick={() =>
              inCandidates ? onRemoveFromCandidates?.(item) : onAddToCandidates?.(item)
            }
          >
            {inCandidates ? (
              <>
                <Minus className="mr-1 h-3.5 w-3.5" />
                移出候选
              </>
            ) : (
              <>
                <Plus className="mr-1 h-3.5 w-3.5" />
                加入候选
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}

function Meta({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
