import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Collaborator } from '@/types/trip';
import { workbenchCollaboratorAvatarSurface } from './workbench-ui';

export type CollaboratorAvatarSize = 'xs' | 'sm' | 'md';

const SIZE_CLASS: Record<CollaboratorAvatarSize, string> = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-8 w-8 text-[11px]',
};

export function initialsFromDisplayName(
  name?: string | null,
  email?: string | null,
): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed.slice(0, 1).toUpperCase();
  const mail = email?.trim();
  if (mail) return mail.slice(0, 1).toUpperCase();
  return '?';
}

export function collaboratorDisplayName(
  collaborator: Pick<Collaborator, 'displayName' | 'email'>,
): string {
  return collaborator.displayName?.trim() || collaborator.email?.trim() || '成员';
}

export type CollaboratorAvatarHighlight = 'none' | 'current' | 'spoken';

export interface CollaboratorAvatarProps {
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: CollaboratorAvatarSize;
  className?: string;
  title?: string;
  highlight?: CollaboratorAvatarHighlight;
}

/** 工作台 · 统一成员头像（首字母 + 中性底） */
export function CollaboratorAvatar({
  displayName,
  email,
  avatarUrl,
  size = 'sm',
  className,
  title,
  highlight = 'none',
}: CollaboratorAvatarProps) {
  const label = title ?? (displayName?.trim() || email?.trim() || undefined);

  return (
    <Avatar
      className={cn(
        SIZE_CLASS[size],
        'shrink-0 border-2 font-semibold',
        workbenchCollaboratorAvatarSurface,
        highlight === 'none' && 'border-background ring-0',
        highlight === 'current' && 'border-primary ring-2 ring-primary/30',
        highlight === 'spoken' && 'border-gate-allow-border ring-0',
        className,
      )}
      title={label}
    >
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={label ?? '成员'} /> : null}
      <AvatarFallback className="bg-transparent font-semibold">
        {initialsFromDisplayName(displayName, email)}
      </AvatarFallback>
    </Avatar>
  );
}

export function CollaboratorAvatarFromRecord({
  collaborator,
  ...props
}: { collaborator: Collaborator } & Omit<
  CollaboratorAvatarProps,
  'displayName' | 'email' | 'title'
>) {
  return (
    <CollaboratorAvatar
      displayName={collaborator.displayName}
      email={collaborator.email}
      title={collaboratorDisplayName(collaborator)}
      {...props}
    />
  );
}

export function CollaboratorOverflowBadge({
  count,
  size = 'md',
  className,
}: {
  count: number;
  size?: CollaboratorAvatarSize;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full border-2 border-background bg-muted px-1.5 font-medium text-muted-foreground',
        SIZE_CLASS[size],
        className,
      )}
    >
      +{count}
    </span>
  );
}
