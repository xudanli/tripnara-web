import { Link } from 'react-router-dom';
import { ExternalLink, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ActiveTripContextualCard } from '@/types/active-trip-dashboard';

const PRIORITY_LABELS: Record<ActiveTripContextualCard['priority'], string> = {
  critical: '关键',
  high: '高优',
  normal: '常规',
};

type ContextualCardsToolboxProps = {
  cards: ActiveTripContextualCard[];
  className?: string;
};

/** 场景工具箱 · contextualCards */
export function ContextualCardsToolbox({ cards, className }: ContextualCardsToolboxProps) {
  if (!cards.length) return null;

  return (
    <section
      className={cn('rounded-xl border border-border bg-card px-4 py-3.5 text-sm shadow-sm', className)}
      aria-label="场景工具箱"
    >
      <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        场景工具箱
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Vibe 情境卡片 · 点击深链打开工具</p>

      <ul className="mt-3 space-y-2">
        {cards.map((card) => (
          <li
            key={card.cardId}
            className="rounded-lg border border-border/60 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{card.titleZh}</p>
                {card.descriptionZh && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{card.descriptionZh}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-1">
                <Badge variant="outline" className="text-[10px] font-normal">
                  {PRIORITY_LABELS[card.priority]}
                </Badge>
                {card.vaultLinked && (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    Vault
                  </Badge>
                )}
              </div>
            </div>
            {card.toolRoute && (
              <Button variant="link" size="sm" className="mt-1 h-auto px-0 text-xs" asChild>
                <Link to={card.toolRoute}>
                  打开工具
                  <ExternalLink className="ml-1 h-3 w-3" aria-hidden />
                </Link>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
