import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { l0FieldLabelZh, MEMORY_CONSOLE_UI_DEFAULT_ZH } from '@/contracts/memory-console-ui-state.v1';
import { DeleteMemoryConfirmDialog } from './DeleteMemoryConfirmDialog';

function formatL0Value(value: unknown): string {
  if (Array.isArray(value)) return value.join('、');
  if (value == null) return '—';
  return String(value);
}

type L0ProfileSectionProps = {
  l0?: Record<string, unknown>;
  onDeleteField: (fieldKey: string) => Promise<void>;
  deleting?: boolean;
};

export function L0ProfileSection({ l0, onDeleteField, deleting }: L0ProfileSectionProps) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const entries = Object.entries(l0 ?? {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{MEMORY_CONSOLE_UI_DEFAULT_ZH.section_l0_title}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无基础资料</p>
        ) : (
          <ul className="divide-y">
            {entries.map(([key, value]) => (
              <li key={key} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{l0FieldLabelZh(key)}</div>
                  <div className="text-sm text-muted-foreground break-words">{formatL0Value(value)}</div>
                </div>
                <Button variant="ghost" size="sm" className="shrink-0 text-destructive" onClick={() => setPendingKey(key)}>
                  {MEMORY_CONSOLE_UI_DEFAULT_ZH.section_l0_delete_field}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <DeleteMemoryConfirmDialog
        open={pendingKey != null}
        onOpenChange={(open) => !open && setPendingKey(null)}
        title={`删除「${pendingKey ? l0FieldLabelZh(pendingKey) : ''}」`}
        description="删除后，后续规划将不再自动使用该字段。"
        loading={deleting}
        onConfirm={async () => {
          if (pendingKey) {
            await onDeleteField(pendingKey);
            setPendingKey(null);
          }
        }}
      />
    </Card>
  );
}
