import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ExperienceExplanationCard } from '@/types/experience-fulfillment';
import { AlertTriangle, CheckCircle2, Lightbulb, ShieldAlert } from 'lucide-react';
import { CertaintyBadge } from './CertaintyBadge';

interface ExperienceExplanationCardViewProps {
  data: ExperienceExplanationCard;
  className?: string;
  compact?: boolean;
}

function DimensionRow({
  label,
  level,
  labelZh,
  detail,
}: {
  label: string;
  level: ExperienceExplanationCard['dimensions']['routeFeasibility']['level'];
  labelZh: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <CertaintyBadge level={level} label={labelZh} />
      </div>
      <p className="text-sm leading-relaxed">{detail}</p>
    </div>
  );
}

export function ExperienceExplanationCardView({
  data,
  className,
  compact = false,
}: ExperienceExplanationCardViewProps) {
  return (
    <Card className={cn('border-slate-200', className)}>
      <CardHeader className={cn('pb-3', compact && 'pb-2')}>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-slate-600" aria-hidden />
            为什么推荐
          </CardTitle>
          <CertaintyBadge level={data.overallLevel} label={data.overallLabelZh} />
        </div>
        {!compact && (
          <CardDescription className="text-sm leading-relaxed">{data.overallSummary}</CardDescription>
        )}
      </CardHeader>
      <CardContent className={cn('space-y-4', compact && 'space-y-3 pt-0')}>
        {data.whyRecommended.length > 0 && (
          <ul className="space-y-1.5">
            {data.whyRecommended.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}

        {!compact && (
          <div className="space-y-2">
            <DimensionRow
              label="路线可行性"
              level={data.dimensions.routeFeasibility.level}
              labelZh={data.dimensions.routeFeasibility.labelZh}
              detail={data.dimensions.routeFeasibility.detail}
            />
            <DimensionRow
              label="体验匹配"
              level={data.dimensions.experienceMatch.level}
              labelZh={data.dimensions.experienceMatch.labelZh}
              detail={data.dimensions.experienceMatch.detail}
            />
            <DimensionRow
              label="变化因素"
              level={data.dimensions.changingFactors.level}
              labelZh={data.dimensions.changingFactors.labelZh}
              detail={data.dimensions.changingFactors.detail}
            />
            {data.dimensions.changingFactors.factors?.length ? (
              <ul className="text-xs text-muted-foreground list-disc list-inside pl-1">
                {data.dimensions.changingFactors.factors.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        {data.risks.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-1.5">
            <p className="text-xs font-medium text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              风险提示
            </p>
            <ul className="text-sm text-amber-950 space-y-1">
              {data.risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {data.planBHints.length > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-1.5">
            <p className="text-xs font-medium text-blue-900 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
              备选方案
            </p>
            <ul className="text-sm text-blue-950 space-y-1">
              {data.planBHints.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
