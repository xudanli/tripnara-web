import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  AlertTriangle,
  Bell,
  ChevronDown,
  Cloud,
  Info,
  Radio,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { semanticBadText, semanticGoodText, semanticWarnText } from '@/lib/semantic-ui-classes';
import type { CurrentWeather, WeatherCondition } from '@/types/weather';
import { ExecuteAlertBanner } from './ExecuteAlertBanner';

interface ExecuteAlertBannerData {
  title: string;
  description?: string;
  onAction?: () => void;
}

interface CollaboratorAvatar {
  userId: string;
  displayName: string;
}

export interface ExecuteLiveHeaderProps {
  tripTitle: string;
  revisionLabel?: string;
  statusSubline: string;
  dayNumber: number;
  totalDays: number;
  executionScore?: number | null;
  notificationCount?: number;
  collaborators?: CollaboratorAvatar[];
  weather?: Pick<CurrentWeather, 'temperature' | 'condition' | 'windSpeed' | 'metadata'> | null;
  windGust?: number | null;
  onNotificationsClick?: () => void;
  onCollaboratorsClick?: () => void;
  onTripTitleClick?: () => void;
  alertBanner?: ExecuteAlertBannerData | null;
}

const WEATHER_LABELS: Record<WeatherCondition, string> = {
  sunny: '晴天',
  cloudy: '多云',
  rainy: '雨天',
  snowy: '雪天',
  stormy: '暴风雨',
  foggy: '雾天',
  hazy: '雾霾',
  windy: '大风',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function executionScoreLabel(score: number): string {
  if (score >= 80) return '良好';
  if (score >= 60) return '一般';
  return '需关注';
}

function executionScoreColor(score: number): string {
  if (score >= 80) return semanticGoodText;
  if (score >= 60) return semanticWarnText;
  return semanticBadText;
}

function ExecutionScoreRing({ score }: { score: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden>
      <circle cx="21" cy="21" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
      <circle
        cx="21"
        cy="21"
        r={radius}
        fill="none"
        stroke="hsl(var(--foreground))"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 21 21)"
      />
      <text
        x="21"
        y="25"
        textAnchor="middle"
        className="fill-foreground text-[13px] font-bold"
        style={{ fontSize: 13, fontWeight: 700 }}
      >
        {score}
      </text>
    </svg>
  );
}

function ExecuteHeaderWeatherChip({
  weather,
  windGust,
}: {
  weather?: ExecuteLiveHeaderProps['weather'];
  windGust?: number | null;
}) {
  if (!weather) return null;

  const gust = windGust ?? weather.metadata?.windGust ?? weather.windSpeed;
  const label = WEATHER_LABELS[weather.condition] ?? weather.condition;

  return (
    <div className="hidden lg:flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 shrink-0">
      <Cloud className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs font-semibold tabular-nums">{Math.round(weather.temperature)}°C</span>
      {gust != null && gust > 0 ? (
        <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
          阵风 {Math.round(gust)} m/s
        </span>
      ) : null}
      <span className="text-[11px] text-muted-foreground whitespace-nowrap">{label}</span>
    </div>
  );
}

export function ExecuteLiveHeader({
  tripTitle,
  revisionLabel,
  statusSubline,
  dayNumber,
  totalDays,
  executionScore,
  notificationCount = 0,
  collaborators = [],
  weather,
  windGust,
  onNotificationsClick,
  onCollaboratorsClick,
  onTripTitleClick,
  alertBanner,
}: ExecuteLiveHeaderProps) {
  const navigate = useNavigate();
  const completedDays = Math.max(0, dayNumber - 1);
  const progressPercent = totalDays > 0 ? Math.round((dayNumber / totalDays) * 100) : 0;
  const score = executionScore ?? null;
  const visibleCollaborators = collaborators.slice(0, 4);
  const extraCollaborators = Math.max(0, collaborators.length - visibleCollaborators.length);

  return (
    <header className="border-b bg-white shrink-0">
      <div className="px-3 sm:px-4 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 shrink-0 rounded-md"
            onClick={() => navigate(-1)}
            aria-label="返回"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>

          <div className="min-w-0 flex-1 basis-[180px]">
            <button
              type="button"
              className="flex items-center gap-1 min-w-0 text-left group"
              onClick={onTripTitleClick}
            >
              <h1 className="text-sm sm:text-base font-bold truncate group-hover:underline underline-offset-2 transition-colors">
                {tripTitle}
              </h1>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {revisionLabel ? (
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1.5 border-border/70 bg-muted/20 text-foreground font-semibold"
                >
                  {revisionLabel}
                </Badge>
              ) : null}
              <div className="flex items-center gap-1 text-[10px] flex-wrap">
                <Badge
                  variant="outline"
                  className="h-4 gap-0.5 px-1.5 text-[10px] font-medium border-border/70 bg-muted/20 text-foreground"
                >
                  <Radio className="h-2.5 w-2.5" />
                  执行模式 / Live Mode
                </Badge>
                <span className="text-muted-foreground">{statusSubline}</span>
              </div>
            </div>
          </div>

          <ExecuteHeaderWeatherChip weather={weather} windGust={windGust} />

          {collaborators.length > 0 ? (
            <div className="hidden md:flex flex-col gap-0.5 shrink-0">
              <span className="text-[10px] text-muted-foreground leading-none">协作成员</span>
              <button
                type="button"
                className="flex items-center -space-x-1.5"
                onClick={onCollaboratorsClick}
                aria-label="查看协作者"
              >
                {visibleCollaborators.map((c) => (
                  <Avatar key={c.userId} className="h-6 w-6 border-2 border-white">
                    <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                      {initials(c.displayName)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {extraCollaborators > 0 ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-muted text-[9px] font-medium text-muted-foreground">
                    +{extraCollaborators}
                  </span>
                ) : null}
              </button>
            </div>
          ) : null}

          <div className="hidden sm:flex flex-col gap-0.5 min-w-[120px] shrink-0">
            <span className="text-[10px] text-muted-foreground leading-none">行程进度</span>
            <Progress value={progressPercent} className="h-1 [&>div]:bg-primary" />
            <span className="text-[10px] text-muted-foreground tabular-nums">
              已完成 {completedDays} / {totalDays} 天
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8"
              onClick={onNotificationsClick}
              aria-label="通知"
            >
              <Bell className="h-3.5 w-3.5" />
              {notificationCount > 0 ? (
                <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-primary-foreground">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              ) : null}
            </Button>

            {score != null ? (
              <div className="hidden lg:flex items-center gap-1.5">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-muted-foreground leading-none whitespace-nowrap">可执行评分</span>
                  <ExecutionScoreRing score={score} />
                </div>
                <div className="flex items-center gap-0.5">
                  <span className={cn('text-xs font-semibold', executionScoreColor(score))}>
                    {executionScoreLabel(score)}
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="评分说明">
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs text-xs">
                        综合行程稳定性、天气风险与待处理事项计算的可执行评分（0–100）
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {alertBanner ? (
        <div className="border-t border-border/40 px-3 sm:px-4 py-2">
          <ExecuteAlertBanner
            title={alertBanner.title}
            description={alertBanner.description}
            onAction={alertBanner.onAction}
          />
        </div>
      ) : null}
    </header>
  );
}

export function formatExecuteTripTitle(input: {
  name?: string | null;
  destination: string;
  totalDays: number;
}): string {
  const destinationNames: Record<string, string> = {
    IS: '冰岛西峡湾',
    JP: '日本',
    TH: '泰国',
    CN: '中国',
  };
  const code = input.destination.split(',')[0]?.trim().toUpperCase();
  const placeName = input.name || destinationNames[code] || input.destination;
  return `${placeName} · ${input.totalDays}天行程`;
}

export function formatExecuteStatusSubline(input: {
  tripStatus?: string;
  dayNumber: number;
  currentDate?: string;
  fallbackLabel?: string;
}): string {
  const datePart = input.currentDate
    ? format(
        new Date(input.currentDate.includes('T') ? input.currentDate : `${input.currentDate}T12:00:00`),
        'M/d',
      )
    : null;

  if (input.tripStatus === 'TRAVELING') {
    return `已出发 · 第${input.dayNumber}天${datePart ? ` (${datePart})` : ''}`;
  }

  if (input.fallbackLabel) {
    return `${input.fallbackLabel}${datePart ? ` · 第${input.dayNumber}天 (${datePart})` : ''}`;
  }

  return `第${input.dayNumber}天${datePart ? ` (${datePart})` : ''}`;
}
