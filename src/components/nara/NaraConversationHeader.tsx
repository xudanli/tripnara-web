import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Logo from '@/components/common/Logo';
import { cn } from '@/lib/utils';
import { ArrowLeft, ChevronDown, PanelRight, Share2 } from 'lucide-react';
import type { TripListItem } from '@/types/trip';
import { format } from 'date-fns';
import { buildTripTravelStatusPath } from '@/lib/travel-status-navigation.util';

interface NaraConversationHeaderProps {
  tripTitle?: string | null;
  tripId?: string | null;
  planningTrips?: TripListItem[];
  onTripChange?: (tripId: string) => void;
  onOpenContext?: () => void;
  showContextToggle?: boolean;
  className?: string;
}

export default function NaraConversationHeader({
  tripTitle,
  tripId,
  planningTrips = [],
  onTripChange,
  onOpenContext,
  showContextToggle,
  className,
}: NaraConversationHeaderProps) {
  const navigate = useNavigate();
  const title = tripTitle?.trim() || 'Nara 对话';

  return (
    <header
      className={cn(
        'flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 lg:px-4',
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="hidden shrink-0 text-muted-foreground sm:inline-flex"
        onClick={() => {
          if (tripId) {
            navigate(buildTripTravelStatusPath(tripId));
          } else {
            navigate('/dashboard/trips');
          }
        }}
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        概览
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="min-w-0 flex-1 justify-start gap-2 px-2 font-medium sm:flex-none sm:max-w-[320px]"
          >
            <span className="truncate">{title}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>切换行程</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {planningTrips.length === 0 ? (
            <DropdownMenuItem disabled>暂无规划中的行程</DropdownMenuItem>
          ) : (
            planningTrips.map((trip) => (
              <DropdownMenuItem
                key={trip.id}
                onClick={() => onTripChange?.(trip.id)}
                className={cn(trip.id === tripId && 'bg-muted')}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {(trip as TripListItem & { name?: string }).name ||
                      trip.destination ||
                      '未命名行程'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(trip.startDate), 'yyyy-MM-dd')}
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-1">
        {tripId ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hidden text-xs sm:inline-flex"
            onClick={() => navigate(`/dashboard/plan-studio?tripId=${tripId}`)}
          >
            编辑行程
          </Button>
        ) : null}
        {tripId ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex"
            title="分享"
            onClick={() => navigate(`/dashboard/trips/${tripId}`, { state: { openShareDialog: true } })}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        ) : null}
        {showContextToggle ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="xl:hidden"
            onClick={onOpenContext}
          >
            <PanelRight className="mr-1.5 h-4 w-4" />
            上下文
          </Button>
        ) : null}
      </div>

      <div className="hidden items-center gap-2 border-l border-border pl-3 lg:flex">
        <Logo variant="icon" size={22} color="currentColor" className="text-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-none">Nara 助理</p>
          <p className="mt-0.5 text-xs text-muted-foreground">你的旅行规划搭档</p>
        </div>
      </div>
    </header>
  );
}
