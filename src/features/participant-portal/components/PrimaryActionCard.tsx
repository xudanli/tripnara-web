import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PrimaryActionCardProps {
  title: string;
  reason: string;
  impact?: string;
  dueLabel?: string;
  onAction: () => void;
  actionLabel: string;
  priority?: 'P0' | 'P1' | 'P2';
  className?: string;
}

const PRIORITY_STYLES: Record<NonNullable<PrimaryActionCardProps['priority']>, string> = {
  P0: 'border-destructive/40 bg-destructive/5',
  P1: 'border-primary/40 bg-primary/5',
  P2: 'border-muted',
};

export function PrimaryActionCard({
  title,
  reason,
  impact,
  dueLabel,
  onAction,
  actionLabel,
  priority = 'P1',
  className,
}: PrimaryActionCardProps) {
  return (
    <Card className={cn(PRIORITY_STYLES[priority], className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{reason}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {impact ? <p className="text-xs text-muted-foreground">{impact}</p> : null}
        {dueLabel ? <p className="text-xs font-medium text-muted-foreground">{dueLabel}</p> : null}
        <Button className="w-full gap-1" onClick={onAction}>
          {actionLabel}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
