import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Cloud,
  MessageCircle,
  Receipt,
  Smile,
  Thermometer,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  sumPendingCards,
  thermometerLevelClasses,
  thermometerLevelLabel,
  vulnerabilitySeverityClasses,
  vulnerabilitySeverityLabel,
} from '@/lib/in-trip-execution';
import type { QuickAction, TodayDashboardSnapshot } from '@/types/in-trip-execution';
import { formatScheduleTime } from '@/lib/itinerary-item-card-format';

interface InTripTodayPanelProps {
  tripId: string;
  data: TodayDashboardSnapshot | null;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  onAskAi?: () => void;
  onEnvironmentAlertsClick?: () => void;
  onRecordExpense?: () => void;
  onMoodCheck?: () => void;
  onInterventionsClick?: () => void;
  onExperiencePulsesClick?: () => void;
  className?: string;
}

const QUICK_ACTION_META: Record<
  QuickAction,
  { label: string; icon: typeof Receipt; comingSoon?: boolean }
> = {
  record_expense: { label: '记一笔', icon: Receipt },
  mood_check: { label: '今日签到', icon: Smile },
  ask_ai: { label: '问 AI', icon: MessageCircle },
};

export function InTripTodayPanel({
  tripId,
  data,
  loading,
  error,
  disabled,
  onAskAi,
  onEnvironmentAlertsClick,
  onRecordExpense,
  onMoodCheck,
  onInterventionsClick,
  onExperiencePulsesClick,
  className,
}: InTripTodayPanelProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className={cn('col-span-12', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (disabled) {
    return (
      <Card className={cn('col-span-12 border-dashed', className)}>
        <CardContent className="py-6 text-sm text-muted-foreground text-center">
          行中今日概览暂不可用，请稍后刷新或联系管理员开启行中服务
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('col-span-12 border-amber-200', className)}>
        <CardContent className="py-4 text-sm text-amber-800">{error}</CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const pendingTotal = sumPendingCards(data.pendingCards);
  const dayLabel = format(new Date(`${data.date}T12:00:00`), 'M月d日 EEEE', { locale: zhCN });

  const envAlertCount = data.pendingCards.environmentAlerts;
  const interventionCount = data.pendingCards.interventions;
  const experiencePulseCount = data.pendingCards.experiencePulses;

  const handleQuickAction = (action: QuickAction) => {
    switch (action) {
      case 'record_expense':
        if (onRecordExpense) {
          onRecordExpense();
        } else {
          navigate(`/dashboard/trips/${tripId}/budget`);
        }
        break;
      case 'mood_check':
        if (onMoodCheck) onMoodCheck();
        break;
      case 'ask_ai':
        onAskAi?.();
        break;
    }
  };

  return (
    <Card className={cn('col-span-12 overflow-hidden', className)}>
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-slate-50 to-sky-50/80">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-semibold">
              第 {data.dayNumber} 天 · {dayLabel}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">行中今日概览</p>
          </div>
          {pendingTotal > 0 && (
            <button
              type="button"
              onClick={() => {
                if (envAlertCount > 0) onEnvironmentAlertsClick?.();
                else if (interventionCount > 0) onInterventionsClick?.();
                else if (experiencePulseCount > 0) onExperiencePulsesClick?.();
              }}
              className={cn(
                'shrink-0',
                (envAlertCount > 0 || interventionCount > 0 || experiencePulseCount > 0) &&
                  'cursor-pointer',
              )}
            >
              <Badge variant="destructive" className="shrink-0">
                {pendingTotal} 待处理
                {envAlertCount > 0 && ` · 环境 ${envAlertCount}`}
                {interventionCount > 0 && ` · 干预 ${interventionCount}`}
                {experiencePulseCount > 0 && ` · 体验 ${experiencePulseCount}`}
              </Badge>
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border p-3 flex items-start gap-2">
            <Cloud className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">天气</p>
              <p className="text-sm font-medium truncate">{data.weather.summary}</p>
              {data.weather.tempMin != null && data.weather.tempMax != null && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {data.weather.tempMin}° – {data.weather.tempMax}°
                </p>
              )}
              {data.weather.source === 'stub' && data.weather.tempMin == null && (
                <p className="text-[10px] text-muted-foreground mt-0.5">气温数据同步中</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-3 flex items-start gap-2">
            <div
              className={cn(
                'h-2.5 w-2.5 rounded-full shrink-0 mt-1',
                data.vulnerability.severity === 'green' && 'bg-emerald-500',
                data.vulnerability.severity === 'yellow' && 'bg-amber-400',
                data.vulnerability.severity === 'red' && 'bg-red-500',
              )}
              aria-hidden
            />
            <div>
              <p className="text-xs text-muted-foreground">行程脆弱度</p>
              <Badge
                variant="outline"
                className={cn('mt-0.5 text-[10px]', vulnerabilitySeverityClasses(data.vulnerability.severity))}
              >
                {vulnerabilitySeverityLabel(data.vulnerability.severity)}
                {data.vulnerability.stabilityScore > 0 &&
                  ` · ${Math.round(data.vulnerability.stabilityScore * 100)}%`}
              </Badge>
              {data.vulnerability.source === 'environment_radar' && (
                <p className="text-[10px] text-muted-foreground mt-0.5">Environment Radar</p>
              )}
            </div>
          </div>

          {data.teamThermometer.visible && (
            <div className="rounded-lg border p-3 flex items-start gap-2">
              <Thermometer className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">团队温度计</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', thermometerLevelClasses(data.teamThermometer.level))}
                      style={{ width: '72%' }}
                    />
                  </div>
                  <span className="text-xs font-medium shrink-0">
                    {thermometerLevelLabel(data.teamThermometer.level)}
                  </span>
                </div>
                {data.teamThermometer.source === 'group_pulse' && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">Group Pulse</p>
                )}
              </div>
            </div>
          )}
        </div>

        {data.budgetSnapshot.source === 'budget_os' && data.budgetSnapshot.overallUsagePercent != null && (
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" aria-hidden />
                预算进度
              </span>
              <span className="font-medium">{data.budgetSnapshot.overallUsagePercent}%</span>
            </div>
            <Progress value={data.budgetSnapshot.overallUsagePercent} className="h-1.5" />
            {data.budgetSnapshot.topBucket && (
              <p className="text-[10px] text-muted-foreground">
                {data.budgetSnapshot.topBucket.category} 桶已用{' '}
                {data.budgetSnapshot.topBucket.usagePercent}%
              </p>
            )}
          </div>
        )}

        {data.timeline.planned.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">今日计划</p>
            <ul className="space-y-1.5">
              {data.timeline.planned.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    {item.startTime && (
                      <p className="text-xs text-muted-foreground">
                        {formatScheduleTime(item.startTime)}
                      </p>
                    )}
                  </div>
                  {!item.refundable && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      不可退
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1" data-tour="in-trip-quick-actions">
          {data.quickActions.map((action) => {
            const meta = QUICK_ACTION_META[action];
            const Icon = meta.icon;
            return (
              <Button
                key={action}
                type="button"
                variant="outline"
                size="sm"
                className="h-9 min-w-[5.5rem] rounded-full"
                disabled={meta.comingSoon || (action === 'mood_check' && !onMoodCheck)}
                onClick={() => handleQuickAction(action)}
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                {meta.label}
                {meta.comingSoon && (
                  <span className="sr-only">（即将上线）</span>
                )}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
