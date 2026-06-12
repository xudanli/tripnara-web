import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LegEvidenceCard } from '@/types/leg-evidence';
import { AlertTriangle, Footprints, Route } from 'lucide-react';

export interface LegEvidenceCardsPanelProps {
  cards: LegEvidenceCard[];
  headlineZh?: string;
  className?: string;
}

function modeLabel(mode: string | undefined): string | null {
  if (!mode) return null;
  const m = mode.toLowerCase();
  if (m === 'walk' || m === 'walking') return '步行';
  if (m === 'drive' || m === 'driving') return '驾车';
  if (m === 'transit') return '公共交通';
  return mode;
}

function collectTips(card: LegEvidenceCard): string[] {
  const tips = [...(card.pitfall_tips_zh ?? [])];
  if (card.elderly_warn_zh?.trim()) tips.push(card.elderly_warn_zh.trim());
  if (card.slope_warning_zh?.trim()) tips.push(card.slope_warning_zh.trim());
  if (card.opening_hours_tip_zh?.trim()) tips.push(card.opening_hours_tip_zh.trim());
  return [...new Set(tips)];
}

export function LegEvidenceCardsPanel({ cards, headlineZh, className }: LegEvidenceCardsPanelProps) {
  if (!cards.length) return null;

  return (
    <Card className={cn('border-border/80 bg-card/60', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Route className="h-4 w-4 text-primary" aria-hidden />
          {headlineZh?.trim() || '路段提示'}
        </CardTitle>
        <CardDescription className="text-xs">
          相邻 POI 间的距离、耗时与避坑说明（NARRATE 路段证据）
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {cards.map((card, idx) => {
          const tips = collectTips(card);
          const key = card.leg_id ?? `${card.summary_zh}-${idx}`;
          const routeLabel =
            card.from_label_zh && card.to_label_zh
              ? `${card.from_label_zh} → ${card.to_label_zh}`
              : null;
          const mode = modeLabel(card.travel_mode);

          return (
            <div
              key={key}
              className="rounded-lg border border-border/70 bg-muted/15 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {mode ? (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Footprints className="h-3 w-3" aria-hidden />
                    {mode}
                  </Badge>
                ) : null}
                {card.max_slope_pct != null && card.max_slope_pct > 8 ? (
                  <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-800">
                    坡度 {Math.round(card.max_slope_pct)}%
                  </Badge>
                ) : null}
              </div>
              {routeLabel ? (
                <div className="mt-1 text-[11px] text-muted-foreground">{routeLabel}</div>
              ) : null}
              <div className="mt-1 text-sm font-medium text-foreground">{card.summary_zh}</div>
              {tips.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {tips.map((tip) => (
                    <li
                      key={tip}
                      className="flex items-start gap-1.5 text-xs text-amber-900/90 dark:text-amber-100/90"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
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
