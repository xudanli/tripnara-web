import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { experienceTriggerTypeLabel } from '@/lib/in-trip-experience';
import type { ExperiencePulseTrigger } from '@/types/in-trip-experience';

interface InTripExperiencePulsePanelProps {
  triggers: ExperiencePulseTrigger[];
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  onSelectTrigger: (trigger: ExperiencePulseTrigger) => void;
  className?: string;
}

export function InTripExperiencePulsePanel({
  triggers,
  loading,
  error,
  disabled,
  onSelectTrigger,
  className,
}: InTripExperiencePulsePanelProps) {
  if (loading) {
    return (
      <Card className={cn('col-span-12', className)}>
        <CardContent className="py-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (disabled) {
    return (
      <Card className={cn('col-span-12 border-dashed', className)}>
        <CardContent className="py-4 text-sm text-muted-foreground text-center">
          体验闭环尚未在后端启用
        </CardContent>
      </Card>
    );
  }

  if (error || triggers.length === 0) return null;

  const sorted = [...triggers].sort((a, b) => a.priority - b.priority);

  return (
    <Card className={cn('col-span-12 border-violet-200/80', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600" aria-hidden />
          体验微调查
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {triggers.length} 待反馈
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {sorted.map((trigger) => (
          <div key={trigger.triggerKey} className="rounded-lg border p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-violet-800">{trigger.title}</span>
              <span className="text-[10px] text-muted-foreground">
                {experienceTriggerTypeLabel(trigger.triggerType)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{trigger.prompt}</p>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onSelectTrigger(trigger)}
            >
              30 秒反馈
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
