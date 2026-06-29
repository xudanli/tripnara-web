import { Phone, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { JourneyInspectorActivityHeader, JourneyInspectorDiversionDetail } from '../types-inspector-view';
import {
  journeyMapDiversionCard,
  journeyMapDiversionCardLineA,
  journeyMapDiversionCardLineB,
  journeyMapFocusRing,
  journeyMapStatLabel,
  workbenchCard,
} from '../journey-map-ui';
import { JourneyMapInspectorHeader } from './JourneyMapInspectorHeader';

export interface JourneyMapDiversionDetailPanelProps {
  header: JourneyInspectorActivityHeader;
  detail: JourneyInspectorDiversionDetail;
  canEdit?: boolean;
  onEdit?: () => void;
}

export function JourneyMapDiversionDetailPanel({
  header,
  detail,
  canEdit,
  onEdit,
}: JourneyMapDiversionDetailPanelProps) {
  return (
    <div>
      <JourneyMapInspectorHeader header={header} />

      <div className="space-y-4 p-4">
        {detail.overview ? (
          <section className={cn(workbenchCard, 'p-3')}>
            <p className="text-[11px] font-semibold text-foreground">分流概览</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{detail.overview}</p>
          </section>
        ) : null}

        <section className="grid grid-cols-2 gap-2 text-xs">
          {detail.splitTime ? (
            <InfoCell label="分流时间" value={detail.splitTime} />
          ) : null}
          {detail.meetingPoint ? (
            <InfoCell label="集合点" value={detail.meetingPoint} className="col-span-2" />
          ) : null}
          {detail.meetingTime ? (
            <InfoCell label="集合时间" value={detail.meetingTime} />
          ) : null}
        </section>

        <GroupDetailCard group="a" detail={detail.groupA} />
        <GroupDetailCard group="b" detail={detail.groupB} />

        {detail.emergencyContact ? (
          <section className={cn(workbenchCard, 'flex gap-2.5 p-3')}>
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-[11px] font-semibold text-foreground">应急联系</p>
              <p className="mt-0.5 text-xs font-medium tabular-nums text-foreground">
                {detail.emergencyContact}
              </p>
              {detail.emergencyNote ? (
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {detail.emergencyNote}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn('h-9 w-full gap-2', journeyMapFocusRing)}
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            编辑分流
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function InfoCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-border/60 bg-muted/10 px-2.5 py-2', className)}>
      <p className={journeyMapStatLabel}>{label}</p>
      <p className="mt-0.5 font-medium text-foreground">{value}</p>
    </div>
  );
}

function GroupDetailCard({
  group,
  detail,
}: {
  group: 'a' | 'b';
  detail: JourneyInspectorDiversionDetail['groupA'];
}) {
  const rows: Array<[string, string | undefined]> = [
    ['活动', detail.activityType],
    ['时间', detail.timeRange],
    ['交通', detail.transport],
    ['路线', detail.route],
    ['预估费用', detail.estimatedCost],
    ['风险等级', detail.riskLevel],
  ];

  return (
    <div className={journeyMapDiversionCard}>
      <div
        className={cn(
          group === 'a' ? journeyMapDiversionCardLineA : journeyMapDiversionCardLineB,
          'space-y-2',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-foreground">{detail.label}</span>
          {detail.badge ? (
            <Badge variant="secondary" className="h-5 text-[10px]">
              {detail.badge}
            </Badge>
          ) : null}
          <Badge variant="outline" className="ml-auto h-5 text-[10px] tabular-nums">
            {detail.participantCount} 人
          </Badge>
        </div>
        <dl className="grid gap-1.5">
          {rows.map(([label, value]) =>
            value ? (
              <div key={label} className="flex justify-between gap-2 text-[11px]">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium text-foreground">{value}</dd>
              </div>
            ) : null,
          )}
        </dl>
      </div>
    </div>
  );
}
