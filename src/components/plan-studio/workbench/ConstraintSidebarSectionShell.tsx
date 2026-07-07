import { useEffect, useState, type ReactNode } from 'react';
import { ChevronRight, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  isConstraintSectionCollapsedByDefault,
  type ConstraintSidebarFocusMode,
  type ConstraintSidebarVariant,
} from '@/lib/constraint-sidebar-focus.util';

export interface ConstraintSidebarSectionShellProps {
  sectionKey: string;
  focusMode?: ConstraintSidebarFocusMode;
  sidebarVariant?: ConstraintSidebarVariant;
  title: string;
  count?: number;
  summary?: string | null;
  /** 章节说明 · 悬浮在标题旁 help icon 上展示 */
  helpText?: string | null;
  className?: string;
  children: ReactNode;
}

/** 合同章节外壳 · 聚焦模式下默认折叠非相关章 */
export function ConstraintSidebarSectionShell({
  sectionKey,
  focusMode = 'full',
  sidebarVariant = 'full',
  title,
  count,
  summary,
  helpText,
  className,
  children,
}: ConstraintSidebarSectionShellProps) {
  const defaultOpen = !isConstraintSectionCollapsedByDefault(sectionKey, focusMode, sidebarVariant);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(!isConstraintSectionCollapsedByDefault(sectionKey, focusMode, sidebarVariant));
  }, [focusMode, sectionKey, sidebarVariant]);

  const countLabel = count != null && count > 0 ? ` · ${count}` : '';

  return (
    <section className={cn('mb-2.5', className)}>
      <div className="mb-1 flex w-full items-start px-1">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <span className="min-w-0 flex-1">
            <span className="inline-flex flex-wrap items-center gap-1 text-[11px] font-semibold text-foreground">
              <span>
                {title}
                {countLabel}
              </span>
              {helpText?.trim() ? (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        role="button"
                        tabIndex={0}
                        className="inline-flex rounded p-0.5 text-muted-foreground/60 hover:bg-muted/60 hover:text-muted-foreground"
                        aria-label="章节说明"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.stopPropagation();
                          }
                        }}
                      >
                        <HelpCircle className="h-3 w-3" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[240px] text-xs leading-relaxed">
                      {helpText.trim()}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
            </span>
            {!open && summary ? (
              <span className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                {summary}
              </span>
            ) : null}
          </span>
          <ChevronRight
            className={cn(
              'mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/80 transition-transform duration-200',
              open && 'rotate-90',
            )}
            aria-hidden
          />
        </button>
      </div>
      {open ? children : null}
    </section>
  );
}
