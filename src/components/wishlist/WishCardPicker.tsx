import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { tripWishesApi } from '@/api/trip-wishes';
import type { WishCategory, WishSuggestionCard, WishVisibility } from '@/types/trip-wishes';
import { categoryLabel } from '@/lib/wishlist-model';
import { useWishCategories } from '@/hooks/useWishCategories';
import { WishImportanceDots } from './WishImportanceDots';
import { WishVisibilityToggle } from './WishVisibilityToggle';
import { Slider } from '@/components/ui/slider';
import { Spinner } from '@/components/ui/spinner';
import type { WishDraft } from '@/lib/wish-draft';
import { wishConfirmBox, wishHint, wishLabel } from './wishlist-ui';

export type { WishDraft };

interface WishCardPickerProps {
  tripId: string;
  onSubmit: (draft: WishDraft) => void | Promise<void>;
  submitting?: boolean;
}

export function WishCardPicker({ tripId, onSubmit, submitting }: WishCardPickerProps) {
  const { categories } = useWishCategories(tripId);
  const [cards, setCards] = useState<WishSuggestionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importance, setImportance] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [visibility, setVisibility] = useState<WishVisibility>('private');

  const loadCards = useCallback(async (category?: WishCategory) => {
    setLoading(true);
    try {
      const res = await tripWishesApi.getSuggestionCards(tripId, category);
      setCards(res.cards);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  const selectedCards = useMemo(
    () => cards.filter((c) => selectedIds.has(c.id)),
    [cards, selectedIds],
  );

  const toggleCard = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRefresh = () => {
    void loadCards();
    setSelectedIds(new Set());
  };

  const handleSubmit = async () => {
    for (const card of selectedCards) {
      await onSubmit({
        category: card.category,
        text: card.defaultText,
        importance,
        visibility,
        cardId: card.id,
      });
    }
    setSelectedIds(new Set());
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (cards.length === 0) {
    return <p className={cn('py-4 text-center', wishHint)}>暂无推荐卡片，请稍后再试</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className={wishHint}>
          <Sparkles className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
          基于行程推荐，点选加入心愿单
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          换一批
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {cards.map((card) => {
          const selected = selectedIds.has(card.id);
          const categoryName = categoryLabel(card.category, categories);

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => toggleCard(card.id)}
              aria-pressed={selected}
              className={cn(
                'flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left transition-colors',
                'hover:border-primary/30 hover:bg-muted/40',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                selected
                  ? 'border-primary/40 bg-primary/[0.04]'
                  : 'border-border/80 bg-card',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/35 bg-background',
                )}
              >
                {selected ? <Check className="h-2 w-2" strokeWidth={3} /> : null}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-1">
                  <span className="truncate text-xs font-medium leading-tight">{card.title}</span>
                  <span className="shrink-0 text-[10px] leading-none text-muted-foreground">
                    {categoryName}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[11px] leading-snug text-muted-foreground">
                  {card.subtitle ?? card.defaultText}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {selectedCards.length > 0 ? (
        <div className={cn(wishConfirmBox, 'space-y-2.5 p-2.5')}>
          <div className={cn('flex items-center justify-between', wishLabel)}>
            <span>已选 {selectedCards.length} 项 · 在意程度</span>
            <WishImportanceDots value={importance} />
          </div>
          <Slider
            value={[importance]}
            min={1}
            max={5}
            step={1}
            onValueChange={([v]) => setImportance(v as 1 | 2 | 3 | 4 | 5)}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={wishLabel}>可见范围</span>
            <WishVisibilityToggle value={visibility} onChange={setVisibility} compact />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 w-full"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? '提交中…' : '加入心愿单'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
