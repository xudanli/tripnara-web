import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { PlaceImageEntry } from '@/lib/collect-place-images';

export interface PlaceImageViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: PlaceImageEntry[];
  initialIndex?: number;
  title?: string;
}

export function PlaceImageViewerDialog({
  open,
  onOpenChange,
  images,
  initialIndex = 0,
  title = '图片',
}: PlaceImageViewerDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) {
      setCurrentIndex(Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)));
    }
  }, [open, initialIndex, images.length]);

  if (images.length === 0) return null;

  const current = images[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 bg-black/95 [&>button]:hidden">
        <div className="relative flex h-[80vh] w-full items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-10 text-white hover:bg-white/20"
            onClick={() => onOpenChange(false)}
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </Button>

          {images.length > 1 ? (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 z-10 text-white hover:bg-white/20"
              onClick={() =>
                setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
              }
              aria-label="上一张"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          ) : null}

          <img
            src={current.url}
            alt={current.caption || `${title} - 图片 ${currentIndex + 1}`}
            className="max-h-full max-w-full object-contain"
          />

          {images.length > 1 ? (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 z-10 text-white hover:bg-white/20"
              onClick={() =>
                setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
              }
              aria-label="下一张"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          ) : null}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-black/60 px-4 py-2 text-sm text-white">
            {current.caption || `${title} (${currentIndex + 1}/${images.length})`}
          </div>

          {images.length > 1 ? (
            <div className="absolute bottom-16 left-1/2 flex max-w-full -translate-x-1/2 gap-2 overflow-x-auto px-4">
              {images.map((img, idx) => (
                <button
                  key={`${img.url}-${idx}`}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    'h-16 w-16 shrink-0 overflow-hidden rounded border-2 transition-all',
                    idx === currentIndex
                      ? 'border-white'
                      : 'border-transparent opacity-60 hover:opacity-100',
                  )}
                >
                  <img src={img.url} alt={`缩略图 ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
