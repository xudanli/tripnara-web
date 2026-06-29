import { Check } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type {
  JourneyInspectorFitAssessment,
  JourneyInspectorMemberRow,
} from '../types-inspector-view';
import type { JourneyInspectorActivityHeader } from '../types-inspector-view';
import {
  journeyMapStatCell,
  journeyMapStatLabel,
  journeyMapStatValue,
  workbenchCard,
} from '../journey-map-ui';
import { JourneyMapInspectorHeader } from './JourneyMapInspectorHeader';

export interface JourneyMapParticipantsPanelProps {
  header: JourneyInspectorActivityHeader;
  memberRows: JourneyInspectorMemberRow[];
  fitAssessment: JourneyInspectorFitAssessment | null;
}

export function JourneyMapParticipantsPanel({
  header,
  memberRows,
  fitAssessment,
}: JourneyMapParticipantsPanelProps) {
  const participating = memberRows.filter((r) => r.participating);
  const nonParticipating = memberRows.filter((r) => !r.participating);

  return (
    <div>
      <JourneyMapInspectorHeader header={header} />

      <div className="space-y-4 p-4">
        <section>
          <p className="mb-2 text-xs font-semibold text-foreground">
            参加成员 ({participating.length})
          </p>
          <ul className="space-y-2">
            {participating.map((row) => (
              <MemberRow key={row.member.id} row={row} />
            ))}
          </ul>
        </section>

        {nonParticipating.length > 0 ? (
          <section>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              不参加成员 ({nonParticipating.length})
            </p>
            <ul className="space-y-2">
              {nonParticipating.map((row) => (
                <MemberRow key={row.member.id} row={row} muted />
              ))}
            </ul>
          </section>
        ) : null}

        {fitAssessment ? (
          <section className={cn(workbenchCard, 'space-y-3 p-3')}>
            <p className="text-[11px] font-semibold text-foreground">成员适配评估</p>
            <div className="grid grid-cols-2 gap-2">
              {fitAssessment.suitabilityPercent != null ? (
                <div className={journeyMapStatCell}>
                  <p className={journeyMapStatLabel}>参与适配度</p>
                  <p className={journeyMapStatValue}>
                    {fitAssessment.suitabilityPercent}%
                    {fitAssessment.suitabilityLabel ? (
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        {fitAssessment.suitabilityLabel}
                      </span>
                    ) : null}
                  </p>
                </div>
              ) : null}
              {fitAssessment.physicalRequirement ? (
                <MetricChip label="体力要求" value={fitAssessment.physicalRequirement} />
              ) : null}
              {fitAssessment.riskLevel ? (
                <MetricChip label="风险等级" value={fitAssessment.riskLevel} />
              ) : null}
              {fitAssessment.weatherImpact ? (
                <MetricChip label="天气影响" value={fitAssessment.weatherImpact} />
              ) : null}
            </div>
            {fitAssessment.suggestion ? (
              <p className="rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
                建议：{fitAssessment.suggestion}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function MemberRow({ row, muted }: { row: JourneyInspectorMemberRow; muted?: boolean }) {
  return (
    <li
      className={cn(
        'flex items-start gap-2.5 rounded-lg border border-border/60 px-2.5 py-2',
        muted ? 'bg-muted/10 opacity-90' : 'bg-muted/15',
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className="text-[10px] font-medium text-white"
          style={{ backgroundColor: row.member.avatarColor ?? '#64748b' }}
        >
          {row.member.initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-foreground">{row.member.name}</span>
          {row.participating ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-nara-tundra-foreground" aria-hidden />
          ) : null}
        </div>
        {row.tags?.length ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground">{row.tags.join(' · ')}</p>
        ) : null}
        {row.alternativePlan ? (
          <p className="mt-1 text-[10px] text-gate-suggest-foreground">
            替代计划：{row.alternativePlan}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className={journeyMapStatCell}>
      <p className={journeyMapStatLabel}>{label}</p>
      <p className="mt-0.5 text-xs font-semibold text-foreground">{value}</p>
    </div>
  );
}
