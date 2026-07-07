import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { tripListUi } from './trip-list-ui';

interface TripListCreateCardProps {
  onCreate: () => void;
  className?: string;
}

export default function TripListCreateCard({ onCreate, className }: TripListCreateCardProps) {
  return (
    <div
      className={cn(
        tripListUi.createCard,
        'flex flex-col items-center justify-center text-center p-5 h-full min-h-full',
        className,
      )}
    >
      <div className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center mb-3 shadow-sm">
        <Plus className="w-5 h-5 text-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">创建新行程</h3>
      <p className="text-[11px] text-muted-foreground mt-1.5 max-w-[180px] leading-snug line-clamp-3">
        从目的地、日期与偏好开始规划
      </p>
      <Button size="sm" className={cn('mt-4 h-8 text-xs', tripListUi.primaryBtn)} onClick={onCreate}>
        开始创建
      </Button>
    </div>
  );
}
