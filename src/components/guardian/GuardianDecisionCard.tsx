import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PersonaAvatar } from '@/components/common/PersonaAvatar';
import { cn } from '@/lib/utils';
import {
  GUARDIAN_ACTION_LABEL_ZH,
  GUARDIAN_SCENARIO_LABEL_ZH,
  isHardConstraintBlock,
} from '@/lib/guardian-presentation.util';
import type {
  GuardianAction,
  GuardianActionSlot,
  GuardianPersonaPresentation,
  GuardianSupportingLine,
} from '@/types/guardian-presentation';
import { AlertTriangle, Shield } from 'lucide-react';

const ACTION_SLOT_ORDER: GuardianActionSlot[] = ['abu', 'dre', 'neptune', 'user'];

const SLOT_LABEL_ZH: Record<GuardianActionSlot, string> = {
  abu: 'Abu',
  dre: 'Dr.Dre',
  neptune: 'Neptune',
  user: '您',
};

function actionBadgeVariant(
  action: GuardianAction,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (action) {
    case 'BLOCK':
      return 'destructive';
    case 'CHOOSE':
      return 'default';
    case 'REPAIR':
    case 'ADJUST':
      return 'secondary';
    default:
      return 'outline';
  }
}

function SupportingLineRow({ line }: { line: GuardianSupportingLine }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-slate-100 bg-white/70 px-3 py-2">
      <span className="text-base leading-none">{line.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-muted-foreground">
          {line.name}
        </div>
        <p className="text-sm text-slate-700">{line.text}</p>
      </div>
    </div>
  );
}

export interface GuardianDecisionCardProps {
  presentation: GuardianPersonaPresentation;
  className?: string;
  /** 展开 supportingLines（默认在 committee 或多因素时展示） */
  showSupportingLines?: boolean;
  onChoose?: () => void;
}

export function GuardianDecisionCard({
  presentation,
  className,
  showSupportingLines,
  onChoose,
}: GuardianDecisionCardProps) {
  const hardBlock = isHardConstraintBlock(presentation);
  const showLines =
    showSupportingLines ??
    (presentation.mode === 'decision_committee' ||
      presentation.supportingLines.length > 0);

  const actionEntries = ACTION_SLOT_ORDER.flatMap((slot) => {
    const action = presentation.actions[slot];
    if (!action) return [];
    return [{ slot, action }];
  });

  return (
    <Card
      className={cn(
        'border-2',
        hardBlock
          ? 'border-gate-reject-border bg-gate-reject/40'
          : 'border-slate-200 bg-slate-50/30',
        className,
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <PersonaAvatar
              persona={presentation.leadSpeaker}
              size={40}
              withBackground
            />
            <div className="min-w-0">
              <CardTitle className="text-lg leading-tight">
                {presentation.headline}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {GUARDIAN_SCENARIO_LABEL_ZH[presentation.scenario]}
              </p>
            </div>
          </div>
          {hardBlock ? (
            <Badge variant="destructive" className="shrink-0 gap-1">
              <Shield className="h-3 w-3" />
              硬约束
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="prose prose-sm max-w-none text-slate-700 dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {presentation.narrative}
          </ReactMarkdown>
        </div>

        {actionEntries.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {actionEntries.map(({ slot, action }) => (
              <Badge
                key={slot}
                variant={actionBadgeVariant(action)}
                className="text-xs"
              >
                {SLOT_LABEL_ZH[slot]} · {GUARDIAN_ACTION_LABEL_ZH[action]}
              </Badge>
            ))}
          </div>
        ) : null}

        {hardBlock ? (
          <div className="flex items-start gap-2 rounded-md border border-gate-reject-border bg-gate-reject px-3 py-2 text-sm text-gate-reject-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>存在不可忽略的安全/合规风险，请修改方案后再继续。</span>
          </div>
        ) : null}

        {presentation.actions.user === 'CHOOSE' && onChoose && !hardBlock ? (
          <button
            type="button"
            onClick={onChoose}
            className="text-sm font-medium text-primary hover:underline"
          >
            查看取舍选项
          </button>
        ) : null}

        {showLines && presentation.supportingLines.length > 0 ? (
          <div className="space-y-2 pt-1 border-t">
            <p className="text-xs font-medium text-muted-foreground">
              补充说明
            </p>
            {presentation.supportingLines.map((line, idx) => (
              <SupportingLineRow key={`${line.persona}-${idx}`} line={line} />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
