/**
 * 方案预览抽屉 — 内联 CHOOSE 取舍（替代完整 Guardian 卡片）
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { PersonaAvatar } from '@/components/common/PersonaAvatar';
import { useGuardianHumanChoice } from '@/hooks/useGuardianHumanChoice';
import { extractChooseOptionsFromPresentation } from '@/lib/planning-workbench-ux.util';
import type { GuardianPersonaPresentation } from '@/types/guardian-presentation';
import { cn } from '@/lib/utils';
import { Scale } from 'lucide-react';
import { workbenchCard } from '@/components/plan-studio/workbench/workbench-ui';

export interface PlanGateChoosePanelProps {
  presentation: GuardianPersonaPresentation;
  tripId: string;
  userId?: string | null;
  className?: string;
  /** plan-gate：方案确认抽屉样式（无人格头像、gate token） */
  variant?: 'default' | 'plan-gate';
  onPresentationChange?: (presentation: GuardianPersonaPresentation) => void;
  /** CHOOSE 成功后自动重新 execute(generate) */
  onRegenerate?: () => void | Promise<void>;
  onChooseSuccess?: (selectedIndex: number, selectedText: string) => void;
}

export default function PlanGateChoosePanel({
  presentation,
  tripId,
  userId,
  className,
  variant = 'default',
  onPresentationChange,
  onRegenerate,
  onChooseSuccess,
}: PlanGateChoosePanelProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const options = useMemo(
    () => extractChooseOptionsFromPresentation(presentation),
    [presentation],
  );

  const { submitChoice, isSubmitting, canSubmit } = useGuardianHumanChoice({
    userId,
    tripId,
    source: 'presentation',
    decisionPoints: options,
    onPresentation: onPresentationChange,
    onSuccess: onChooseSuccess,
    onChooseResult: (chooseResult) => {
      if (chooseResult.nextAction === 'BLOCKED') return;
      if (
        !chooseResult.nextAction ||
        chooseResult.nextAction === 'CONTINUE_PLANNING' ||
        chooseResult.nextAction === 'RE_RUN_NEGOTIATION' ||
        chooseResult.nextAction === 'APPLY_REPAIR'
      ) {
        void onRegenerate?.();
      }
    },
  });

  if (options.length === 0) return null;

  const isPlanGate = variant === 'plan-gate';
  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <Card
      id="plan-gate-choose-block"
      className={cn(
        isPlanGate
          ? cn(workbenchCard, 'border-border/40 bg-background p-0 shadow-none')
          : 'border-2 border-amber-200 bg-amber-50/20',
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {!isPlanGate ? (
            <PersonaAvatar persona={presentation.leadSpeaker} size={36} withBackground />
          ) : null}
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className={cn('h-4 w-4', isPlanGate ? 'text-warning' : 'text-amber-700')} />
              {isPlanGate ? '确认本次取舍' : '请选择您的取舍'}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {presentation.headline || '选定后系统将据此继续评估方案'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {options.map((option, index) => {
            const selected = selectedIndex === index;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  'w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-colors',
                  selected
                    ? 'border-primary bg-muted/25 ring-1 ring-border'
                    : 'border-border bg-background hover:bg-muted/50',
                )}
              >
                <span className="font-medium text-muted-foreground mr-2">
                  {isPlanGate ? `${optionLabels[index] ?? index + 1}.` : `${index + 1}.`}
                </span>
                {option}
              </button>
            );
          })}
        </div>
        <Button
          className="w-full sm:w-auto"
          disabled={selectedIndex === null || isSubmitting || !canSubmit}
          onClick={() => {
            if (selectedIndex === null) return;
            void submitChoice(selectedIndex, options[selectedIndex] ?? '');
          }}
        >
          {isSubmitting ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              提交中…
            </>
          ) : isPlanGate ? (
            `确认选择 ${optionLabels[selectedIndex ?? 0] ?? ''}`.trim()
          ) : (
            '确认选择'
          )}
        </Button>
        {!canSubmit && (
          <p className="text-xs text-muted-foreground">请先登录后再提交选择</p>
        )}
      </CardContent>
    </Card>
  );
}
