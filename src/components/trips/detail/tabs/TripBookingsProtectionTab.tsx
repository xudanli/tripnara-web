import { AlertTriangle, Car, Shield, UserRound } from 'lucide-react';
import { useMemo } from 'react';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TRIP_DETAIL_NAV } from '@/lib/trip-detail-terminology.util';
import { useTripStatusBarModel } from '@/hooks/useTripStatusBarModel';
import {
  buildTripBookingsProtectionView,
  insuranceCoverageTone,
  routeCompatibilityTone,
} from '@/lib/trip-bookings-protection.util';
import {
  TripDetailSection,
  TripDetailTwoColumn,
  tripDetailUi,
} from '@/components/trips/detail/trip-detail-ui';
import type { TripDetail } from '@/types/trip';

interface TripBookingsProtectionTabProps {
  tripId: string;
  trip: TripDetail;
  onOpenDecisions?: () => void;
}

export default function TripBookingsProtectionTab({
  tripId,
  trip,
  onOpenDecisions,
}: TripBookingsProtectionTabProps) {
  const { status, isLoading } = useTripStatusBarModel(tripId);

  const view = useMemo(
    () => buildTripBookingsProtectionView(trip, status),
    [trip, status],
  );

  if (isLoading && !status) {
    return (
      <div className="flex items-center justify-center py-16">
        <LogoLoading size={32} />
      </div>
    );
  }

  return (
    <TripDetailTwoColumn
      main={
        <div className="space-y-4">
          <section className={cn(tripDetailUi.card, 'p-4 sm:p-5')}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/20">
                <UserRound className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-foreground">驾驶人资格</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {view.driver.primaryDriverLabel} · 基于行程成员与条件推断
                </p>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Row label="年龄要求" value={view.driver.ageRequirement} />
                  <Row label="驾照要求" value={view.driver.licenseRequirement} />
                  <Row label="驾照语言" value={view.driver.licenseLanguage} />
                  <Row label="冬季驾驶经验" value={view.driver.winterExperience} />
                </dl>
              </div>
            </div>
          </section>

          <section className={cn(tripDetailUi.card, 'p-4 sm:p-5')}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/20">
                <Car className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-foreground">车辆与路线匹配</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{view.vehicleLabel}</p>
                {view.routeIssue ? (
                  <p className="mt-2 text-xs text-gate-reject-foreground">{view.routeIssue}</p>
                ) : null}
                <ul className="mt-3 space-y-2">
                  {view.routeRows.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/10 px-3 py-2"
                    >
                      <span className="text-sm text-foreground">{row.label}</span>
                      <span className={cn('text-xs font-medium', routeCompatibilityTone(row.status))}>
                        {row.statusLabel}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className={cn(tripDetailUi.card, 'p-4 sm:p-5')}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/20">
                <Shield className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">保险覆盖矩阵</h2>
                  {view.hasAmbiguity ? (
                    <Badge variant="outline" className={tripDetailUi.tagConfirm}>
                      存在未确认项
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  基于 open decisions 推断；完整条款以租车合同为准
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[320px] text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-[11px] text-muted-foreground">
                        <th className="pb-2 font-medium">风险类型</th>
                        <th className="pb-2 font-medium text-right">覆盖状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {view.insuranceRows.map((row) => (
                        <tr key={row.id} className="border-b border-border/30 last:border-0">
                          <td className="py-2.5 text-foreground">{row.risk}</td>
                          <td
                            className={cn(
                              'py-2.5 text-right text-xs font-medium',
                              insuranceCoverageTone(row.status),
                            )}
                          >
                            {row.statusLabel}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </div>
      }
      sidebar={
        <TripDetailSection title="下一步">
          {view.hasAmbiguity || view.routeIssue ? (
            <div className="rounded-lg border border-gate-confirm-border/40 bg-gate-confirm/5 p-3">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gate-confirm-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">建议先处理保障缺口</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    车辆、路线或保险存在未确认项，可能影响实际执行。
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">当前未发现明显的预订与保障阻断项。</p>
          )}
          {onOpenDecisions ? (
            <button
              type="button"
              className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
              onClick={onOpenDecisions}
            >
              {TRIP_DETAIL_NAV.goOverviewToHandle}
            </button>
          ) : null}
        </TripDetailSection>
      }
    />
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/40 bg-muted/10 px-3 py-2">
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
