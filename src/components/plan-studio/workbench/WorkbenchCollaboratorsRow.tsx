import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { tripsApi } from '@/api/trips';
import type { Collaborator } from '@/types/trip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CollaboratorAvatarFromRecord,
  CollaboratorOverflowBadge,
} from './CollaboratorAvatar';
import { workbenchPrimaryAction } from './workbench-ui';

export interface WorkbenchCollaboratorsRowProps {
  tripId: string;
  /** 父级已拉取时可传入，避免重复请求 */
  collaborators?: Collaborator[] | null;
  loading?: boolean;
  maxVisible?: number;
  onOpenMembers?: () => void;
  onOpenCollaborationCenter?: () => void;
  collaborationPendingCount?: number;
  className?: string;
}

/** 顶栏右上角 · 协作成员预览 + 协作中心入口 */
export function WorkbenchCollaboratorsRow({
  tripId,
  collaborators: collaboratorsProp,
  loading: loadingProp,
  maxVisible = 4,
  onOpenMembers,
  onOpenCollaborationCenter,
  collaborationPendingCount = 0,
  className,
}: WorkbenchCollaboratorsRowProps) {
  const [collaboratorsState, setCollaboratorsState] = useState<Collaborator[]>([]);
  const [loadingState, setLoadingState] = useState(collaboratorsProp === undefined);

  const collaborators = collaboratorsProp ?? collaboratorsState;
  const loading = loadingProp ?? (collaboratorsProp === undefined && loadingState);

  useEffect(() => {
    if (collaboratorsProp !== undefined) return;

    let cancelled = false;
    setLoadingState(true);
    tripsApi
      .getCollaborators(tripId)
      .then((data) => {
        if (!cancelled) setCollaboratorsState(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setCollaboratorsState([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingState(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, collaboratorsProp]);

  if (!onOpenCollaborationCenter && !onOpenMembers && collaborators.length === 0 && !loading) {
    return null;
  }

  const visible = collaborators.slice(0, maxVisible);
  const overflow = collaborators.length - visible.length;
  const pendingLabel =
    collaborationPendingCount > 0
      ? `打开团队协作中心，${collaborationPendingCount > 99 ? '99+' : collaborationPendingCount} 项待处理`
      : '打开团队协作中心';

  return (
    <div className={cn('hidden items-center gap-3 sm:flex', className)}>
      <button
        type="button"
        onClick={onOpenMembers}
        disabled={!onOpenMembers}
        className={cn(
          'flex min-w-0 flex-col gap-1 rounded-lg text-left transition-colors',
          onOpenMembers && 'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
          !onOpenMembers && 'cursor-default',
        )}
        aria-label={onOpenMembers ? '查看协作成员' : undefined}
      >
        <span className="text-[11px] font-medium leading-none text-muted-foreground">协作成员</span>
        {loading ? (
          <span className="text-[11px] text-muted-foreground/70">…</span>
        ) : visible.length > 0 ? (
          <div className="flex items-center -space-x-2">
            {visible.map((collaborator) => (
              <CollaboratorAvatarFromRecord
                key={collaborator.id}
                collaborator={collaborator}
                size="md"
              />
            ))}
            {overflow > 0 ? <CollaboratorOverflowBadge count={overflow} size="md" /> : null}
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground/80">暂无成员</span>
        )}
      </button>

      {onOpenCollaborationCenter ? (
        <Button
          type="button"
          size="sm"
          className={cn('relative h-9 gap-2 rounded-lg px-4 text-xs font-medium', workbenchPrimaryAction)}
          onClick={onOpenCollaborationCenter}
          aria-label={pendingLabel}
        >
          <Users className="h-4 w-4" />
          协作
          {collaborationPendingCount > 0 ? (
            <Badge
              variant="secondary"
              className="ml-0.5 h-5 min-w-5 rounded-full border-0 bg-primary-foreground/20 px-1.5 text-[10px] text-primary-foreground"
            >
              {collaborationPendingCount > 99 ? '99+' : collaborationPendingCount}
            </Badge>
          ) : null}
        </Button>
      ) : null}
    </div>
  );
}
