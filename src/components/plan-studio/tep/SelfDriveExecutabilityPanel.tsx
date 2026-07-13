import { useCallback, useMemo, useRef } from 'react';
import { LogoLoading } from '@/components/common/LogoLoading';
import { cn } from '@/lib/utils';
import {
  parseExecutabilityDeepLink,
  resolveVulnerableDayIndex,
} from '@/lib/trip-executability.util';
import type { TripExecutabilityView } from '@/types/trip-executability';
import { DayRiskCard } from './DayRiskCard';
import { ExecutabilityFindingsList } from './ExecutabilityFindingsList';
import { ExecutabilityStrip } from './ExecutabilityStrip';
import { RepairPreviewCard } from './RepairPreviewCard';

export interface SelfDriveExecutabilityPanelProps {
  data: TripExecutabilityView | null;
  loading?: boolean;
  refreshing?: boolean;
  error?: string | null;
  onReload?: () => void;
  onPrimaryCta?: (deepLink: string) => void;
  onFocusDay?: (dayIndex: number) => void;
  className?: string;
}

export function SelfDriveExecutabilityPanel({
  data,
  loading = false,
  refreshing = false,
  error = null,
  onReload,
  onPrimaryCta,
  onFocusDay,
  className,
}: SelfDriveExecutabilityPanelProps) {
  const repairSectionRef = useRef<HTMLDivElement>(null);

  const vulnerableDayIndex = useMemo(
    () =>
      data
        ? resolveVulnerableDayIndex(data.assessment.findings, data.dailyDrivePlans)
        : null,
    [data],
  );

  const handlePrimaryCta = useCallback(() => {
    if (!data?.ui.primaryCta) return;
    const { tab, filter } = parseExecutabilityDeepLink(data.ui.primaryCta.deepLink);
    if (filter === 'repair') {
      repairSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    onPrimaryCta?.(data.ui.primaryCta.deepLink);
    if (tab === 'decisions') {
      repairSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [data, onPrimaryCta]);

  const handleFindingClick = useCallback(
    (finding: { affectedRefs: string[] }) => {
      const dayRef = finding.affectedRefs.find((ref) => /^day_\d+$/.test(ref));
      if (!dayRef) return;
      const dayIndex = Number.parseInt(dayRef.replace('day_', ''), 10);
      if (Number.isFinite(dayIndex)) onFocusDay?.(dayIndex);
    },
    [onFocusDay],
  );

  if (loading && !data) {
    return (
      <div className={cn('flex items-center justify-center border-b py-6', className)}>
        <LogoLoading size={32} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={cn('border-b px-4 py-3 text-xs text-muted-foreground sm:px-5', className)}>
        <p>可执行性诊断暂不可用：{error}</p>
        {onReload ? (
          <button type="button" className="mt-2 text-xs text-primary underline" onClick={onReload}>
            重试
          </button>
        ) : null}
      </div>
    );
  }

  if (!data) return null;

  const { assessment, ui, dailyDrivePlans, repairPreviews } = data;

  return (
    <div className={cn('border-b border-border/70', className)} data-testid="tep-panel">
      <ExecutabilityStrip
        ui={ui}
        isStale={data.isStale}
        refreshing={refreshing}
        onRefresh={onReload}
        onPrimaryCta={handlePrimaryCta}
      />

      <div className="space-y-4 px-4 py-3 sm:px-5">
        <ExecutabilityFindingsList
          findings={assessment.findings}
          ruleResults={assessment.ruleResults}
          onFindingClick={handleFindingClick}
        />

        {dailyDrivePlans.length > 0 ? (
          <section className="space-y-2" data-testid="executability-daily-risks">
            <h3 className="text-xs font-medium text-muted-foreground">按日风险</h3>
            <div className="space-y-2">
              {dailyDrivePlans.map((day) => (
                <DayRiskCard
                  key={`${day.dayIndex}-${day.date}`}
                  day={day}
                  findings={assessment.findings}
                  ruleResults={assessment.ruleResults}
                  tepRuleResults={data.tepRuleResults}
                  isVulnerable={vulnerableDayIndex === day.dayIndex}
                  onClick={onFocusDay ? () => onFocusDay(day.dayIndex) : undefined}
                />
              ))}
            </div>
          </section>
        ) : null}

        {repairPreviews.length > 0 ? (
          <section ref={repairSectionRef} className="space-y-2" data-testid="executability-repairs">
            <h3 className="text-xs font-medium text-muted-foreground">调整建议</h3>
            <div className="space-y-2">
              {repairPreviews.map((preview) => (
                <RepairPreviewCard key={preview.optionId} preview={preview} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
