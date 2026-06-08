import { useState } from 'react';
import { Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PreMatchDecisionBrief } from '@/types/collaborative-task-flywheel';
import { SCENE_TASK_TEMPLATES } from '../lib/decision-engine/scene-task-templates.config';
import { plazaBanner } from '../lib/plaza-visual';

type DecisionEngineBriefPanelProps = {
  brief: PreMatchDecisionBrief;
  className?: string;
};

function renderNarrative(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/** §3.13 · 队长审批 decisionBrief 提示 */
export function DecisionEngineBriefPanel({ brief, className }: DecisionEngineBriefPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!brief.narrativeLine) return null;

  return (
    <div
      className={cn(plazaBanner.base, 'mt-3 border-primary/20 bg-primary/5 text-foreground', className)}
      role="note"
      aria-label="决策引擎提示"
    >
      <div className="flex gap-2">
        <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2 text-sm leading-relaxed">
          <p>{renderNarrative(brief.narrativeLine)}</p>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={brief.hardMetricsPass ? 'secondary' : 'outline'} className="font-normal">
              硬指标 {brief.hardMetricsPass ? '通过' : '待核'}
            </Badge>
            {brief.inTripCollaborationNoisePercent > 0 && (
              <Badge variant="outline" className="font-normal tabular-nums">
                行中噪音 {brief.inTripCollaborationNoisePercent}%
              </Badge>
            )}
            {brief.suggestedSceneRoleLabel && (
              <Badge variant="outline" className="font-normal">
                {brief.suggestedSceneRoleLabel}
              </Badge>
            )}
          </div>

          {(brief.noiseDrivers.length > 0 || brief.mitigatingTaskTemplateIds.length > 0) && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <>
                  收起详情
                  <ChevronUp className="h-3 w-3" aria-hidden />
                </>
              ) : (
                <>
                  展开噪音因子与对冲任务
                  <ChevronDown className="h-3 w-3" aria-hidden />
                </>
              )}
            </button>
          )}

          {expanded && (
            <div className="space-y-2 border-t border-border/60 pt-2 text-xs text-muted-foreground">
              {brief.noiseDrivers.length > 0 && (
                <ul className="space-y-1">
                  {brief.noiseDrivers.map((d, i) => (
                    <li key={i}>
                      · {d.label} — {d.factor}
                    </li>
                  ))}
                </ul>
              )}
              {brief.mitigatingTaskTemplateIds.length > 0 && (
                <p>
                  建议前置任务：
                  {brief.mitigatingTaskTemplateIds
                    .map((id) => SCENE_TASK_TEMPLATES[id]?.title ?? id)
                    .join(' · ')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function showDecisionEngineHint(brief: PreMatchDecisionBrief | null | undefined): boolean {
  return Boolean(brief?.narrativeLine);
}
