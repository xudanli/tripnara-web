import { Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RouteTemplateBinding } from '@/types/launch-recruitment';

type RouteTemplateBindingStripProps = {
  binding: RouteTemplateBinding;
  className?: string;
};

/** 模板强绑展示 · routeTemplateBinding */
export function RouteTemplateBindingStrip({ binding, className }: RouteTemplateBindingStripProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs',
        className
      )}
    >
      <Link2 className="h-3.5 w-3.5 text-primary" aria-hidden />
      <span className="font-medium text-foreground">路线模板强绑</span>
      <Badge variant="secondary" className="font-normal">
        {binding.titleZh}
      </Badge>
      <span className="text-muted-foreground tabular-nums">
        catalog · {binding.catalogId} · #{binding.routeTemplateId}
      </span>
    </div>
  );
}
