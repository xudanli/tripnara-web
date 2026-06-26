import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { VerifiedCredentials } from '@/types/match-square';
import { parseTrustAssetSegments } from '../lib/parse-trust-asset-line';
import { filterDeprecatedTrustSegments } from '@/lib/deprecated-trust';
import { credentialsDisplayName, formatCaptainIdentityHeadline } from '../lib/verified-credentials';

interface CredentialsHeadlineStripProps {
  credentials: VerifiedCredentials;
  variant?: 'list' | 'detail';
  /** 详情一行摘要（弹窗 / 紧凑详情） */
  compact?: boolean;
  subjectRole?: 'captain' | 'member';
  onOpenTrustProfile?: () => void;
  className?: string;
}

/** PRD 3.1.2 / 3.1.3 · 队长身份背书 headline */
export function CredentialsHeadlineStrip({
  credentials,
  variant = 'list',
  compact = false,
  subjectRole = 'captain',
  onOpenTrustProfile,
  className,
}: CredentialsHeadlineStripProps) {
  if (!credentials.headline?.identityHeadline) return null;

  const { identityHeadline, trustAssetLine } = credentials.headline;
  const displayName = credentialsDisplayName(credentials);
  const isCaptain = subjectRole === 'captain';
  const captainHeadline = isCaptain
    ? formatCaptainIdentityHeadline(identityHeadline)
    : { showRoleLabel: false, headline: identityHeadline };
  const roleLabel = isCaptain ? '队长' : '队员';
  const showAvatar = variant === 'detail' && Boolean(onOpenTrustProfile);
  const initials = (displayName || identityHeadline).slice(0, 1).toUpperCase();
  const avatarUrl = credentials.dossier?.avatarUrl;
  const trustSegments = filterDeprecatedTrustSegments(
    trustAssetLine ? parseTrustAssetSegments(trustAssetLine) : []
  );
  const isDetail = variant === 'detail';
  const trustInline = trustSegments.join(' · ');
  const interactive = isDetail && Boolean(onOpenTrustProfile);

  const openTrust = () => onOpenTrustProfile?.();

  const avatarEl = showAvatar ? (
    <Avatar className={cn('shrink-0 border border-border/80', compact ? 'h-7 w-7' : 'h-8 w-8')}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
      <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">
        {initials}
      </AvatarFallback>
    </Avatar>
  ) : null;

  if (variant === 'list' && compact) {
    const inline = trustInline
      ? `${identityHeadline} · ${trustInline}`
      : identityHeadline;
    return (
      <span
        className={cn('min-w-0 truncate font-medium text-foreground/85', className)}
        title={inline}
      >
        {inline}
      </span>
    );
  }

  if (isDetail && compact) {
    const row = (
      <>
        {avatarEl}
        <span className="min-w-0 flex-1 text-xs leading-snug">
          {captainHeadline.showRoleLabel ? (
            <span className="text-muted-foreground">{roleLabel} </span>
          ) : null}
          <span className="font-medium text-foreground">{captainHeadline.headline}</span>
          {trustInline ? (
            <span className="text-muted-foreground"> · {trustInline}</span>
          ) : null}
        </span>
        {interactive && (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
        )}
      </>
    );

    if (interactive) {
      return (
        <button
          type="button"
          onClick={openTrust}
          className={cn(
            'flex w-full items-center gap-2 rounded-md py-0.5 text-left outline-none',
            'transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring',
            className
          )}
          aria-label={`查看${roleLabel} ${displayName || '旅伴'} 的信任档案`}
          data-no-card-nav
        >
          {row}
        </button>
      );
    }

    return <div className={cn('flex items-center gap-2', className)}>{row}</div>;
  }

  if (isDetail) {
    return (
      <button
        type="button"
        onClick={interactive ? openTrust : undefined}
        disabled={!interactive}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2 text-left',
          interactive && 'cursor-pointer transition-colors hover:bg-muted/30',
          !interactive && 'cursor-default',
          className
        )}
        aria-label={interactive ? `查看${roleLabel} ${displayName || '旅伴'} 的信任档案` : undefined}
        data-no-card-nav={interactive ? true : undefined}
      >
        {avatarEl}
        <span className="min-w-0 flex-1">
          {captainHeadline.showRoleLabel ? (
            <span className="block text-xs text-muted-foreground">{roleLabel}</span>
          ) : null}
          <span className="block text-sm font-medium leading-snug text-foreground">
            {captainHeadline.headline}
          </span>
          {trustSegments.length > 0 && (
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
              {trustInline}
            </span>
          )}
        </span>
        {interactive && (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
        )}
      </button>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <p className="min-w-0 truncate text-sm font-medium leading-snug text-foreground">
        {identityHeadline}
      </p>
      {trustAssetLine && (
        <p className="line-clamp-1 text-xs leading-relaxed text-muted-foreground">
          {trustAssetLine.replace(/🛡️\s*/gu, '')}
        </p>
      )}
    </div>
  );
}
