import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { MemoryConsoleL2EntryV1 } from '@/features/memory/types/memory-console.v1';
import { MEMORY_CONSOLE_UI_DEFAULT_ZH } from '@/contracts/memory-console-ui-state.v1';
import { DeleteMemoryConfirmDialog } from './DeleteMemoryConfirmDialog';

type L2DecisionsSectionProps = {
  entries?: MemoryConsoleL2EntryV1[];
  onDelete?: (decisionId: string) => Promise<void>;
  deleting?: boolean;
};

export function L2DecisionsSection({
  entries = [],
  onDelete,
  deleting,
}: L2DecisionsSectionProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{MEMORY_CONSOLE_UI_DEFAULT_ZH.section_l2_title}</CardTitle>
        <CardDescription>{MEMORY_CONSOLE_UI_DEFAULT_ZH.section_l2_readonly_hint}</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无近期决策摘要</p>
        ) : (
          <ul className="space-y-3">
            {entries.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p>{e.summary_zh}</p>
                  {e.created_at ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString('zh-CN')}
                      {e.source_layer ? ` · ${e.source_layer}` : ''}
                    </p>
                  ) : null}
                </div>
                {onDelete ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-destructive"
                    onClick={() => setPendingId(e.id)}
                  >
                    {MEMORY_CONSOLE_UI_DEFAULT_ZH.section_l2_delete}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {onDelete ? (
        <DeleteMemoryConfirmDialog
          open={pendingId != null}
          onOpenChange={(open) => !open && setPendingId(null)}
          title="删除路线决策记录"
          description={MEMORY_CONSOLE_UI_DEFAULT_ZH.section_l2_delete_confirm}
          loading={deleting}
          onConfirm={async () => {
            if (pendingId) {
              await onDelete(pendingId);
              setPendingId(null);
            }
          }}
        />
      ) : null}
    </Card>
  );
}
