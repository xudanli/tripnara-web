import { useState } from 'react';
import { cn } from '@/lib/utils';
import { plazaOverview } from '../lib/plaza-visual';

const COLLAPSE_THRESHOLD = 72;

interface RecruitmentVisionLeadProps {
  text: string;
  /** title：作为详情主标题；lead：正文引言 */
  as?: 'title' | 'lead';
  /** 拼在标题首行：目的地 · 出发 · 日期 */
  routeTitleLine?: string | null;
  className?: string;
}

/** 招募愿景 — 详情主标题或引言（支持折叠） */
export function RecruitmentVisionLead({
  text,
  as = 'lead',
  routeTitleLine,
  className,
}: RecruitmentVisionLeadProps) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = text.length > COLLAPSE_THRESHOLD;
  const isTitle = as === 'title';
  const clampLines = isTitle ? 'line-clamp-3' : 'line-clamp-2';
  const routeLine = routeTitleLine?.trim();

  return (
    <div className={cn('space-y-1', className)}>
      {isTitle ? (
        <h1 className={plazaOverview.title}>
          {routeLine ? (
            <span className="block text-xl font-semibold tracking-tight leading-tight">
              {routeLine}
            </span>
          ) : null}
          <span
            className={cn(
              'block font-normal',
              routeLine
                ? 'mt-1.5 text-sm leading-relaxed text-muted-foreground'
                : 'text-xl font-semibold tracking-tight leading-tight text-foreground',
              !expanded && canExpand && clampLines
            )}
          >
            {text}
          </span>
        </h1>
      ) : (
        <blockquote
          className={cn(plazaOverview.vision, !expanded && canExpand && clampLines)}
        >
          {text}
        </blockquote>
      )}
      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {expanded ? '收起' : '展开全文'}
        </button>
      )}
    </div>
  );
}
