import { Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  workbenchAttractionExploreSearchShell,
  workbenchAttractionExploreSearchToggle,
  workbenchAttractionExploreSearchToggleOff,
  workbenchAttractionExploreSearchToggleOn,
} from '../workbench-ui';

export interface AttractionExploreSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  useLlmIntent?: boolean;
  onUseLlmIntentChange?: (value: boolean) => void;
  useLiveRoutes?: boolean;
  onUseLiveRoutesChange?: (value: boolean) => void;
  liveRoutesAvailable?: boolean;
  className?: string;
}

export function AttractionExploreSearchBar({
  value,
  onChange,
  onSearch,
  useLlmIntent = true,
  onUseLlmIntentChange,
  useLiveRoutes = false,
  onUseLiveRoutesChange,
  liveRoutesAvailable = false,
  className,
}: AttractionExploreSearchBarProps) {
  return (
    <div className={cn(workbenchAttractionExploreSearchShell, className)}>
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSearch?.();
        }}
        placeholder="搜索景点或描述需求，如：黄金圈、适合老人、停车方便"
        className="h-7 min-w-0 flex-1 border-0 bg-transparent px-1.5 text-xs shadow-none focus-visible:ring-0"
      />
      {onUseLlmIntentChange ? (
        <button
          type="button"
          aria-pressed={useLlmIntent}
          aria-label="LLM 增强意图"
          title="LLM 增强意图"
          className={cn(
            workbenchAttractionExploreSearchToggle,
            useLlmIntent
              ? workbenchAttractionExploreSearchToggleOn
              : workbenchAttractionExploreSearchToggleOff,
          )}
          onClick={() => onUseLlmIntentChange(!useLlmIntent)}
        >
          LLM
        </button>
      ) : null}
      {liveRoutesAvailable && onUseLiveRoutesChange ? (
        <button
          type="button"
          aria-pressed={useLiveRoutes}
          aria-label="实时路况绕路"
          title="实时路况绕路"
          className={cn(
            workbenchAttractionExploreSearchToggle,
            useLiveRoutes
              ? workbenchAttractionExploreSearchToggleOn
              : workbenchAttractionExploreSearchToggleOff,
          )}
          onClick={() => onUseLiveRoutesChange(!useLiveRoutes)}
        >
          路况
        </button>
      ) : null}
      <Button
        type="button"
        size="sm"
        className="h-7 shrink-0 rounded-md px-2.5 text-[11px]"
        onClick={onSearch}
      >
        <Search className="mr-1 h-3 w-3" />
        搜索
      </Button>
    </div>
  );
}
