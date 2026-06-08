import { Compass, GraduationCap, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { VerifiedCredentials } from '@/types/match-square';
import { plazaBadge, plazaChip } from '../lib/plaza-visual';

interface PlazaSelfStateBarProps {
  personaLabel?: string;
  tripIntent?: string;
  viewerCredentials?: VerifiedCredentials | null;
  credentialsLoading?: boolean;
  /** 紧凑单行；详情由 expanded 控制 */
  compact?: boolean;
  expanded?: boolean;
  className?: string;
}

/** 匹配视角 — 人格 + 背书摘要 */
export function PlazaSelfStateBar({
  personaLabel,
  tripIntent,
  viewerCredentials,
  credentialsLoading,
  compact = false,
  expanded = false,
  className,
}: PlazaSelfStateBarProps) {
  const identityLine = viewerCredentials?.headline?.identityHeadline;
  const hasContent = personaLabel || tripIntent || identityLine || credentialsLoading;

  if (!hasContent) return null;

  if (compact) {
    return (
      <div
        className={cn('flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs', className)}
        role="status"
        aria-label="当前匹配视角"
      >
        {personaLabel && (
          <span className={cn(plazaChip.trust, 'inline-flex max-w-[9rem] items-center gap-1')}>
            <UserRound className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
            <span className="truncate font-medium text-foreground/90">{personaLabel}</span>
          </span>
        )}
        {tripIntent && (
          <span className="hidden text-muted-foreground sm:inline">本次 · {tripIntent}</span>
        )}
        {!expanded && identityLine && (
          <span className="hidden max-w-[8rem] truncate text-muted-foreground md:inline">
            · {identityLine}
          </span>
        )}
        {expanded && (
          <div className="w-full pt-1">
            {credentialsLoading ? (
              <p className="text-[11px] text-muted-foreground">加载身份背书中…</p>
            ) : identityLine ? (
              <p className="flex items-start gap-1 text-[11px] leading-relaxed text-muted-foreground">
                <GraduationCap className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                <span>{identityLine}</span>
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                尚未认证学历/职业背书，{' '}
                <Link
                  to="/dashboard/tripnara/odyssey"
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  前往 Identity Hub 完善
                </Link>
              </p>
            )}
            {tripIntent && (
              <p className="mt-1 text-[11px] text-muted-foreground sm:hidden">本次 · {tripIntent}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'space-y-2 rounded-lg border border-border bg-muted/30 px-3 py-2',
        className
      )}
      role="status"
      aria-label="当前匹配视角"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          当前匹配视角
        </span>
        {personaLabel && (
          <span className={cn(plazaBadge.tag, 'inline-flex items-center gap-1 text-foreground')}>
            <UserRound className="h-3 w-3" aria-hidden />
            {personaLabel}
          </span>
        )}
        {tripIntent && (
          <span className={cn(plazaBadge.tag, 'inline-flex items-center gap-1 text-foreground')}>
            <Compass className="h-3 w-3" aria-hidden />
            本次 · {tripIntent}
          </span>
        )}
      </div>

      {credentialsLoading ? (
        <p className="text-xs text-muted-foreground">加载身份背书中…</p>
      ) : identityLine ? (
        <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{identityLine}</span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          尚未认证学历/职业背书，{' '}
          <Link
            to="/dashboard/tripnara/odyssey"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            前往 Identity Hub 完善
          </Link>
          ，提升圈层匹配准确度
        </p>
      )}
    </div>
  );
}
