import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface ConstraintSectionIntroProps {
  text: string;
  /** 通读模式默认展开完整说明 */
  defaultExpanded?: boolean;
  className?: string;
}

/** 章节说明 · 默认一行，可展开完整合同说明 */
export function ConstraintSectionIntro({
  text,
  defaultExpanded = false,
  className,
}: ConstraintSectionIntroProps) {
  const trimmed = text.trim();
  const [expanded, setExpanded] = useState(defaultExpanded);
  if (!trimmed) return null;

  const shortLine = trimmed.split('—')[0]?.trim() ?? trimmed;
  const collapsible = trimmed.length > shortLine.length + 8;

  return (
    <div className={cn('mb-1 px-1', className)}>
      <p className="text-[11px] leading-snug text-muted-foreground">
        {expanded || !collapsible ? trimmed : shortLine}
      </p>
      {collapsible ? (
        <button
          type="button"
          className="mt-0.5 text-[11px] text-foreground/80 underline-offset-2 hover:underline"
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? '收起说明' : '展开说明 ▸'}
        </button>
      ) : null}
    </div>
  );
}
