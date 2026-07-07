import type { Collaborator } from '@/types/trip';
import { cn } from '@/lib/utils';
import { useWorkbenchCollaborators } from '@/pages/plan-studio/hooks/useWorkbenchData';
import {
  CollaboratorAvatarFromRecord,
  collaboratorDisplayName,
} from './CollaboratorAvatar';
import { workbenchCard, workbenchLinkClass, workbenchPanelTitle } from './workbench-ui';

export interface WorkbenchParticipantsPanelProps {
  tripId: string;
  onClick?: () => void;
  className?: string;
  /** 父级已拉取的协作者列表，避免重复 GET /collaborators */
  collaborators?: Collaborator[] | null;
}

/** 左侧 · 参与人（决策空间模式） */
export function WorkbenchParticipantsPanel({
  tripId,
  onClick,
  className,
  collaborators: collaboratorsProp,
}: WorkbenchParticipantsPanelProps) {
  const collaboratorsQuery = useWorkbenchCollaborators(
    tripId,
    collaboratorsProp === undefined,
  );
  const collaborators = collaboratorsProp ?? collaboratorsQuery.data ?? [];
  const loading = collaboratorsProp === undefined && collaboratorsQuery.isLoading;

  if (loading) {
    return (
      <section className={cn('border-t border-border/50 px-3 py-3', className)}>
        <h3 className={cn(workbenchPanelTitle, 'mb-2')}>参与人</h3>
        <p className="text-[11px] text-muted-foreground">加载中…</p>
      </section>
    );
  }

  if (collaborators.length === 0) return null;

  return (
    <section className={cn('border-t border-border/50 px-3 py-3', className)}>
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <h3 className={workbenchPanelTitle}>参与人</h3>
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            className={cn('text-[11px]', workbenchLinkClass)}
          >
            管理
          </button>
        ) : null}
      </div>
      <ul className="space-y-1.5">
        {collaborators.map((collaborator) => (
          <li
            key={collaborator.id}
            className={cn(workbenchCard, 'flex items-center gap-2 px-2.5 py-2')}
          >
            <CollaboratorAvatarFromRecord collaborator={collaborator} size="sm" />
            <span className="min-w-0 truncate text-xs text-foreground">
              {collaboratorDisplayName(collaborator)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
