import { useCallback, useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import {
  Dialog,
  StackedDialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import type { InspirationAsset, WishCategory, WishVisibility } from '@/types/trip-wishes';
import { tripWishesApi } from '@/api/trip-wishes';
import { WishImportanceDots } from './WishImportanceDots';
import { WishVisibilityToggle } from './WishVisibilityToggle';
import { WishCategorySelect } from './WishCategorySelect';
import type { WishDraft } from '@/lib/wish-draft';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { wishHint, wishLabel } from './wishlist-ui';

interface WishInspirationGalleryProps {
  tripId: string;
  onSubmit: (draft: WishDraft) => void | Promise<void>;
  submitting?: boolean;
}

export function WishInspirationGallery({
  tripId,
  onSubmit,
  submitting,
}: WishInspirationGalleryProps) {
  const [items, setItems] = useState<InspirationAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<InspirationAsset | null>(null);
  const [category, setCategory] = useState<WishCategory>('activities');
  const [text, setText] = useState('');
  const [importance, setImportance] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [visibility, setVisibility] = useState<WishVisibility>('private');

  const loadInspiration = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tripWishesApi.getInspiration(tripId, { offset: 0, limit: 20 });
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void loadInspiration();
  }, [loadInspiration]);

  const openConfirm = (item: InspirationAsset) => {
    setPending(item);
    setCategory('activities');
    setText(item.caption);
    setImportance(4);
    setVisibility('private');
  };

  const handleConfirm = async () => {
    if (!pending) return;
    await onSubmit({
      category,
      text: text.trim() || pending.caption,
      importance,
      visibility,
      inspirationAssetId: pending.id,
    });
    setPending(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (items.length === 0) {
    return <p className={cn('py-6 text-center', wishHint)}>暂无灵感内容</p>;
  }

  return (
    <>
      <p className={wishHint}>浏览灵感图库（{total} 张），收藏为心愿</p>
      <div className="columns-2 gap-3 sm:columns-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openConfirm(item)}
            className="group relative mb-3 w-full break-inside-avoid overflow-hidden rounded-lg border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img
              src={item.imageUrl}
              alt={item.caption}
              className="w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-2.5 text-left">
              <p className="text-sm font-medium text-white line-clamp-2">{item.caption}</p>
              {item.region ? (
                <p className="text-[11px] text-white/80">{item.region}</p>
              ) : null}
            </div>
            <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
              <Heart className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
          </button>
        ))}
      </div>

      <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}>
        <StackedDialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>收藏为心愿</DialogTitle>
          </DialogHeader>
          {pending ? (
            <div className="space-y-4">
              <div className="flex gap-3">
                <img
                  src={pending.imageUrl}
                  alt=""
                  className="h-20 w-20 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <Label className={wishLabel}>心愿描述</Label>
                  <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
                </div>
              </div>
              <WishCategorySelect
                tripId={tripId}
                value={category}
                onChange={setCategory}
                label="领域"
                disabled={submitting}
              />
              <div className="space-y-2">
                <div className={cn('flex justify-between', wishLabel)}>
                  <span>在意程度</span>
                  <WishImportanceDots value={importance} />
                </div>
                <Slider
                  value={[importance]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={([v]) => setImportance(v as 1 | 2 | 3 | 4 | 5)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className={wishLabel}>可见范围</span>
                <WishVisibilityToggle value={visibility} onChange={setVisibility} compact />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              取消
            </Button>
            <Button onClick={() => void handleConfirm()} disabled={submitting}>
              {submitting ? '提交中…' : '收藏'}
            </Button>
          </DialogFooter>
        </StackedDialogContent>
      </Dialog>
    </>
  );
}
