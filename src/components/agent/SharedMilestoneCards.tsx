import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SharedMilestoneUiCard } from '@/types/shared-milestone';
import { Heart, Sparkles } from 'lucide-react';

export interface SharedMilestoneCardsProps {
  cards: SharedMilestoneUiCard[];
  className?: string;
}

function sentimentStyles(sentiment: string | undefined): {
  card: string;
  badge: string;
  label: string;
} {
  if (sentiment === 'NEGATIVE_TRAUMA') {
    return {
      card: 'border-violet-200/80 bg-violet-50/40 dark:border-violet-900/40 dark:bg-violet-950/20',
      badge: 'border-violet-300/60 text-violet-900 dark:text-violet-100',
      label: '共同回忆',
    };
  }
  if (sentiment === 'POSITIVE_HIGH') {
    return {
      card: 'border-emerald-200/70 bg-emerald-50/35 dark:border-emerald-900/35 dark:bg-emerald-950/15',
      badge: 'border-emerald-400/50 text-emerald-900 dark:text-emerald-100',
      label: '高光时刻',
    };
  }
  return {
    card: 'border-border/70 bg-muted/15',
    badge: 'border-border text-muted-foreground',
    label: '回忆',
  };
}

export function SharedMilestoneCards({ cards, className }: SharedMilestoneCardsProps) {
  if (!cards.length) return null;

  return (
    <Card className={cn('border-border/80 bg-card/60', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" aria-hidden />
          共同回忆
        </CardTitle>
        <CardDescription className="text-xs">跨行程记忆，用于个性化陪伴（非 scare 向展示）</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {cards.map((card, idx) => {
          const styles = sentimentStyles(card.sentiment);
          const key = card.card_id ?? `${card.title_zh}-${idx}`;
          const isPositive = card.sentiment === 'POSITIVE_HIGH';

          return (
            <div key={key} className={cn('rounded-lg border px-3 py-2.5', styles.card)}>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={cn('text-[10px]', styles.badge)}>
                  {isPositive ? (
                    <Sparkles className="mr-1 h-3 w-3 inline" aria-hidden />
                  ) : null}
                  {styles.label}
                </Badge>
                {card.when_label_zh ? (
                  <span className="text-[10px] text-muted-foreground">{card.when_label_zh}</span>
                ) : null}
              </div>
              {card.title_zh ? (
                <div className="mt-1 text-sm font-medium text-foreground">{card.title_zh}</div>
              ) : null}
              {card.summary_zh ? (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.summary_zh}</p>
              ) : null}
              {card.tags_zh?.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {card.tags_zh.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] font-normal">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
