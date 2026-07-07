import { format } from 'date-fns';
import {
  Bot,
  Calendar,
  ChevronDown,
  Download,
  MapPin,
  Share2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getTripStatusClasses, getTripStatusLabel } from '@/lib/trip-status';
import type { TripDetail } from '@/types/trip';
import { resolveTravelerCount } from '@/lib/planning-constraints.util';

interface TripDetailHeaderProps {
  trip: TripDetail;
  onShare: () => void;
  onExportPdf?: () => void;
  onEdit?: () => void;
  onCollaborators?: () => void;
  onOpenMembers?: () => void;
  onOpenAutomation?: () => void;
  moreMenuItems?: React.ReactNode;
  mainCTA?: { label: string; action: () => void; icon: LucideIcon } | null;
  className?: string;
}

function MemberAvatarStack({ count }: { count: number }) {
  if (count <= 1) return null;

  const shown = Math.min(count, 3);
  const extra = count > 3 ? count - 3 : 0;

  return (
    <div className="flex items-center -space-x-1.5">
      {Array.from({ length: shown }).map((_, i) => (
        <div
          key={i}
          className="h-5 w-5 rounded-full border border-card bg-muted flex items-center justify-center text-[9px] font-semibold text-muted-foreground"
        >
          {String.fromCharCode(65 + i)}
        </div>
      ))}
      {extra > 0 ? (
        <div className="h-5 w-5 rounded-full border border-card bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground">
          +{extra}
        </div>
      ) : null}
    </div>
  );
}

export default function TripDetailHeader({
  trip,
  onShare,
  onExportPdf,
  onEdit,
  onCollaborators,
  onOpenMembers,
  onOpenAutomation,
  moreMenuItems,
  mainCTA,
  className,
}: TripDetailHeaderProps) {
  const memberCount = resolveTravelerCount(trip);
  const dayCount =
    Math.ceil(
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1;

  const CTAIcon = mainCTA?.icon;

  return (
    <header className={cn('border-b border-border bg-card px-4 sm:px-6 py-2.5 shadow-sm', className)}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="text-lg sm:text-xl font-bold text-foreground truncate leading-tight">
              {trip.name || trip.destination}
            </h1>
            <Badge
              variant="outline"
              className={cn('font-medium text-[10px] px-1.5 py-0 leading-none', getTripStatusClasses(trip.status))}
            >
              {getTripStatusLabel(trip.status)}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {trip.destination}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(trip.startDate), 'yyyy-MM-dd')}
              {' ~ '}
              {format(new Date(trip.endDate), 'yyyy-MM-dd')}
            </span>
            <span>{dayCount} 天</span>
            {onOpenMembers ? (
              <button
                type="button"
                onClick={onOpenMembers}
                className="inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground"
              >
                <Users className="w-3 h-3" />
                {memberCount} 位成员
              </button>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3" />
                {memberCount} 位成员
              </span>
            )}
            <MemberAvatarStack count={memberCount} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onShare}>
            <Share2 className="w-3.5 h-3.5 mr-1" />
            分享
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onExportPdf ?? (() => {})}>
            <Download className="w-3.5 h-3.5 mr-1" />
            导出 PDF
          </Button>
          {onOpenAutomation ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onOpenAutomation}
              title="AI 自动执行授权中心"
            >
              <Bot className="w-3.5 h-3.5 mr-1" />
              AI 自动化
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                更多
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit ? (
                <DropdownMenuItem onClick={onEdit}>编辑行程</DropdownMenuItem>
              ) : null}
              {onCollaborators ? (
                <DropdownMenuItem onClick={onCollaborators}>协作者</DropdownMenuItem>
              ) : null}
              {moreMenuItems}
            </DropdownMenuContent>
          </DropdownMenu>
          {mainCTA && CTAIcon ? (
            <Button
              size="sm"
              className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={mainCTA.action}
            >
              <CTAIcon className="w-3.5 h-3.5 mr-1" />
              {mainCTA.label}
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
