import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import CascadeImpactCard from '@/components/readiness/CascadeImpactCard';
import type { ProactiveNarrationBundle } from '@/lib/route-run-proactive-narration.util';
import { useTranslation } from 'react-i18next';

export interface ProactiveNarrationPanelProps {
  bundle: ProactiveNarrationBundle;
  className?: string;
  compact?: boolean;
}

export default function ProactiveNarrationPanel({
  bundle,
  className,
  compact = false,
}: ProactiveNarrationPanelProps) {
  const { t } = useTranslation();
  const { tips, researchHints, cascadeHints } = bundle;
  const hasContent = tips.length > 0 || researchHints.length > 0 || cascadeHints.length > 0;
  if (!hasContent) return null;

  return (
    <Card
      className={cn(
        'border-border/80 bg-muted/15 dark:bg-muted/10',
        compact && 'shadow-none',
        className
      )}
    >
      <CardHeader className={cn('pb-2', compact && 'py-3')}>
        <CardTitle className={cn('flex items-center gap-2 text-base', compact && 'text-sm')}>
          <Bell className="h-4 w-4 text-muted-foreground" />
          {t('agent.proactiveNarration.title', { defaultValue: '主动提示' })}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('agent.proactiveNarration.disclaimer', {
            defaultValue: '以下为建议性提示，需您自行确认；TripNARA 不代订、不自动改签。',
          })}
        </p>
      </CardHeader>
      <CardContent className={cn('space-y-2', compact && 'pt-0')}>
        {tips.map((tip) => (
          <div
            key={tip}
            className="rounded-lg border border-border/70 bg-card px-3 py-2 text-sm leading-snug"
          >
            <Badge variant="outline" className="mb-1.5 text-[10px] border-border text-muted-foreground">
              {t('agent.proactiveNarration.tipBadge', { defaultValue: '建议' })}
            </Badge>
            <p>{tip}</p>
          </div>
        ))}

        {researchHints.map((hint) => (
          <div
            key={`${hint.scope}|${hint.message}`}
            className="rounded-lg border border-border/70 bg-card px-3 py-2 text-sm leading-snug"
          >
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                {t('agent.proactiveNarration.tipBadge', { defaultValue: '建议' })}
              </Badge>
              {hint.scope ? (
                <span className="text-[10px] text-muted-foreground font-mono">{hint.scope}</span>
              ) : null}
            </div>
            {hint.title ? <p className="text-xs font-medium text-muted-foreground">{hint.title}</p> : null}
            <p>{hint.message}</p>
            <p className="mt-1.5 flex items-start gap-1 text-[11px] text-amber-800/90 dark:text-amber-200/90">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {t('agent.proactiveNarration.confirmRequired', { defaultValue: '需您自行确认' })}
            </p>
          </div>
        ))}

        {cascadeHints.map((hint) => (
          <CascadeImpactCard key={hint.id} hint={hint} showActions={false} />
        ))}
      </CardContent>
    </Card>
  );
}
