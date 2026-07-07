import { ArrowRight } from 'lucide-react';
import { planObjectKindLabel } from '@/lib/plan-object-source.util';
import type { PlanObjectDto } from '@/types/plan-objects';

export interface PlanObjectChainRowProps {
  objects: PlanObjectDto[];
  /** 产品 Timeline 略宽；调试面板保持紧凑 */
  variant?: 'compact' | 'timeline';
}

/** STAY → TRANSFER → VISIT → MEAL_WINDOW 日内对象链 */
export function PlanObjectChainRow({ objects, variant = 'compact' }: PlanObjectChainRowProps) {
  if (!objects.length) {
    return <p className="text-[10px] text-muted-foreground">（空链）</p>;
  }

  const maxWidth = variant === 'timeline' ? 'max-w-[180px]' : 'max-w-[160px]';

  return (
    <div className="flex flex-wrap items-center gap-1">
      {objects.map((object, index) => (
        <span key={object.id} className="inline-flex items-center gap-1">
          {index > 0 ? (
            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden />
          ) : null}
          <span
            className={`inline-flex ${maxWidth} flex-col rounded-md border border-border/60 bg-background px-2 py-1`}
            title={[object.kind, object.label, object.id].filter(Boolean).join(' · ')}
          >
            <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              {object.kind}
            </span>
            <span className="truncate text-[10px] text-foreground">
              {object.label?.trim() || planObjectKindLabel(object.kind)}
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}
