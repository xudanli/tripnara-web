import { FileText, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WorkbenchPersonaSymbol } from './WorkbenchPersonaSymbol';
import { dispatchPersonaAlertDeepLink, getPersonaAlertUserBody } from '@/lib/persona-alert-display';
import { getPersonaName } from '@/lib/persona-icons';
import { resolveTripPersonaAlerts } from '@/lib/resolve-trip-persona-alerts';
import type { PersonaAlert } from '@/types/trip';
import { workbenchCard } from './workbench-ui';

const PERSONA_KEYS = ['ABU', 'DR_DRE', 'NEPTUNE'] as const;

const OFFICER_ROLE: Record<(typeof PERSONA_KEYS)[number], string> = {
  ABU: '安全官',
  DR_DRE: '节奏官',
  NEPTUNE: '方案官',
};

const STANCE_STYLE = {
  oppose: { label: '反对', className: 'border-border bg-muted/30 text-error' },
  adjust: { label: '建议调整', className: 'border-border bg-muted/25 text-warning' },
  ok: { label: '可接受', className: 'border-border bg-muted/25 text-success' },
} as const;

function resolveStance(alert: PersonaAlert | undefined) {
  if (!alert) return STANCE_STYLE.ok;
  if (alert.severity === 'warning') return STANCE_STYLE.oppose;
  if (alert.severity === 'info') return STANCE_STYLE.adjust;
  return STANCE_STYLE.ok;
}

export interface WorkbenchPersonaCommitteePanelProps {
  personaAlerts?: PersonaAlert[];
  selectedOptionLetter?: string;
  onViewFullReport?: () => void;
  className?: string;
}

/** AI 决策委员会侧卡（设计稿样式） */
export function WorkbenchPersonaCommitteePanel({
  personaAlerts,
  selectedOptionLetter = 'A',
  onViewFullReport,
  className,
}: WorkbenchPersonaCommitteePanelProps) {
  const alerts = resolveTripPersonaAlerts(personaAlerts ?? []);

  return (
    <div
      className={cn(
        workbenchCard,
        'flex flex-col',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2.5">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">AI 决策委员会评议</h3>
        <span className="text-[10px] text-muted-foreground">针对方案 {selectedOptionLetter}</span>
        <Info className="ml-auto h-3.5 w-3.5 text-muted-foreground/60" aria-hidden />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
        {PERSONA_KEYS.map((persona) => {
          const alert = alerts.find((a) => a.persona === persona);
          const stance = resolveStance(alert);
          const body =
            (alert ? getPersonaAlertUserBody(alert) : null) ??
            (stance.label === '可接受'
              ? `方案 ${selectedOptionLetter} 在当前约束下整体可接受。`
              : stance.label === '反对'
                ? `对方案 ${selectedOptionLetter} 仍有保留意见，建议查看 tradeoffs。`
                : `方案 ${selectedOptionLetter} 可考虑，但建议关注体验与节奏平衡。`);
          const deepLink = alert?.metadata?.deepLink;
          const clickable = Boolean(deepLink);

          return (
            <div
              key={persona}
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
                <WorkbenchPersonaSymbol persona={persona} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold">{getPersonaName(persona)}</span>
                    <span className="text-[10px] text-muted-foreground">{OFFICER_ROLE[persona]}</span>
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

      <div className="border-t border-border/50 p-2.5">
        <Button
          variant="outline"
          className="h-8 w-full rounded-lg text-[11px]"
          onClick={onViewFullReport}
        >
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          查看完整评估报告
        </Button>
      </div>
    </div>
  );
}
