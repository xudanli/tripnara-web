import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tripsApi } from '@/api/trips';
import { Spinner } from '@/components/ui/spinner';
import type { DecisionLogEntry } from '@/types/trip';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const PREVIEW_LIMIT = 5;

function personaLabel(persona?: string): string {
  switch (persona) {
    case 'ABU':
      return 'Abu';
    case 'DR_DRE':
      return 'Dr.Dre';
    case 'NEPTUNE':
      return 'Neptune';
    default:
      return persona ?? '';
  }
}

export interface DecisionStripDecisionLogPreviewProps {
  tripId: string;
  enabled: boolean;
}

export function DecisionStripDecisionLogPreview({
  tripId,
  enabled,
}: DecisionStripDecisionLogPreviewProps) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<DecisionLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || loaded) return;

    let cancelled = false;
    setLoading(true);

    void tripsApi
      .getDecisionLog(tripId, PREVIEW_LIMIT, 0)
      .then((response) => {
        if (cancelled) return;
        setLogs(response.items ?? []);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLogs([]);
        setLoaded(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, loaded, tripId]);

  if (!enabled) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
        <Spinner className="h-3.5 w-3.5" />
        {t('planStudio.decisionStrip.decisionLogLoading', { defaultValue: '加载决策记录…' })}
      </div>
    );
  }

  if (logs.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {t('planStudio.decisionStrip.decisionLogTitle', { defaultValue: '最近决策' })}
      </p>
      {logs.map((log) => {
        const label = personaLabel(log.persona);
        return (
          <p key={log.id} className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground/70">
              {format(new Date(log.date), 'M/d', { locale: zhCN })}
            </span>
            {label ? ` · ${label}` : ''}
            {' · '}
            {log.description}
          </p>
        );
      })}
    </div>
  );
}
