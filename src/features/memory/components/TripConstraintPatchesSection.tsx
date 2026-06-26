import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MemoryConsoleConstraintPatchV1 } from '@/features/memory/types/memory-console.v1';
import { appliedKeyLabelZh, MEMORY_CONSOLE_UI_DEFAULT_ZH } from '@/contracts/memory-console-ui-state.v1';
import { DeleteMemoryConfirmDialog } from './DeleteMemoryConfirmDialog';

type TripConstraintPatchesSectionProps = {
  tripId: string;
  patches?: MemoryConsoleConstraintPatchV1[];
  onDeletePatch: (patchId: string) => Promise<void>;
  deleting?: boolean;
};

export function TripConstraintPatchesSection({
  tripId,
  patches = [],
  onDeletePatch,
  deleting,
}: TripConstraintPatchesSectionProps) {
  const [pendingPatchId, setPendingPatchId] = useState<string | null>(null);
  const ____pending = patches.find((p) => p.patch_id === pendingPatchId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{MEMORY_CONSOLE_UI_DEFAULT_ZH.section_trip_patches_title}</CardTitle>
        <Badge variant="secondary">{patches.length}</Badge>
      </CardHeader>
      <CardContent>
        {patches.length === 0 ? (
          <p className="text-sm text-muted-foreground">本行程暂无对话偏好更新</p>
        ) : (
          <ul className="space-y-3">
            {patches.map((p) => (
              <li key={p.patch_id} className="rounded-md border px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 text-sm">
                    <p>{p.summary_zh}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{p.patch_id}</p>
                    {p.applied_keys?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.applied_keys.map((k) => (
                          <Badge key={k} variant="outline" className="text-[10px]">
                            {appliedKeyLabelZh(k)}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-destructive"
                    onClick={() => setPendingPatchId(p.patch_id)}
                  >
                    删除
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          行程 ID：<span className="font-mono">{tripId}</span>
          {' · '}
          <Link to={`/dashboard/settings/memory?trip_id=${encodeURIComponent(tripId)}`} className="underline">
            深链
          </Link>
        </p>
      </CardContent>

      <DeleteMemoryConfirmDialog
        open={pendingPatchId != null}
        onOpenChange={(open) => !open && setPendingPatchId(null)}
        title="删除偏好更新"
        description={MEMORY_CONSOLE_UI_DEFAULT_ZH.section_trip_patches_delete_confirm}
        loading={deleting}
        onConfirm={async () => {
          if (pendingPatchId) {
            await onDeletePatch(pendingPatchId);
            setPendingPatchId(null);
          }
        }}
      />
    </Card>
  );
}
