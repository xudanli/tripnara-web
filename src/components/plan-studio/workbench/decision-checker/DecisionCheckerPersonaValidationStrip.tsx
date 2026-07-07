import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DecisionPersonaValidationStrip } from '@/components/decision-problems/DecisionPersonaValidationStrip';
import {
  buildPersonaValidationDimensions,
  type PersonaValidationDimension,
} from '@/lib/persona-validation-dimensions.util';
import type { PersonaAlert } from '@/types/trip';
import { PersonaCommitteeFullReportDialog } from '../PersonaCommitteeFullReportDialog';
import { workbenchLinkClass } from '../workbench-ui';

export interface DecisionCheckerPersonaValidationStripProps {
  personaAlerts?: PersonaAlert[];
  /** 优先于 personaAlerts — 来自候选 tradeoffs / evaluate */
  validationDimensions?: PersonaValidationDimension[];
  selectedOptionLetter?: string;
  sourceHint?: string;
  className?: string;
}

/** 决策检查器 · 三人格验证条（含完整报告入口） */
export function DecisionCheckerPersonaValidationStrip({
  personaAlerts,
  validationDimensions,
  selectedOptionLetter = 'A',
  sourceHint,
  className,
  compact = false,
}: DecisionCheckerPersonaValidationStripProps & { compact?: boolean }) {
  const [reportOpen, setReportOpen] = useState(false);
  const dimensions =
    validationDimensions ??
    buildPersonaValidationDimensions(personaAlerts, selectedOptionLetter);

  const footerAction: ReactNode = (
    <button
      type="button"
      onClick={() => setReportOpen(true)}
      className={cn('inline-flex items-center gap-0.5 text-[11px]', workbenchLinkClass)}
    >
      完整评估报告
      <ChevronRight className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <>
      <DecisionPersonaValidationStrip
        className={className}
        dimensions={dimensions}
        sourceHint={sourceHint}
        footerAction={footerAction}
        compact={compact}
        showPersonaSymbols
      />

      <PersonaCommitteeFullReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        personaAlerts={personaAlerts}
        validationDimensions={dimensions}
        selectedOptionLetter={selectedOptionLetter}
      />
    </>
  );
}
