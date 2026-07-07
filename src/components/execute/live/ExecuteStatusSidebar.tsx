import { format } from 'date-fns';
import { useEffect, useState, type ReactNode } from 'react';
import {
  BedDouble,
  Building2,
  Car,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Footprints,
  Handshake,
  MapPin,
  Navigation,
  Radio,
  Route,
  Sun,
  Ticket,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ExecuteTodayStatusSnapshot } from '@/lib/execute-today-status.util';
import type {
  ExecuteMemberStatusItem,
  ExecuteResourceItem,
  ExecuteResourceCategory,
  ExecuteStatusTone,
  ExecuteTransportStatusSnapshot,
} from '@/lib/execute-status-sidebar.util';
import { executeSidebarUi } from './execute-sidebar-ui';
import { ExecuteQuickActionsCard, type ExecuteQuickActionItem } from './ExecuteQuickActionsCard';
import { semanticGoodText, semanticWarnText } from '@/lib/semantic-ui-classes';

const LINK_CLASS = executeSidebarUi.linkAction;

const toneBadgeClass: Record<ExecuteStatusTone, string> = {
  success: executeSidebarUi.badgeTone('success'),
  warning: executeSidebarUi.badgeTone('warning'),
  neutral: executeSidebarUi.badgeTone('neutral'),
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function SidebarCardHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-1.5 px-2.5 pt-1.5 pb-0.5')}>
      <h3 className={executeSidebarUi.cardTitle}>{title}</h3>
      {actionLabel && onAction ? (
        <button type="button" className={LINK_CLASS} onClick={onAction}>
          {actionLabel}
          <ChevronRight className="h-3 w-3 opacity-70" />
        </button>
      ) : null}
    </div>
  );
}

function StatusToneBadge({
  label,
  tone = 'neutral',
  className,
}: {
  label: string;
  tone?: ExecuteStatusTone;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(executeSidebarUi.badge, toneBadgeClass[tone], className)}
    >
      {label}
    </Badge>
  );
}

function StatusRow({
  icon,
  label,
  children,
  inline,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <div className="flex items-center gap-1.5 py-2 min-w-0 first:pt-0 last:pb-0">
        <div className={cn('shrink-0 text-muted-foreground', executeSidebarUi.iconSm)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1 flex items-center gap-1.5">
          <span className={executeSidebarUi.rowLabel}>{label}</span>
          <div className="min-w-0 flex-1 flex items-center gap-2 overflow-hidden">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-start gap-2 py-2 first:pt-0 last:pb-0 min-w-0')}>
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className={cn(executeSidebarUi.rowLabel, 'mb-0.5')}>{label}</p>
        {children}
      </div>
    </div>
  );
}

const weatherRiskBadgeClass: Record<string, string> = {
  destructive: executeSidebarUi.badgeTone('danger'),
  warning: executeSidebarUi.badgeTone('warning'),
  outline: executeSidebarUi.badgeTone('neutral'),
};

function ExecuteTodayStatusCard({
  status,
  onNavigate,
}: {
  status: ExecuteTodayStatusSnapshot;
  onNavigate?: () => void;
}) {
  const [liveTime, setLiveTime] = useState(status.currentTime);

  useEffect(() => {
    setLiveTime(status.currentTime);
    const timer = window.setInterval(() => {
      setLiveTime(format(new Date(), 'HH:mm'));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [status.currentTime]);

  const weatherLine = (() => {
    const parts: string[] = [];
    if (status.weatherRisks?.temperature != null) {
      parts.push(`${Math.round(status.weatherRisks.temperature)}°C`);
    }
    if (status.weatherRisks?.windGust != null) {
      parts.push(`阵风 ${Math.round(status.weatherRisks.windGust)} m/s`);
    }
    return parts.join(' | ');
  })();

  const weatherBadges =
    status.weatherRisks && status.weatherRisks.badges.length > 0
      ? status.weatherRisks.badges
      : status.weatherRisks
        ? [{ label: '稳定', variant: 'outline' as const }]
        : [];

  return (
    <Card className="overflow-hidden shadow-sm">
      <div className="flex items-center justify-between gap-1.5 px-2.5 pt-2 pb-2 min-w-0">
        <h3 className={executeSidebarUi.cardTitle}>今日状态</h3>
        {status.updatedAt ? (
          <div className={cn('flex items-center gap-1 shrink-0', executeSidebarUi.updatedMeta)}>
            <CheckCircle2 className={cn('h-3 w-3', semanticGoodText)} aria-hidden />
            <span className="whitespace-nowrap">更新于 {status.updatedAt}</span>
          </div>
        ) : null}
      </div>
      <CardContent className="px-2.5 pb-2 pt-1">
        <div className="divide-y divide-border">
          <StatusRow icon={<Clock className={executeSidebarUi.iconSm} />} label="当前时间" inline>
            <p className={cn(executeSidebarUi.rowValueStrong, 'truncate whitespace-nowrap tabular-nums')}>
              {liveTime}
              {status.timezoneLabel ? (
                <span className="font-normal text-muted-foreground"> ({status.timezoneLabel})</span>
              ) : null}
            </p>
          </StatusRow>

          {status.locationLabel ? (
            <StatusRow icon={<MapPin className={executeSidebarUi.iconSm} />} label="当前地点" inline>
              <p className={cn(executeSidebarUi.rowValue, 'truncate whitespace-nowrap min-w-0')}>
                {status.locationLabel}
              </p>
              {onNavigate ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 shrink-0 px-1 text-[10px] text-foreground hover:bg-muted/40"
                  onClick={onNavigate}
                >
                  <Navigation className="h-3 w-3 mr-0.5" />
                  导航
                </Button>
              ) : null}
            </StatusRow>
          ) : null}

          {status.weatherRisks ? (
            <div className="flex items-start gap-1.5 py-2 min-w-0">
              <div className="shrink-0 pt-0.5 text-muted-foreground">
                <Sun className={executeSidebarUi.iconSm} aria-hidden />
              </div>
              <div className="min-w-0 flex-1 flex items-start gap-2">
                <span className={cn(executeSidebarUi.rowLabel, 'shrink-0 pt-0.5')}>天气与风险</span>
                <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                  <div className="flex flex-wrap gap-1">
                    {weatherBadges.map((badge) => (
                      <Badge
                        key={badge.label}
                        variant="outline"
                        className={cn(executeSidebarUi.badge, weatherRiskBadgeClass[badge.variant])}
                      >
                        {badge.label}
                      </Badge>
                    ))}
                  </div>
                  {weatherLine ? (
                    <p className={cn(executeSidebarUi.rowValue, 'truncate whitespace-nowrap')}>{weatherLine}</p>
                  ) : null}
                  {status.weatherRisks.visibilityLabel ? (
                    <p className={cn(executeSidebarUi.rowMeta, 'truncate whitespace-nowrap')}>
                      {status.weatherRisks.visibilityLabel}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {status.delayMinutes != null && status.delayMinutes > 0 ? (
            <StatusRow icon={<Clock className={executeSidebarUi.iconSm} />} label="整体节奏" inline>
              <p className={cn(executeSidebarUi.rowValue, semanticWarnText, 'truncate whitespace-nowrap')}>
                延迟约 {status.delayMinutes} 分钟
              </p>
            </StatusRow>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function MemberLevelIcon({ level }: { level: ExecuteMemberStatusItem['level'] }) {
  if (level === 'yellow' || level === 'orange' || level === 'red') {
    return <Circle className={cn('h-3 w-3 shrink-0', semanticWarnText)} aria-hidden />;
  }
  return <CheckCircle2 className={cn('h-3 w-3 shrink-0', semanticGoodText)} aria-hidden />;
}

function MemberStatusCard({
  members,
  onlineCount,
  onViewDetail,
  onMemberClick,
  onGroupIntercom,
  onTeamNegotiation,
}: {
  members: ExecuteMemberStatusItem[];
  onlineCount?: number;
  onViewDetail?: () => void;
  onMemberClick?: (member: ExecuteMemberStatusItem) => void;
  onGroupIntercom?: () => void;
  onTeamNegotiation?: () => void;
}) {
  if (members.length === 0) return null;

  return (
    <Card className="overflow-hidden shadow-sm">
      <SidebarCardHeader title="成员状态" actionLabel="查看详情" onAction={onViewDetail} />
      <CardContent className="px-0 pb-0 pt-0">
        <div className="divide-y divide-border">
          {members.map((member) => (
            <button
              key={member.userId}
              type="button"
              className={cn('w-full flex items-center gap-1.5 px-2.5 py-1 text-left hover:bg-muted/30 transition-colors min-w-0')}
              onClick={() => {
                if (onMemberClick) onMemberClick(member);
                else onViewDetail?.();
              }}
            >
              <Avatar className="h-6 w-6 shrink-0 border border-border">
                <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                  {initials(member.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 flex items-center gap-1.5 overflow-hidden">
                <p className={cn(executeSidebarUi.rowValue, 'truncate whitespace-nowrap shrink-0 max-w-[38%]')}>
                  {member.displayName}
                </p>
                <MemberLevelIcon level={member.level} />
                <p className={cn(executeSidebarUi.rowMeta, 'truncate whitespace-nowrap min-w-0')}>
                  {member.conditionLabel} · {member.activityLabel}
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1 border-t border-border hover:bg-muted/30 transition-colors"
          onClick={onGroupIntercom}
        >
          <div className="flex items-center gap-1.5">
            <span className={executeSidebarUi.iconCell}>
              <Radio className="h-3.5 w-3.5" />
            </span>
            <span className={executeSidebarUi.rowValue}>团队对讲</span>
          </div>
          <div className={cn('flex items-center gap-1', executeSidebarUi.rowMeta)}>
            <span>{onlineCount ?? members.length} 人在线</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </button>
        {onTeamNegotiation ? (
          <button
            type="button"
            className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1 border-t border-border hover:bg-muted/30 transition-colors"
            onClick={onTeamNegotiation}
          >
            <div className="flex items-center gap-1.5">
              <span className={executeSidebarUi.iconCell}>
                <Handshake className="h-3.5 w-3.5" />
              </span>
              <span className={executeSidebarUi.rowValue}>团队协商</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TransportRow({
  icon,
  label,
  value,
  trailing,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 py-1.5 min-w-0">
      <div className={cn(executeSidebarUi.iconCell)}>{icon}</div>
      <div className="min-w-0 flex-1 flex items-center gap-1.5 overflow-hidden">
        <span className={executeSidebarUi.rowLabel}>{label}</span>
        <p className={cn(executeSidebarUi.rowValue, 'truncate whitespace-nowrap min-w-0')}>{value}</p>
        {trailing ? <div className="shrink-0 ml-auto">{trailing}</div> : null}
      </div>
    </div>
  );
}

function TransportStatusCard({
  transport,
  onViewMap,
}: {
  transport: ExecuteTransportStatusSnapshot;
  onViewMap?: () => void;
}) {
  return (
    <Card className="overflow-hidden shadow-sm">
      <SidebarCardHeader title="交通状态" actionLabel="查看地图" onAction={onViewMap} />
      <CardContent className="px-2.5 pb-1.5 pt-0 divide-y divide-border">
        <TransportRow
          icon={<Car className={executeSidebarUi.iconSm} />}
          label="当前车辆"
          value={transport.vehicleLabel}
          trailing={
            <StatusToneBadge label={transport.vehicleStatus} tone={transport.vehicleStatusTone} />
          }
        />

        {transport.arrivalPlaceLabel ? (
          <TransportRow
            icon={<MapPin className={executeSidebarUi.iconSm} />}
            label="预计到达"
            value={transport.arrivalPlaceLabel}
            trailing={
              transport.arrivalTime ? (
                <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                  <span
                    className={cn(
                      executeSidebarUi.rowValueStrong,
                      'tabular-nums',
                      transport.arrivalDelayMinutes ? semanticWarnText : 'text-foreground',
                    )}
                  >
                    {transport.arrivalTime}
                  </span>
                  {transport.arrivalDelayMinutes ? (
                    <span className={cn(executeSidebarUi.rowLabel, semanticWarnText)}>
                      (延迟{transport.arrivalDelayMinutes}分)
                    </span>
                  ) : null}
                </span>
              ) : null
            }
          />
        ) : null}

        {transport.roadConditionLabel ? (
          <TransportRow
            icon={<Route className={executeSidebarUi.iconSm} />}
            label="路况"
            value={transport.roadConditionLabel}
            trailing={
              transport.roadConditionBadge ? (
                <StatusToneBadge
                  label={transport.roadConditionBadge}
                  tone={transport.roadConditionTone ?? 'warning'}
                />
              ) : null
            }
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function resourceIcon(category: ExecuteResourceCategory) {
  switch (category) {
    case 'activity':
      return <Footprints className={executeSidebarUi.iconSm} />;
    case 'hot_spring':
      return <Building2 className={executeSidebarUi.iconSm} />;
    case 'hotel':
      return <BedDouble className={executeSidebarUi.iconSm} />;
    default:
      return <Ticket className={executeSidebarUi.iconSm} />;
  }
}

function BookedResourcesCard({
  resources,
  onManageBookings,
}: {
  resources: ExecuteResourceItem[];
  onManageBookings?: () => void;
}) {
  if (resources.length === 0) return null;

  return (
    <Card className="overflow-hidden shadow-sm">
      <SidebarCardHeader title="已预订资源" actionLabel="管理预订" onAction={onManageBookings} />
      <CardContent className="px-0 pb-0 pt-0">
        <div className="divide-y divide-border">
          {resources.map((resource) => (
            <div key={resource.id} className={cn('flex items-center gap-1.5 min-w-0', executeSidebarUi.listRow, 'px-2.5')}>
              <div className={executeSidebarUi.iconCell}>
                {resourceIcon(resource.category)}
              </div>
              <p className={cn('min-w-0 flex-1 truncate whitespace-nowrap', executeSidebarUi.rowValue)}>
                {resource.title}
              </p>
              <StatusToneBadge label={resource.statusLabel} tone={resource.statusTone} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ExecuteStatusSidebarProps {
  todayStatus?: ExecuteTodayStatusSnapshot;
  members?: ExecuteMemberStatusItem[];
  membersOnlineCount?: number;
  transport?: ExecuteTransportStatusSnapshot;
  resources?: ExecuteResourceItem[];
  onViewMembersDetail?: () => void;
  onMemberClick?: (member: ExecuteMemberStatusItem) => void;
  onViewTransportMap?: () => void;
  onManageBookings?: () => void;
  onGroupIntercom?: () => void;
  onTeamNegotiation?: () => void;
  onNavigate?: () => void;
  quickActions?: ExecuteQuickActionItem[];
  className?: string;
}

export function ExecuteStatusSidebar({
  todayStatus,
  members = [],
  membersOnlineCount,
  transport,
  resources = [],
  onViewMembersDetail,
  onMemberClick,
  onViewTransportMap,
  onManageBookings,
  onGroupIntercom,
  onTeamNegotiation,
  onNavigate,
  quickActions,
  className,
}: ExecuteStatusSidebarProps) {
  return (
    <aside className={cn('flex h-full min-h-0 flex-col overflow-hidden', className)}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-1.5">
          {todayStatus ? (
            <ExecuteTodayStatusCard status={todayStatus} onNavigate={onNavigate} />
          ) : null}

          <MemberStatusCard
            members={members}
            onlineCount={membersOnlineCount}
            onViewDetail={onViewMembersDetail}
            onMemberClick={onMemberClick}
            onGroupIntercom={onGroupIntercom}
            onTeamNegotiation={onTeamNegotiation}
          />

          {transport ? (
            <TransportStatusCard transport={transport} onViewMap={onViewTransportMap} />
          ) : null}

          <BookedResourcesCard resources={resources} onManageBookings={onManageBookings} />

          {quickActions && quickActions.length > 0 ? (
            <ExecuteQuickActionsCard actions={quickActions} />
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export type { ExecuteMemberStatusItem, ExecuteResourceItem };
