import { History, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DecisionReplayResponse } from '@/types/active-trip-decision-replay';
import { FlywheelAuditReportPanel } from './FlywheelAuditReportPanel';

const PERSONA_LABELS: Record<DecisionReplayResponse['personaSections'][0]['persona'], string> = {
  abu: 'Abu',
  drDre: 'Dr.Dre',
  neptune: 'Neptune',
};

type DecisionReplayPanelProps = {
  replay: DecisionReplayResponse;
  className?: string;
};

/** Decision Replay · Abu 叙事时间线 */
export function DecisionReplayPanel({ replay, className }: DecisionReplayPanelProps) {
  const timeline = Array.isArray(replay.timeline) ? replay.timeline : [];
  const personaSections = Array.isArray(replay.personaSections) ? replay.personaSections : [];

  return (
    <section
      className={cn('rounded-xl border border-border bg-card px-4 py-3.5 text-sm shadow-sm', className)}
      aria-label="Decision Replay"
    >
      <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
        <History className="h-4 w-4 text-primary" aria-hidden />
        Decision Replay
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Abu 叙事 · 决策链回放</p>

      {replay.abuNarrative && (
        <p className="mt-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs leading-relaxed text-foreground">
          {replay.abuNarrative}
        </p>
      )}

      {timeline.length > 0 && (
        <ol className="mt-3 space-y-2 border-l-2 border-border pl-3">
          {timeline.map((entry) => (
            <li key={entry.id} className="relative text-xs">
              <span className="absolute -left-[calc(0.75rem+5px)] top-1.5 h-2 w-2 rounded-full bg-primary" />
              <time className="tabular-nums text-muted-foreground">
                {new Date(entry.at).toLocaleString('zh-CN')}
              </time>
              <p className="mt-0.5 text-foreground">{entry.labelZh}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4 space-y-2">
        {personaSections.map((section) => (
          <div
            key={section.persona}
            className="rounded-lg border border-border/60 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              <span className="text-xs font-medium text-foreground">{section.titleZh}</span>
              <Badge variant="outline" className="text-[10px] font-normal">
                {PERSONA_LABELS[section.persona]}
              </Badge>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{section.bodyZh}</p>
          </div>
        ))}
      </div>

      {replay.flywheelAuditReport && (
        <FlywheelAuditReportPanel report={replay.flywheelAuditReport} />
      )}
    </section>
  );
}
