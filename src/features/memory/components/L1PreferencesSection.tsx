import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import type { MemoryConsoleL1V1 } from '@/features/memory/types/memory-console.v1';
import { MEMORY_CONSOLE_UI_DEFAULT_ZH } from '@/contracts/memory-console-ui-state.v1';
import { DeleteMemoryConfirmDialog } from './DeleteMemoryConfirmDialog';

const PACE_OPTIONS = [
  { value: 'LEISURE', label: '悠闲' },
  { value: 'MODERATE', label: '适中' },
  { value: 'FAST', label: '快速' },
];

const BUDGET_OPTIONS = [
  { value: 'LOW', label: '低' },
  { value: 'MEDIUM', label: '中' },
  { value: 'HIGH', label: '高' },
];

type L1PreferencesSectionProps = {
  l1?: MemoryConsoleL1V1;
  onPatch: (body: Partial<MemoryConsoleL1V1> & { client_acknowledged: boolean }) => Promise<void>;
  onClear: () => Promise<void>;
  patching?: boolean;
  clearing?: boolean;
};

export function L1PreferencesSection({
  l1,
  onPatch,
  onClear,
  patching,
  clearing,
}: L1PreferencesSectionProps) {
  const [editing, setEditing] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [draft, setDraft] = useState<MemoryConsoleL1V1>(l1 ?? {});

  const hasData = Boolean(
    l1 &&
      Object.entries(l1).some(([k, v]) => k !== 'client_acknowledged' && v != null && v !== '')
  );

  const startEdit = () => {
    setDraft(l1 ?? {});
    setEditing(true);
  };

  const save = async () => {
    await onPatch({ ...draft, client_acknowledged: true });
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{MEMORY_CONSOLE_UI_DEFAULT_ZH.section_l1_title}</CardTitle>
        <div className="flex gap-2">
          {!editing ? (
            <>
              <Button variant="outline" size="sm" onClick={startEdit}>
                {MEMORY_CONSOLE_UI_DEFAULT_ZH.section_l1_edit}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasData}
                onClick={() => setClearOpen(true)}
              >
                {MEMORY_CONSOLE_UI_DEFAULT_ZH.section_l1_clear}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                取消
              </Button>
              <Button size="sm" disabled={patching} onClick={() => void save()}>
                保存
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData && !editing ? (
          <p className="text-sm text-muted-foreground">暂无长期偏好记录</p>
        ) : null}

        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>节奏偏好</Label>
              <RadioGroup
                value={String(draft.pace_preference ?? '')}
                onValueChange={(v) => setDraft((d) => ({ ...d, pace_preference: v }))}
              >
                {PACE_OPTIONS.map((o) => (
                  <div key={o.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={o.value} id={`l1-pace-${o.value}`} />
                    <Label htmlFor={`l1-pace-${o.value}`} className="font-normal">
                      {o.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>预算偏好</Label>
              <RadioGroup
                value={String(draft.budget_preference ?? '')}
                onValueChange={(v) => setDraft((d) => ({ ...d, budget_preference: v }))}
              >
                {BUDGET_OPTIONS.map((o) => (
                  <div key={o.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={o.value} id={`l1-budget-${o.value}`} />
                    <Label htmlFor={`l1-budget-${o.value}`} className="font-normal">
                      {o.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        ) : (
          <dl className="grid gap-2 text-sm">
            {l1?.pace_preference ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">节奏</dt>
                <dd>{l1.pace_preference}</dd>
              </div>
            ) : null}
            {l1?.budget_preference ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">预算</dt>
                <dd>{l1.budget_preference}</dd>
              </div>
            ) : null}
            {l1?.accommodation_preference ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">住宿</dt>
                <dd>{l1.accommodation_preference}</dd>
              </div>
            ) : null}
            {l1?.travel_mode_preference ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">出行方式</dt>
                <dd>{l1.travel_mode_preference}</dd>
              </div>
            ) : null}
            {l1?.client_acknowledged ? (
              <Badge variant="secondary" className="w-fit text-xs">
                已确认
              </Badge>
            ) : null}
          </dl>
        )}
      </CardContent>

      <DeleteMemoryConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="清空长期偏好"
        description={MEMORY_CONSOLE_UI_DEFAULT_ZH.section_l1_clear_confirm}
        loading={clearing}
        onConfirm={async () => {
          await onClear();
          setClearOpen(false);
        }}
      />
    </Card>
  );
}
