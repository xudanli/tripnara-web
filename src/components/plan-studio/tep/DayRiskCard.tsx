import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  collectDayRiskMessages,
  extractDriveLoadTierFromMessages,
  inferDriveLoadTier,
} from '@/lib/trip-executability.util';
import type {
  DailyDrivePlan,
  PlanningRuleResult,
  ValidationFinding,
} from '@/types/trip-executability';
import { AlertTriangle } from 'lucide-react';

export interface DayRiskCardProps {
  day: DailyDrivePlan;
  findings: ValidationFinding[];
  ruleResults?: PlanningRuleResult[];
  tepRuleResults?: PlanningRuleResult[];
  isVulnerable?: boolean;
  onClick?: () => void;
  className?: string;
}

function formatDayDate(date: string): string {
  try {
    return format(parseISO(date), 'M/d');
  } catch {
    return date;
  }
}

export function DayRiskCard({
  day,
  findings,
  ruleResults = [],
  tepRuleResults,
  isVulnerable = false,
  onClick,
  className,
}: DayRiskCardProps) {
  const riskMessages = collectDayRiskMessages(day, findings, ruleResults, tepRuleResults);
  const loadTier =
    extractDriveLoadTierFromMessages(riskMessages) ?? inferDriveLoadTier(day);
  const weatherSensitiveCount = day.activities.filter((a) => a.weatherSensitive).length;
  const flexibleCount = day.activities.filter(
    (a) => a.flexibility === 'REMOVABLE' || a.flexibility === 'REPLACEABLE',
  ).length;
  const lateArrivalFinding = findings.some(
    (f) =>
      f.message.includes('晚到') ||
      f.message.includes('latestArrival') ||
      (day.accommodation?.latestArrival &&
        f.affectedRefs.includes(day.accommodation.ref)),
  );

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      className={cn(
        'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
        isVulnerable
          ? 'border-[color-mix(in_srgb,var(--color-warning)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_8%,transparent)]'
          : 'border-border/70 bg-card',
        onClick && 'hover:bg-muted/20',
        className,
      )}
      data-testid={`day-risk-card-${day.dayIndex}`}
      onClick={onClick}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          Day {day.dayIndex} · {formatDayDate(day.date)}
        </span>
        {isVulnerable ? (
          <Badge variant="outline" className="gap-1 text-[10px] text-warning-foreground">
            <AlertTriangle className="h-3 w-3" />
            最脆弱
          </Badge>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {day.origin.label} → {day.destination.label}
      </p>
      <p className="mt-1.5 text-xs text-foreground/90">
        负荷 {loadTier} · 弹性 {flexibleCount} · 天气敏感 {weatherSensitiveCount}
      </p>
      {lateArrivalFinding && day.accommodation?.latestArrival ? (
        <p className="mt-1 text-xs text-muted-foreground">
          住宿晚到 {day.accommodation.latestArrival}
        </p>
      ) : null}
      {riskMessages.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5">
          {riskMessages.map((msg) => (
            <li key={msg} className="text-[11px] text-muted-foreground line-clamp-2">
              · {msg}
            </li>
          ))}
        </ul>
      ) : null}
    </Wrapper>
  );
}
