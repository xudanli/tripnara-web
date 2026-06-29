import { Check, Shield, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { JourneyMapDecisionItem } from '@/api/journey-map';
import type { JourneyInspectorActivityHeader, JourneyInspectorRiskView } from '../types-inspector-view';
import {
  journeyMapFocusRing,
  journeyMapStatCell,
  journeyMapStatLabel,
  journeyMapStatValue,
  workbenchCard,
} from '../journey-map-ui';
import { JourneyMapInspectorHeader } from './JourneyMapInspectorHeader';

export interface JourneyMapRiskPanelProps {
  header: JourneyInspectorActivityHeader;
  riskView: JourneyInspectorRiskView;
  decisionItems?: JourneyMapDecisionItem[];
  canCreateDecision?: boolean;
  onCreateDecision?: () => void;
}

export function JourneyMapRiskPanel({
  header,
  riskView,
  decisionItems = [],
  canCreateDecision,
  onCreateDecision,
}: JourneyMapRiskPanelProps) {
  const levelClass =
    riskView.level === 'high'
      ? 'border-gate-reject-border/60 bg-gate-reject/10 text-gate-reject-foreground'
      : riskView.level === 'medium'
        ? 'border-gate-confirm-border/60 bg-gate-confirm/10 text-gate-confirm-foreground'
        : 'border-border/60 bg-muted/15 text-muted-foreground';

  return (
    <div>
      <JourneyMapInspectorHeader header={header} />

      <div className="space-y-4 p-4">
        <section className={cn(workbenchCard, 'flex flex-wrap items-start justify-between gap-3 p-3')}>
          <div>
            <Badge variant="outline" className={cn('h-6 text-[11px] font-semibold', levelClass)}>
              {riskView.levelLabel}
            </Badge>
            {riskView.updatedAtLabel ? (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                更新于 {riskView.updatedAtLabel}
              </p>
            ) : null}
          </div>
          {riskView.score != null ? (
            <div className="text-right">
              <p className={journeyMapStatLabel}>综合风险评分</p>
              <p className="text-2xl font-semibold tabular-nums text-gate-reject-foreground">
                {riskView.score}
                <span className="text-sm font-normal text-muted-foreground"> / 100</span>
              </p>
            </div>
          ) : null}
        </section>

        <section className="grid grid-cols-2 gap-2">
          {riskView.affectedCount != null && riskView.totalCount != null ? (
            <div className={journeyMapStatCell}>
              <p className={journeyMapStatLabel}>受影响成员</p>
              <p className={journeyMapStatValue}>
                {riskView.affectedCount} / {riskView.totalCount} 人
              </p>
            </div>
          ) : null}
          {riskView.impactScope?.hubs ? (
            <div className={journeyMapStatCell}>
              <p className={journeyMapStatLabel}>行程枢纽</p>
              <p className="mt-0.5 text-xs font-semibold text-foreground">{riskView.impactScope.hubs}</p>
            </div>
          ) : null}
        </section>

        {riskView.keyRisks.length > 0 ? (
          <section>
            <p className="mb-2 text-[11px] font-semibold text-foreground">关键风险</p>
            <div className="flex flex-wrap gap-1.5">
              {riskView.keyRisks.map((label) => (
                <Badge
                  key={label}
                  variant="secondary"
                  className="h-6 gap-1 text-[10px] font-normal"
                >
                  <Shield className="h-3 w-3 opacity-60" aria-hidden />
                  {label}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        {(riskView.majorRisks?.length ?? 0) > 0 ? (
          <section className={cn(workbenchCard, 'overflow-hidden p-0')}>
            <p className="border-b border-border/60 px-3 py-2 text-[11px] font-semibold text-foreground">
              主要风险
            </p>
            <ul className="divide-y divide-border/50">
              {riskView.majorRisks!.map((row, i) => (
                <li key={i} className="flex items-start justify-between gap-2 px-3 py-2 text-[11px]">
                  <span className="text-foreground">{row.description}</span>
                  <SeverityBadge severity={row.severity} tone={row.severityTone} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {(riskView.impactScope?.members ||
          riskView.impactScope?.time ||
          riskView.impactScope?.budget) && (
          <section>
            <p className="mb-2 text-[11px] font-semibold text-foreground">影响范围</p>
            <div className="grid grid-cols-2 gap-2">
              {riskView.impactScope?.members ? (
                <ImpactCell label="成员" value={riskView.impactScope.members} />
              ) : null}
              {riskView.impactScope?.time ? (
                <ImpactCell label="时间影响" value={riskView.impactScope.time} />
              ) : null}
              {riskView.impactScope?.budget ? (
                <ImpactCell label="预算影响" value={riskView.impactScope.budget} />
              ) : null}
            </div>
          </section>
        )}

        {(riskView.mitigations?.length ?? 0) > 0 ? (
          <section className={cn(workbenchCard, 'p-3')}>
            <p className="text-[11px] font-semibold text-foreground">建议缓解措施</p>
            <ul className="mt-2 space-y-2">
              {riskView.mitigations!.map((item) => (
                <li key={item} className="flex gap-2 text-[11px] leading-relaxed text-muted-foreground">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-nara-tundra-foreground" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {decisionItems.length > 0 ? (
          <section className={cn(workbenchCard, 'overflow-hidden p-0')}>
            <p className="border-b border-border/60 px-3 py-2 text-[11px] font-semibold text-foreground">
              关联决策事项
            </p>
            <ul className="divide-y divide-border/50">
              {decisionItems.map((item) => (
                <li key={item.id} className="px-3 py-2 text-[11px]">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {item.status} · {item.severity}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {canCreateDecision ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn('h-9 w-full gap-2', journeyMapFocusRing)}
            onClick={onCreateDecision}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            创建决策事项
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SeverityBadge({
  severity,
  tone,
}: {
  severity: string;
  tone: 'high' | 'medium' | 'low';
}) {
  const cls =
    tone === 'high'
      ? 'border-gate-reject-border text-gate-reject-foreground'
      : tone === 'medium'
        ? 'border-gate-confirm-border text-gate-confirm-foreground'
        : 'border-border text-muted-foreground';

  return (
    <Badge variant="outline" className={cn('h-5 shrink-0 text-[10px]', cls)}>
      {severity}
    </Badge>
  );
}

function ImpactCell({ label, value }: { label: string; value: string }) {
  return (
    <div className={journeyMapStatCell}>
      <p className={journeyMapStatLabel}>{label}</p>
      <p className="mt-0.5 text-xs font-semibold text-foreground">{value}</p>
    </div>
  );
}
