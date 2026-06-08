import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  onAddSegment: () => void;
};

export function HikingSegmentEmptyBanner({ onAddSegment }: Props) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-2 text-sm text-amber-950">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          本行程为<strong>含徒步的自驾行程</strong>，请添加徒步日期与路线，以便单独做准备度评估与行中导航。
        </p>
      </div>
      <Button type="button" size="sm" variant="outline" className="border-amber-300" onClick={onAddSegment}>
        添加徒步片段
      </Button>
    </div>
  );
}
