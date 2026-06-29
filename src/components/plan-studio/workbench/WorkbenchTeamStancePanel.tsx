import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { tripsApi } from '@/api/trips';
import type { Collaborator } from '@/types/trip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CollaboratorAvatarFromRecord,
  collaboratorDisplayName,
} from './CollaboratorAvatar';
import { workbenchCard } from './workbench-ui';

export interface WorkbenchTeamStancePanelProps {
  tripId: string;
  selectedOptionLetter?: string;
  onOpenCollaboration?: () => void;
  className?: string;
}

/** 团队立场摘要（决策空间）— 无 BFF 立场投影时展示成员与待收集态 */
export function WorkbenchTeamStancePanel({
  tripId,
  selectedOptionLetter = 'A',
  onOpenCollaboration,
  className,
}: WorkbenchTeamStancePanelProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void tripsApi
      .getCollaborators(tripId)
      .then((data) => {
        if (!cancelled) setCollaborators(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setCollaborators([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  if (loading) {
    return (
      <section className={cn(workbenchCard, 'p-3', className)}>
        <p className="text-[11px] text-muted-foreground">正在加载团队立场…</p>
      </section>
    );
  }

  if (collaborators.length <= 1) return null;

  return (
    <section className={cn(workbenchCard, 'p-3', className)}>
      <div className="mb-2.5 flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground">团队立场</h3>
        <span className="text-[10px] text-muted-foreground">
          针对方案 {selectedOptionLetter}
        </span>
        {onOpenCollaboration ? (
          <Button
            variant="link"
            className="ml-auto h-auto p-0 text-[11px]"
            onClick={onOpenCollaboration}
          >
            发起协商
          </Button>
        ) : null}
      </div>

      <ul className="space-y-2">
        {collaborators.map((collaborator) => (
          <li key={collaborator.id} className="flex items-center gap-2.5">
            <CollaboratorAvatarFromRecord collaborator={collaborator} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">
                {collaboratorDisplayName(collaborator)}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 text-[10px] font-normal text-muted-foreground">
              立场待收集
            </Badge>
          </li>
        ))}
      </ul>

      <p className="mt-2.5 text-[10px] leading-relaxed text-muted-foreground">
        发起协商或投票后，成员立场将在此同步展示。
      </p>
    </section>
  );
}
