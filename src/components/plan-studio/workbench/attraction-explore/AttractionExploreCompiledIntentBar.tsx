import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AttractionExploreCompiledIntent } from '@/types/attraction-explore';
import { workbenchAttractionExploreIntentBar } from '../workbench-ui';

export interface AttractionExploreCompiledIntentBarProps {
  intent?: AttractionExploreCompiledIntent | null;
  compiling?: boolean;
  className?: string;
}

export function AttractionExploreCompiledIntentBar({
  intent,
  compiling = false,
  className,
}: AttractionExploreCompiledIntentBarProps) {
  if (!intent && !compiling) return null;

  const chips: string[] = [];
  for (const theme of intent?.themes ?? []) {
    chips.push(theme.label ?? theme.id);
  }
  for (const item of intent?.suitableFor ?? []) {
    chips.push(item.label ?? item.id);
  }
  if (intent?.maxDetourMinutes != null) {
    chips.push(`绕路 ≤ ${intent.maxDetourMinutes} 分钟`);
  }
  if (intent?.weatherMode) {
    chips.push(intent.weatherMode);
  }
  if (intent?.routeContext) {
    chips.push(intent.routeContext);
  }

  return (
    <div className={cn(workbenchAttractionExploreIntentBar, className)}>
      <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
        <Sparkles className="h-3 w-3" aria-hidden />
        {compiling ? '编译中…' : '已理解'}
      </span>
      {intent?.source ? (
        <Badge variant="outline" className="h-4 shrink-0 px-1.5 text-[9px] font-normal">
          {intent.source === 'rules+llm' ? '规则+LLM' : '规则引擎'}
        </Badge>
      ) : null}
      {chips.map((chip) => (
        <Badge
          key={chip}
          variant="secondary"
          className="h-4 shrink-0 px-1.5 text-[9px] font-normal"
        >
          {chip}
        </Badge>
      ))}
    </div>
  );
}
