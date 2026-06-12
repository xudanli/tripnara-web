import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { PoiPitfallCard } from '@/types/poi-pitfall';
import { AlertTriangle, Info, MapPin, ShieldAlert } from 'lucide-react';

export interface PoiPitfallCardsPanelProps {
  cards: PoiPitfallCard[];
  headlineZh?: string;
  className?: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  info: 'border-sky-500/25 bg-sky-50/40 dark:bg-sky-950/20',
  warn: 'border-amber-500/30 bg-amber-50/45 dark:bg-amber-950/25',
  block: 'border-red-500/30 bg-red-50/45 dark:bg-red-950/25',
};

const SOURCE_LABELS: Record<string, string> = {
  rag: 'RAG',
  heuristic: '启发式',
  narrate: 'NARRATE',
};

function SeverityIcon({ severity }: { severity?: string }) {
  if (severity === 'block') return <ShieldAlert className="h-3.5 w-3.5 text-red-600" aria-hidden />;
  if (severity === 'warn') return <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden />;
  return <Info className="h-3.5 w-3.5 text-sky-600" aria-hidden />;
}

function cardTitle(card: PoiPitfallCard): string {
  return card.headline_zh?.trim() || card.poi_name_zh?.trim() || card.summary_zh?.trim() || '地点避坑';
}

export function PoiPitfallCardsPanel({ cards, headlineZh, className }: PoiPitfallCardsPanelProps) {
  if (!cards.length) return null;

  return (
    <Card className={cn('border-border/80 bg-card/60', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" aria-hidden />
          {headlineZh?.trim() || 'POI 避坑指南'}
        </CardTitle>
        <CardDescription className="text-xs">
          NARRATE RAG 或 enrichClientUiDisplay 启发式生成；含开放时间、排队与入口提示。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {cards.map((card, idx) => {
          const key = card.card_id ?? card.itinerary_item_id ?? `${cardTitle(card)}-${idx}`;
          const severity = card.severity ?? 'warn';
          const tips = card.pitfall_tips_zh ?? [];

          return (
            <div
              key={key}
              className={cn('rounded-lg border px-3 py-2.5', SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.warn)}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <SeverityIcon severity={severity} />
                <span className="text-sm font-medium text-foreground">{cardTitle(card)}</span>
                {card.source ? (
                  <Badge variant="outline" className="text-[10px] h-5">
                    {SOURCE_LABELS[card.source] ?? card.source}
                  </Badge>
                ) : null}
                {card.day_date ? (
                  <span className="text-[10px] text-muted-foreground tabular-nums">{card.day_date}</span>
                ) : null}
              </div>
              {card.summary_zh && card.summary_zh !== cardTitle(card) ? (
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{card.summary_zh}</p>
              ) : null}
              {tips.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {tips.map((tip) => (
                    <li key={tip} className="flex items-start gap-1.5 text-xs text-foreground/90">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" aria-hidden />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
