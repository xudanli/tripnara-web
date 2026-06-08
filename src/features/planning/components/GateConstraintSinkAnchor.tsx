import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, ChevronRight } from 'lucide-react';
import {
  appliedKeyLabelZh,
  type ConstraintSinkUiAnchorV1,
} from '@/contracts/memory-console-ui-state.v1';
import { isConstraintSinkEnabled } from '@/lib/memory-feature';
import { trackGateSinkAnchorView } from '@/utils/memory-analytics';
import { cn } from '@/lib/utils';

type GateConstraintSinkAnchorProps = {
  anchor: ConstraintSinkUiAnchorV1 | null | undefined;
  onOpenEvidenceDrawer?: (opts: { tab: 'memory'; highlightPatchId?: string }) => void;
  className?: string;
};

/**
 * Gate 卡片底部「依据行」（Abu 人格 · P0 静态文案 + Drawer 深链）
 */
export function GateConstraintSinkAnchor({
  anchor,
  onOpenEvidenceDrawer,
  className,
}: GateConstraintSinkAnchorProps) {
  if (!isConstraintSinkEnabled() || !anchor) return null;

  const handleClick = () => {
    trackGateSinkAnchorView(anchor.patch_ids);
    onOpenEvidenceDrawer?.({
      tab: 'memory',
      highlightPatchId: anchor.patch_ids[0],
    });
  };

  return (
    <div
      className={cn(
        'mt-2 flex flex-col gap-1.5 rounded-md border border-border/60 bg-background/70 px-2.5 py-2 text-[11px]',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Brain className="h-3.5 w-3.5 shrink-0 text-primary/80" />
        <span className="font-medium text-foreground">{anchor.label_zh}</span>
        {anchor.applied_keys.slice(0, 4).map((k) => (
          <Badge key={k} variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
            {appliedKeyLabelZh(k)}
          </Badge>
        ))}
        {onOpenEvidenceDrawer ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="ml-auto h-auto p-0 text-[11px]"
            onClick={handleClick}
          >
            查看依据
            <ChevronRight className="ml-0.5 h-3 w-3" />
          </Button>
        ) : null}
      </div>
      {anchor.hydrate_hint_zh ? (
        <p className="text-muted-foreground leading-snug">{anchor.hydrate_hint_zh}</p>
      ) : null}
      {anchor.override_hint_zh && anchor.overridden_by_request_keys.length > 0 ? (
        <p className="text-amber-700/90 leading-snug">
          {anchor.override_hint_zh}（{anchor.overridden_by_request_keys.map(appliedKeyLabelZh).join('、')}）
        </p>
      ) : null}
    </div>
  );
}
