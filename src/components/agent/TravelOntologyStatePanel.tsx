import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TravelOntologyState } from '@/types/travel-ontology-state';
import { summarizeTravelOntologyState } from '@/lib/travel-ontology-state.util';
import { useTranslation } from 'react-i18next';

export interface TravelOntologyStatePanelProps {
  state: TravelOntologyState;
  className?: string;
  defaultCollapsed?: boolean;
}

function EntityList({
  title,
  items,
}: {
  title: string;
  items: { id?: string; label: string; status?: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-muted-foreground">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.id ?? item.label}
            className="flex items-center justify-between gap-2 rounded border bg-background/70 px-2 py-1 text-xs"
          >
            <span className="truncate">{item.label}</span>
            {item.status ? (
              <Badge variant="outline" className="text-[9px] shrink-0">
                {item.status}
              </Badge>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TravelOntologyStatePanel({
  state,
  className,
  defaultCollapsed = true,
}: TravelOntologyStatePanelProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(!defaultCollapsed);
  const summaryLine = summarizeTravelOntologyState(state);

  return (
    <Card
      className={cn(
        'border-slate-200/80 bg-slate-50/30 dark:border-slate-800 dark:bg-slate-950/20',
        className
      )}
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Layers className="h-4 w-4 shrink-0 text-slate-600" />
            {t('agent.travelOntology.title', { defaultValue: '行程状态' })}
            {state.pendingConfirmCount != null && state.pendingConfirmCount > 0 ? (
              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-800">
                {t('agent.travelOntology.pendingCount', {
                  defaultValue: '{{count}} 项待确认',
                  count: state.pendingConfirmCount,
                })}
              </Badge>
            ) : null}
          </div>
          {!expanded && summaryLine ? (
            <p className="mt-1 text-[11px] text-muted-foreground truncate">{summaryLine}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded ? (
        <CardContent className="space-y-3 border-t pt-3 pb-3">
          {state.summary ? (
            <p className="text-xs text-muted-foreground leading-relaxed">{state.summary}</p>
          ) : null}

          {state.verbs && state.verbs.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">
                {t('agent.travelOntology.verbs', { defaultValue: '系统建议动作' })}
              </p>
              <ul className="space-y-1">
                {state.verbs.map((verb) => (
                  <li
                    key={verb.id}
                    className="flex items-center justify-between gap-2 rounded border border-amber-200/60 bg-amber-50/40 px-2 py-1.5 text-xs dark:border-amber-900/40 dark:bg-amber-950/20"
                  >
                    <span>{verb.label}</span>
                    <div className="flex gap-1 shrink-0">
                      {verb.status ? (
                        <Badge variant="outline" className="text-[9px]">
                          {verb.status}
                        </Badge>
                      ) : null}
                      {verb.riskLevel ? (
                        <Badge variant="outline" className="text-[9px]">
                          {verb.riskLevel}
                        </Badge>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <EntityList
            title={t('agent.travelOntology.flights', { defaultValue: '航班' })}
            items={state.flights ?? []}
          />
          <EntityList
            title={t('agent.travelOntology.hotels', { defaultValue: '住宿' })}
            items={state.hotels ?? []}
          />
          <EntityList
            title={t('agent.travelOntology.activities', { defaultValue: '活动' })}
            items={state.activities ?? []}
          />

          <p className="text-[10px] text-muted-foreground">
            {t('agent.travelOntology.disclaimer', {
              defaultValue: '以上为系统理解的行程状态摘要，需您自行确认后才会执行任何变更。',
            })}
          </p>
        </CardContent>
      ) : null}
    </Card>
  );
}
