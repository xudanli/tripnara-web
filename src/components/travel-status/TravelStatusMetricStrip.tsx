import { cn } from '@/lib/utils';
import {
  travelStatusMetricCard,
  travelStatusMetricLabel,
  travelStatusMetricValueClass,
  travelStatusSnapshotMetricCell,
  travelStatusSnapshotMetrics,
} from './travel-status-ui';

export interface TravelStatusMetricItem {
  key: string;
  label: string;
  value: number | string;
  tone?: 'neutral' | 'danger' | 'warning' | 'success';
  onClick?: () => void;
}

interface TravelStatusMetricStripProps {
  items: TravelStatusMetricItem[];
  variant?: 'cards' | 'strip';
  className?: string;
}

export default function TravelStatusMetricStrip({
  items,
  variant = 'cards',
  className,
}: TravelStatusMetricStripProps) {
  if (variant === 'strip') {
    return (
      <div className={cn(travelStatusSnapshotMetrics, className)}>
        {items.map((item) => {
          const Comp = item.onClick ? 'button' : 'div';
          const numeric = typeof item.value === 'number' ? item.value : Number.parseInt(String(item.value), 10);
          const isActive = !Number.isNaN(numeric) && numeric > 0;

          return (
            <Comp
              key={item.key}
              type={item.onClick ? 'button' : undefined}
              onClick={item.onClick}
              className={cn(
                travelStatusSnapshotMetricCell,
                item.onClick && 'cursor-pointer transition-colors hover:bg-muted/15',
                isActive && 'bg-muted/10 ring-1 ring-inset ring-border/60',
              )}
            >
              <div className={travelStatusMetricValueClass(item.value, item.tone ?? 'neutral')}>
                {item.value}
              </div>
              <div className={travelStatusMetricLabel}>{item.label}</div>
            </Comp>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 gap-2.5 sm:grid-cols-4', className)}>
      {items.map((item) => {
        const Comp = item.onClick ? 'button' : 'div';
        const numeric = typeof item.value === 'number' ? item.value : Number.parseInt(String(item.value), 10);
        const isActive = !Number.isNaN(numeric) && numeric > 0;

        return (
          <Comp
            key={item.key}
            type={item.onClick ? 'button' : undefined}
            onClick={item.onClick}
            className={cn(
              travelStatusMetricCard,
              'text-left',
              item.onClick && 'cursor-pointer transition-colors hover:bg-muted/15',
              isActive && 'ring-1 ring-inset ring-border/60',
            )}
          >
            <div className={travelStatusMetricValueClass(item.value, item.tone ?? 'neutral')}>
              {item.value}
            </div>
            <div className={travelStatusMetricLabel}>{item.label}</div>
          </Comp>
        );
      })}
    </div>
  );
}
