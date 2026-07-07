import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exploreUi, semanticWarnText } from '@/features/exploration/explore-ui';

interface UnresolvedPoisBannerProps {
  message: string;
  className?: string;
}

export function UnresolvedPoisBanner({ message, className }: UnresolvedPoisBannerProps) {
  if (!message) return null;

  return (
    <div className={cn(exploreUi.warnCard, 'flex items-start gap-2 mb-4', className)}>
      <AlertTriangle className={cn('w-4 h-4 shrink-0 mt-0.5', semanticWarnText)} />
      <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
    </div>
  );
}
