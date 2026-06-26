import type { DecisionLogEntry as TripDecisionLogEntry } from '@/types/trip';
import type {
  GuardianDecisionLogMetadata,
} from '@/types/guardian-presentation';
import {
  formatGuardianActionsSummary,
  formatRevalidationPassLabel,
  GUARDIAN_SCENARIO_LABEL_ZH,
} from '@/lib/guardian-presentation.util';
import { getPersonaName } from '@/lib/persona-icons';

export function readGuardianDecisionLogMetadata(
  meta: unknown,
): GuardianDecisionLogMetadata | null {
  if (!meta || typeof meta !== 'object') return null;
  const m = meta as Record<string, unknown>;
  const hasGuardian =
    m.revalidationPass ||
    m.guardianLeadSpeaker ||
    m.guardianScenario ||
    m.guardianActions ||
    m.guardianStructuredStatus;
  if (!hasGuardian) return null;
  return {
    revalidationPass: m.revalidationPass as GuardianDecisionLogMetadata['revalidationPass'],
    guardianExpressionPhase:
      m.guardianExpressionPhase as GuardianDecisionLogMetadata['guardianExpressionPhase'],
    guardianLeadSpeaker:
      m.guardianLeadSpeaker as GuardianDecisionLogMetadata['guardianLeadSpeaker'],
    guardianScenario:
      m.guardianScenario as GuardianDecisionLogMetadata['guardianScenario'],
    guardianStructuredStatus:
      m.guardianStructuredStatus as GuardianDecisionLogMetadata['guardianStructuredStatus'],
    guardianActions:
      m.guardianActions as GuardianDecisionLogMetadata['guardianActions'],
  };
}

/** 行程 decision-log 单条的 Guardian 审计视图（C 端时间线） */
export interface GuardianDecisionLogViewModel {
  metadata: GuardianDecisionLogMetadata;
  revalidationLabel?: string;
  leadSpeakerLabel?: string;
  scenarioLabel?: string;
  actionsSummary?: string;
  expressionPhaseLabel?: string;
}

export function buildGuardianDecisionLogView(
  log: Pick<TripDecisionLogEntry, 'metadata' | 'persona'>,
): GuardianDecisionLogViewModel | null {
  const metadata = readGuardianDecisionLogMetadata(log.metadata);
  if (!metadata) return null;

  return {
    metadata,
    revalidationLabel: metadata.revalidationPass
      ? formatRevalidationPassLabel(metadata.revalidationPass)
      : undefined,
    leadSpeakerLabel: metadata.guardianLeadSpeaker
      ? getPersonaName(metadata.guardianLeadSpeaker)
      : log.persona
        ? getPersonaName(log.persona)
        : undefined,
    scenarioLabel: metadata.guardianScenario
      ? GUARDIAN_SCENARIO_LABEL_ZH[metadata.guardianScenario] ??
        metadata.guardianScenario
      : undefined,
    actionsSummary: metadata.guardianActions
      ? formatGuardianActionsSummary(metadata.guardianActions)
      : undefined,
    expressionPhaseLabel:
      metadata.guardianExpressionPhase === 'in_trip' ? '行中' : undefined,
  };
}

/** workbench DecisionTimeline 条目 */
export interface WorkbenchDecisionLogEntry {
  id: string;
  timestamp: string;
  persona?: 'ABU' | 'DR_DRE' | 'NEPTUNE' | 'SYSTEM';
  action: string;
  verdict?: string;
  reason?: string;
  evidenceRefs?: string[];
  planVersion?: number;
  metadata?: Record<string, unknown>;
}

export function enrichWorkbenchDecisionLogEntry(
  entry: WorkbenchDecisionLogEntry,
): WorkbenchDecisionLogEntry & { guardianView?: GuardianDecisionLogViewModel } {
  const guardianView = buildGuardianDecisionLogView({
    metadata: entry.metadata,
    persona: entry.persona === 'SYSTEM' ? undefined : entry.persona,
  });
  return guardianView ? { ...entry, guardianView } : entry;
}
