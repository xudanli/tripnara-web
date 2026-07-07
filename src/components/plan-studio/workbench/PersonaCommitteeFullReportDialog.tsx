import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WorkbenchPersonaSymbol } from './WorkbenchPersonaSymbol';
import { dispatchPersonaAlertDeepLink, getPersonaAlertUserBody } from '@/lib/persona-alert-display';
import { getPersonaName } from '@/lib/persona-icons';
import {
  buildPersonaValidationDimensions,
  type PersonaValidationDimension,
  type PersonaValidationStance,
} from '@/lib/persona-validation-dimensions.util';
import type { PersonaAlert } from '@/types/trip';

const STANCE_STYLE: Record<
  PersonaValidationStance,
  { label: string; className: string }
> = {
  oppose: {
    label: '反对',
    className: 'border-border bg-muted/30 text-error',
  },
  adjust: {
    label: '建议调整',
    className: 'border-border bg-muted/25 text-warning',
  },
  ok: {
    label: '可接受',
    className: 'border-border bg-muted/25 text-success',
  },
};

export interface PersonaCommitteeFullReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personaAlerts?: PersonaAlert[];
  validationDimensions?: PersonaValidationDimension[];
  selectedOptionLetter?: string;
}

/** 完整评估报告 · 展开 Abu / Dr.Dre / Neptune */
export function PersonaCommitteeFullReportDialog({
  open,
  onOpenChange,
  personaAlerts,
  validationDimensions,
  selectedOptionLetter = 'A',
}: PersonaCommitteeFullReportDialogProps) {
  const dimensions =
    validationDimensions ??
    buildPersonaValidationDimensions(personaAlerts, selectedOptionLetter);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            AI 决策委员会评议
            <span className="text-xs font-normal text-muted-foreground">
              针对方案 {selectedOptionLetter}
            </span>
            <Info className="ml-auto h-3.5 w-3.5 text-muted-foreground/60" aria-hidden />
          </DialogTitle>
          <DialogDescription className="text-xs">
            三人格分别从可行性、节奏与体验保留角度评估当前方案。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {dimensions.map((dimension) => {
            const stance = STANCE_STYLE[dimension.stance];
            const deepLink = dimension.alert?.metadata?.deepLink;
            const clickable = Boolean(deepLink);
            const body =
              (dimension.alert ? getPersonaAlertUserBody(dimension.alert) : null) ??
              dimension.summary;

            return (
              <div
                key={dimension.persona}
                className={cn(
                  'rounded-lg border border-border/60 bg-background/60 p-2.5',
                  clickable &&
                    'cursor-pointer transition-colors hover:border-border hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                )}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => dispatchPersonaAlertDeepLink(deepLink) : undefined}
                onKeyDown={
                  clickable
                    ? (event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        dispatchPersonaAlertDeepLink(deepLink);
                      }
                    : undefined
                }
              >
                <div className="flex items-start gap-2">
                  <WorkbenchPersonaSymbol persona={dimension.persona} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold">{getPersonaName(dimension.persona)}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {dimension.officerRole}
                      </span>
                      <span className="text-[10px] text-muted-foreground">· {dimension.label}</span>
                      <Badge
                        variant="outline"
                        className={cn('ml-auto text-[10px] font-normal', stance.className)}
                      >
                        {stance.label}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
