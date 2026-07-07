import { format } from 'date-fns';
import {
  Calendar,
  ChevronRight,
  MapPin,
  MoreHorizontal,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  getTripListDisplayStatusClasses,
  getTripListDisplayStatusLabel,
  resolveTripDurationDays,
  resolveTripListCardMetrics,
  resolveTripListDisplayStatus,
  resolveTripListTitle,
  resolveTripCoverImageUrl,
  resolveTripMemberCount,
  resolveTripMemberAvatars,
} from '@/lib/trip-list.util';
import { resolveTripPlanningAvailability, getTripPlanningAvailabilityLabel } from '@/lib/trip-content-mode';
import type { TripListItem } from '@/types/trip';
import { tripListUi } from './trip-list-ui';

function MemberAvatarStack({
  count,
  avatars,
}: {
  count: number;
  avatars: Array<{ userId?: string; name?: string; avatarUrl?: string | null }>;
}) {
  if (avatars.length > 0) {
    const shown = avatars.slice(0, 3);
    const extra = count > shown.length ? count - shown.length : 0;
    return (
      <div className="flex items-center -space-x-1.5">
        {shown.map((member, i) => {
          const initial = member.name?.trim()?.charAt(0)?.toUpperCase() || String.fromCharCode(65 + i);
          return member.avatarUrl ? (
            <img
              key={member.userId ?? `${member.name}-${i}`}
              src={member.avatarUrl}
              alt=""
              className="h-5 w-5 rounded-full border border-card object-cover bg-muted"
            />
          ) : (
            <div
              key={member.userId ?? `${member.name}-${i}`}
              className="h-5 w-5 rounded-full border border-card bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground"
            >
              {initial}
            </div>
          );
        })}
        {extra > 0 ? (
          <div className="h-5 w-5 rounded-full border border-card bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
            +{extra}
          </div>
        ) : null}
      </div>
    );
  }

  if (count <= 1) {
    return <span className="text-[10px] text-muted-foreground">{count} 人</span>;
  }

  const shown = Math.min(count, 3);
  const extra = count > 3 ? count - 3 : 0;

  return (
    <div className="flex items-center -space-x-1.5">
      {Array.from({ length: shown }).map((_, i) => (
        <div
          key={i}
          className="h-5 w-5 rounded-full border border-card bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground"
        >
          {String.fromCharCode(65 + i)}
        </div>
      ))}
      {extra > 0 ? (
        <div className="h-5 w-5 rounded-full border border-card bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
          +{extra}
        </div>
      ) : null}
    </div>
  );
}

interface TripListCardProps {
  trip: TripListItem;
  countryName: string;
  countryCoverImageUrl?: string | null;
  checking?: boolean;
  onOpen: (tripId: string) => void;
  onShare?: (tripId: string, e: React.MouseEvent) => void;
  onCollaborate?: (tripId: string, e: React.MouseEvent) => void;
  onRefresh?: (tripId: string, e: React.MouseEvent) => void;
  onSetCover?: (tripId: string, e: React.MouseEvent) => void;
}

export default function TripListCard({
  trip,
  countryName,
  countryCoverImageUrl,
  checking = false,
  onOpen,
  onShare,
  onCollaborate,
  onRefresh,
  onSetCover,
}: TripListCardProps) {
  const displayStatus = resolveTripListDisplayStatus(trip);
  const planningAvailability = resolveTripPlanningAvailability(trip);
  const isUnavailable = planningAvailability !== 'ready';
  const title = resolveTripListTitle(trip, countryName);
  const coverUrl = resolveTripCoverImageUrl(trip, { countryCoverImageUrl });
  const durationDays = resolveTripDurationDays(trip);
  const memberCount = resolveTripMemberCount(trip);
  const memberAvatars = resolveTripMemberAvatars(trip);
  const metrics = resolveTripListCardMetrics(trip);

  const dateRange =
    trip.startDate && trip.endDate
      ? `${format(new Date(trip.startDate), 'MM-dd')} → ${format(new Date(trip.endDate), 'MM-dd')}`
      : '日期待定';

  return (
    <article
      className={cn(
        tripListUi.card,
        tripListUi.cardHover,
        isUnavailable ? 'opacity-90' : 'cursor-pointer',
      )}
      onClick={() => !checking && onOpen(trip.id)}
    >
      <div className={cn(tripListUi.imageArea, !coverUrl && tripListUi.imagePlaceholder)}>
        {coverUrl ? (
          <img src={coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2">
            <MapPin className="w-5 h-5 text-muted-foreground/40" />
            <span className="text-[10px] text-muted-foreground/50 truncate max-w-[80%]">
              {countryName || trip.destination || '目的地'}
            </span>
          </div>
        )}
        <Badge
          variant="outline"
          className={cn(tripListUi.statusBadge, getTripListDisplayStatusClasses(displayStatus))}
        >
          {isUnavailable
            ? getTripPlanningAvailabilityLabel(planningAvailability)
            : getTripListDisplayStatusLabel(trip, displayStatus)}
        </Badge>
      </div>

      <div className={tripListUi.cardBody}>
        <div>
          <h3 className="text-sm font-semibold text-foreground line-clamp-2" title={title}>
            {title}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {countryName || trip.destination || '未知'}
              {durationDays > 0 ? ` · ${durationDays}天` : ''}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <Calendar className="w-3 h-3 shrink-0" />
            <span className="truncate">{dateRange}</span>
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <MemberAvatarStack count={memberCount} avatars={memberAvatars} />
            {displayStatus === 'traveling' ? (
              <span className="text-[9px] text-gate-allow-foreground font-medium">进行中</span>
            ) : null}
          </div>
        </div>

        {!isUnavailable && displayStatus !== 'completed' && displayStatus !== 'cancelled' ? (
          metrics.hasRealProgress && metrics.progressPercent != null ? (
            <div>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">规划进度</span>
                <span className="font-medium text-foreground tabular-nums">{metrics.progressPercent}%</span>
              </div>
              <Progress value={metrics.progressPercent} className="h-1 bg-muted [&>div]:bg-primary" />
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">规划进度待同步</p>
          )
        ) : null}

        {isUnavailable ? (
          <p className="text-[10px] text-muted-foreground leading-snug rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 line-clamp-2">
            {planningAvailability === 'collecting_info'
              ? '草稿已保存，补齐信息后可继续规划。'
              : planningAvailability === 'failed'
                ? '生成失败，请重新处理或联系协作者。'
                : '行程正在准备中，完成后可进入详情。'}
          </p>
        ) : null}

        <div className="flex items-center gap-1.5 mt-auto pt-0.5">
          <Button
            size="sm"
            variant="default"
            className={cn('flex-1 h-8 text-xs px-2', tripListUi.primaryBtn)}
            disabled={checking}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(trip.id);
            }}
          >
            {checking ? '…' : '查看详情'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {displayStatus === 'traveling' ? (
                  <RefreshCw className="w-4 h-4" />
                ) : (
                  <MoreHorizontal className="w-4 h-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onOpen(trip.id)}>查看详情</DropdownMenuItem>
              {onSetCover ? (
                <DropdownMenuItem onClick={(e) => onSetCover(trip.id, e as unknown as React.MouseEvent)}>
                  设置封面
                </DropdownMenuItem>
              ) : null}
              {onShare ? (
                <DropdownMenuItem onClick={(e) => onShare(trip.id, e as unknown as React.MouseEvent)}>
                  分享行程
                </DropdownMenuItem>
              ) : null}
              {onCollaborate ? (
                <DropdownMenuItem onClick={(e) => onCollaborate(trip.id, e as unknown as React.MouseEvent)}>
                  管理成员
                </DropdownMenuItem>
              ) : null}
              {onRefresh && displayStatus === 'traveling' ? (
                <DropdownMenuItem onClick={(e) => onRefresh(trip.id, e as unknown as React.MouseEvent)}>
                  刷新状态
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={() => onOpen(trip.id)}>
                <Navigation className="w-4 h-4 mr-2" />
                打开详情
                <ChevronRight className="w-4 h-4 ml-auto" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  );
}
