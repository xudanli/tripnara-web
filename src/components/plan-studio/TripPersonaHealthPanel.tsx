import { useMemo, useState } from 'react';
import { ChevronRight, Zap, CheckCircle2 } from 'lucide-react';
import { PersonaAvatar } from '@/components/common/PersonaAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { getPersonaName, type PersonaType } from '@/lib/persona-icons';
import type { ItineraryItemDetail, PersonaAlert, PlanStudioConflict, TripDetail } from '@/types/trip';
import type { Suggestion, SuggestionStats } from '@/types/suggestion';
import {
  getPersonaAlertUserBody,
  isUserVisiblePersonaAlert,
  normalizeSuggestionForDisplay,
} from '@/lib/persona-alert-display';

export type PersonaHealthPersona = PersonaType;
export type HealthFilterTab = 'all' | PersonaHealthPersona;

type HealthIssue = {
  id: string;
  severity: 'blocker' | 'warn' | 'info';
  title: string;
  body: string;
  source: 'alert' | 'suggestion' | 'conflict';
  persona?: PersonaHealthPersona;
  alert?: PersonaAlert;
  suggestion?: Suggestion;
  conflict?: PlanStudioConflict;
};

const PERSONA_TO_SUGGESTION: Record<PersonaHealthPersona, Suggestion['persona']> = {
  ABU: 'abu',
  DR_DRE: 'drdre',
  NEPTUNE: 'neptune',
};

const SEVERITY_ORDER: Record<HealthIssue['severity'], number> = {
  blocker: 0,
  warn: 1,
  info: 2,
};

const SEVERITY_BADGE: Record<HealthIssue['severity'], string> = {
  blocker: 'bg-muted text-error border-border',
  warn: 'bg-muted text-warning border-border',
  info: 'bg-muted text-muted-foreground border-border',
};

const SEVERITY_LABEL: Record<HealthIssue['severity'], string> = {
  blocker: '阻塞',
  warn: '警告',
  info: '提醒',
};

const TAB_PERSONAS: PersonaHealthPersona[] = ['ABU', 'DR_DRE', 'NEPTUNE'];

function sortIssues(issues: HealthIssue[]): HealthIssue[] {
  return [...issues].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
}

function mapAlertSeverity(alert: PersonaAlert): HealthIssue['severity'] {
  if (alert.severity === 'warning') return 'blocker';
  if (alert.severity === 'info') return 'warn';
  return 'info';
}

function collectPersonaIssues(
  persona: PersonaHealthPersona,
  personaAlerts: PersonaAlert[],
  suggestions: Suggestion[],
): HealthIssue[] {
  const suggestionPersona = PERSONA_TO_SUGGESTION[persona];
  const issues: HealthIssue[] = [];

  for (const alert of personaAlerts) {
    if (alert.persona !== persona || !isUserVisiblePersonaAlert(alert)) continue;
    if (alert.severity === 'success') continue;
    const body = getPersonaAlertUserBody(alert);
    if (!body.trim()) continue;
    issues.push({
      id: `alert-${alert.id}`,
      severity: mapAlertSeverity(alert),
      title: alert.title?.trim() || alert.name || '风险提醒',
      body,
      source: 'alert',
      persona,
      alert,
    });
  }

  for (const raw of suggestions) {
    if (raw.persona !== suggestionPersona) continue;
    if (raw.status === 'dismissed' || raw.status === 'applied') continue;
    const suggestion = normalizeSuggestionForDisplay(raw);
    const body = (suggestion.description || suggestion.summary || '').trim();
    if (!body && !suggestion.title?.trim()) continue;
    issues.push({
      id: `suggestion-${suggestion.id}`,
      severity: suggestion.severity,
      title: suggestion.title?.trim() || suggestion.summary?.trim() || '建议',
      body: body || suggestion.summary || '',
      source: 'suggestion',
      persona,
      suggestion,
    });
  }

  return sortIssues(issues);
}

function formatConflictAffectedDays(
  conflict: PlanStudioConflict,
  tripDays: TripDetail['TripDay'] | undefined,
): string {
  return conflict.affectedDays
    .map((d: string) => {
      const dayIndex = tripDays?.findIndex((day) => day.date === d) ?? -1;
      if (dayIndex >= 0) {
        const dateStr = new Date(d).toLocaleDateString('zh-CN', {
          month: 'short',
          day: 'numeric',
        });
        return `第${dayIndex + 1}天 (${dateStr})`;
      }
      return d;
    })
    .join(', ');
}

function resolveAffectedPlaceNames(
  conflict: PlanStudioConflict,
  itineraryItemsMap: Map<string, ItineraryItemDetail[]>,
): string[] {
  const names: string[] = [];
  conflict.affectedItemIds.forEach((itemId) => {
    itineraryItemsMap.forEach((items) => {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        const placeName =
          item.Place?.nameCN || item.Place?.nameEN || item.note || '未知地点';
        if (!names.includes(placeName)) names.push(placeName);
      }
    });
  });
  return names;
}

function conflictToHealthIssue(
  conflict: PlanStudioConflict,
  tripDays: TripDetail['TripDay'] | undefined,
  itineraryItemsMap: Map<string, ItineraryItemDetail[]>,
): HealthIssue {
  const parts: string[] = [];
  if (conflict.description?.trim()) parts.push(conflict.description.trim());
  const days = formatConflictAffectedDays(conflict, tripDays);
  if (days) parts.push(`日期：${days}`);
  const places = resolveAffectedPlaceNames(conflict, itineraryItemsMap);
  if (places.length > 0) {
    const placeLabel = places.slice(0, 3).join('、');
    parts.push(
      `涉及：${placeLabel}${places.length > 3 ? ` 等${places.length}项` : ''}`,
    );
  }

  return {
    id: `conflict-${conflict.id}`,
    severity:
      conflict.severity === 'HIGH'
        ? 'blocker'
        : conflict.severity === 'MEDIUM'
          ? 'warn'
          : 'info',
    title: conflict.title?.trim() || '节奏问题',
    body: parts.join('\n'),
    source: 'conflict',
    persona: 'DR_DRE',
    conflict,
  };
}

function issuesForTab(
  tab: HealthFilterTab,
  issuesByPersona: Map<PersonaHealthPersona, HealthIssue[]>,
  conflictIssues: HealthIssue[],
): HealthIssue[] {
  if (tab === 'all') {
    const merged = TAB_PERSONAS.flatMap((p) => issuesByPersona.get(p) ?? []);
    return sortIssues([...merged, ...conflictIssues]);
  }
  if (tab === 'DR_DRE') {
    return sortIssues([
      ...(issuesByPersona.get('DR_DRE') ?? []),
      ...conflictIssues,
    ]);
  }
  return issuesByPersona.get(tab as PersonaHealthPersona) ?? [];
}

function HealthIssueList({
  issues,
  onNavigateToSuggestion,
  onNavigateToAlert,
  onNavigateToConflict,
}: {
  issues: HealthIssue[];
  onNavigateToSuggestion?: (suggestion: Suggestion) => void;
  onNavigateToAlert?: (alert: PersonaAlert) => void;
  onNavigateToConflict?: (conflict: PlanStudioConflict) => void;
}) {
  if (issues.length === 0) return null;

  return (
    <div className="space-y-2">
      {issues.map((issue) => (
        <button
          key={issue.id}
          type="button"
          className={cn(
            'w-full text-left rounded-md border border-border/60 bg-muted/20',
            'px-2.5 py-2 hover:bg-muted/40 transition-colors',
          )}
          onClick={() => {
            if (issue.source === 'conflict' && issue.conflict) {
              onNavigateToConflict?.(issue.conflict);
              return;
            }
            if (issue.source === 'suggestion' && issue.suggestion) {
              onNavigateToSuggestion?.(issue.suggestion);
            } else if (issue.alert) {
              onNavigateToAlert?.(issue.alert);
            }
          }}
        >
          <div className="flex items-start gap-2">
            {issue.persona ? (
              <PersonaAvatar persona={issue.persona} size={20} className="shrink-0 mt-0.5" />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-xs font-medium text-foreground leading-snug">
                  {issue.title}
                </span>
                <Badge
                  variant="outline"
                  className={cn('text-[10px] px-1 py-0', SEVERITY_BADGE[issue.severity])}
                >
                  {SEVERITY_LABEL[issue.severity]}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line">
                {issue.body}
              </p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
          </div>
        </button>
      ))}
    </div>
  );
}

export interface TripPersonaHealthPanelProps {
  personaAlerts: PersonaAlert[];
  suggestionStats: SuggestionStats | null;
  suggestions: Suggestion[];
  scheduleConflicts?: PlanStudioConflict[];
  tripDays?: TripDetail['TripDay'];
  itineraryItemsMap?: Map<string, ItineraryItemDetail[]>;
  autoResolvableConflictCount?: number;
  suggestionsLoading?: boolean;
  onNavigateToSuggestion?: (suggestion: Suggestion) => void;
  onNavigateToAlert?: (alert: PersonaAlert) => void;
  onNavigateToConflict?: (conflict: PlanStudioConflict) => void;
  onOpenResolveConflicts?: () => void;
}

export function TripPersonaHealthPanel({
  personaAlerts,
  suggestionStats: _suggestionStats,
  suggestions,
  scheduleConflicts = [],
  tripDays,
  itineraryItemsMap = new Map(),
  autoResolvableConflictCount = 0,
  suggestionsLoading = false,
  onNavigateToSuggestion,
  onNavigateToAlert,
  onNavigateToConflict,
  onOpenResolveConflicts,
}: TripPersonaHealthPanelProps) {
  const [activeTab, setActiveTab] = useState<HealthFilterTab>('all');

  const issuesByPersona = useMemo(() => {
    const map = new Map<PersonaHealthPersona, HealthIssue[]>();
    for (const persona of TAB_PERSONAS) {
      map.set(persona, collectPersonaIssues(persona, personaAlerts, suggestions));
    }
    return map;
  }, [personaAlerts, suggestions]);

  const conflictIssues = useMemo(
    () =>
      scheduleConflicts.map((c) =>
        conflictToHealthIssue(c, tripDays, itineraryItemsMap),
      ),
    [scheduleConflicts, tripDays, itineraryItemsMap],
  );

  const tabCounts = useMemo(() => {
    const abu = issuesByPersona.get('ABU')?.length ?? 0;
    const drdre = issuesByPersona.get('DR_DRE')?.length ?? 0;
    const neptune = issuesByPersona.get('NEPTUNE')?.length ?? 0;
    const conflicts = conflictIssues.length;
    return {
      all: abu + drdre + neptune + conflicts,
      ABU: abu,
      DR_DRE: drdre + conflicts,
      NEPTUNE: neptune,
    };
  }, [issuesByPersona, conflictIssues.length]);

  const visibleIssues = issuesForTab(activeTab, issuesByPersona, conflictIssues);

  const showBulkResolve =
    autoResolvableConflictCount > 0 &&
    (activeTab === 'all' || activeTab === 'DR_DRE');

  const isEmpty = !suggestionsLoading && visibleIssues.length === 0;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as HealthFilterTab)}
      className="w-full"
    >
      <div className="flex items-center gap-2">
        <TabsList className="grid flex-1 grid-cols-2 sm:grid-cols-4 h-9">
          <TabsTrigger value="all" className="text-xs gap-1 px-2">
            全部
            {tabCounts.all > 0 ? (
              <Badge variant="secondary" className="h-4 px-1 text-[10px] min-w-0">
                {tabCounts.all}
              </Badge>
            ) : null}
          </TabsTrigger>
          {TAB_PERSONAS.map((persona) => (
            <TabsTrigger key={persona} value={persona} className="text-xs gap-1 px-1.5">
              <PersonaAvatar persona={persona} size={16} />
              <span className="truncate">{getPersonaName(persona)}</span>
              {tabCounts[persona] > 0 ? (
                <Badge
                  variant={persona === 'ABU' ? 'destructive' : 'secondary'}
                  className="h-4 px-1 text-[10px] min-w-0"
                >
                  {tabCounts[persona]}
                </Badge>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value={activeTab} className="mt-3 space-y-3">
        {showBulkResolve && onOpenResolveConflicts ? (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={onOpenResolveConflicts}
            >
              <Zap className="h-3.5 w-3.5" />
              一键解决冲突
              <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
                {autoResolvableConflictCount}
              </Badge>
            </Button>
          </div>
        ) : null}

        {suggestionsLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
            <Spinner className="h-3.5 w-3.5" />
            加载问题详情…
          </div>
        ) : isEmpty ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">当前维度暂无待处理问题</p>
          </div>
        ) : (
          <HealthIssueList
            issues={visibleIssues}
            onNavigateToSuggestion={onNavigateToSuggestion}
            onNavigateToAlert={onNavigateToAlert}
            onNavigateToConflict={onNavigateToConflict}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
