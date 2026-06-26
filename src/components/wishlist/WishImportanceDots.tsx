import { cn } from '@/lib/utils';

interface WishImportanceDotsProps {
  value: number;
  max?: number;
  className?: string;
  size?: 'sm' | 'md';
}

export function WishImportanceDots({
  value,
  max = 5,
  className,
  size = 'sm',
}: WishImportanceDotsProps) {
  const dotSize = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5';

  return (
    <div className={cn('flex items-center gap-1', className)} aria-label={`在意程度 ${value}/${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={cn(
            'rounded-full',
            dotSize,
            i < value ? 'bg-foreground' : 'bg-muted-foreground/25',
          )}
        />
      ))}
    </div>
  );
}
