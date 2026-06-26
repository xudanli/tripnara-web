import { ChevronRight, Cloud, Heart, Receipt, Scale, Sparkles, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type InTripPendingInboxItem = {
  id: string;
  label: string;
  count: number;
  icon: typeof Cloud;
  onClick?: () => void;
};

interface InTripPendingInboxProps {
  items: InTripPendingInboxItem[];
  total: number;
  className?: string;
}

export function InTripPendingInbox({ items, total, className }: InTripPendingInboxProps) {
  const visible = items.filter((i) => i.count > 0);
  if (total <= 0 || visible.length === 0) return null;

  return (
    <Card className={cn('col-span-12 border-amber-200/80 bg-amber-50/40', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          待处理
          <Badge variant="destructive" className="text-[10px]">{total}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 bg-white"
              onClick={item.onClick}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{item.count}</Badge>
              <ChevronRight className="h-3 w-3 opacity-50" />
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}

export const IN_TRIP_PENDING_ICONS = {
  environment: Cloud,
  interventions: Users,
  experience: Sparkles,
  rebalance: Scale,
  money: Receipt,
  split: Users,
  mood: Heart,
} as const;
