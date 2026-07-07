import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { History, X } from 'lucide-react';
import { tripsApi } from '@/api/trips';
import { LogoLoading } from '@/components/common/LogoLoading';
import { PersonaAvatar } from '@/components/common/PersonaAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GuardianTimelineBadges } from '@/components/guardian';
import { EvidenceRefsReadable } from '@/lib/evidence-refs-readability';
import {
  getTripDecisionEvidenceRefs,
  OntologyTripDecisionExtras,
  extractTripDecisionOntologyEvidenceDisplayZh,
  extractTripDecisionReadinessEvidenceDisplayZh,
  extractTripDecisionReadinessTechnicalEvidenceRefs,
} from '@/lib/ontology-decision-display';
import { cn } from '@/lib/utils';
import { TRIP_DETAIL_NAV } from '@/lib/trip-detail-terminology.util';
import { evidenceRefsSuggestTripFiles } from '@/lib/trip-detail-evidence-files.util';
import { trackTripDetailEvidenceFilesLink } from '@/utils/trip-detail-analytics';
import type { DecisionLogEntry } from '@/types/trip';
import { TripDetailSection, TripDetailStatCard, TripDetailTwoColumn, tripDetailUi } from '../trip-detail-ui';

function getPersonaName(persona?: string): string {
  switch (persona) {
    case 'ABU':
      return 'Abu';
    case 'DR_DRE':
      return 'Dr.Dre';
    case 'NEPTUNE':
      return 'Neptune';
    default:
      return '';
  }
}

interface TripDetailDecisionLogTabProps {
  tripId: string;
  onOpenFilesTab?: () => void;
}

export default function TripDetailDecisionLogTab({
  tripId,
  onOpenFilesTab,
}: TripDetailDecisionLogTabProps) {
  const [logs, setLogs] = useState<DecisionLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await tripsApi.getDecisionLog(tripId, 50, 0);
        const items = response.items || [];
        setLogs(items);
        setSelectedId(items[0]?.id ?? null);
      } catch {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tripId]);

  const selected = logs.find((l) => l.id === selectedId);
  const pendingCount = logs.filter((l) => l.description?.includes('待')).length;
  const evidenceLogCount = logs.filter((log) => getTripDecisionEvidenceRefs(log).length > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LogoLoading size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <TripDetailStatCard
          label="决策统计"
          value={logs.length}
          sub={
            <p className="text-xs text-muted-foreground">
              已确认 {logs.length - pendingCount} · 待确认 {pendingCount}
            </p>
          }
          icon={<History className="w-5 h-5" />}
        />
        <TripDetailStatCard
          label="最近一次变更"
          value={logs[0] ? format(new Date(logs[0].date), 'MM-dd HH:mm') : '—'}
          sub={logs[0]?.description?.slice(0, 24)}
        />
        <TripDetailStatCard
          label="含证据记录"
          value={evidenceLogCount}
          sub={
            <p className="text-xs text-muted-foreground">
              {evidenceLogCount > 0 ? '可展开查看证据链' : '暂无关联证据'}
            </p>
          }
        />
      </div>

      <TripDetailTwoColumn
        main={
          <TripDetailSection title="决策时间轴">
            {logs.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>暂无{TRIP_DETAIL_NAV.decisionHistory}</p>
              </div>
            ) : (
              <div className="space-y-0">
                {logs.map((log, idx) => (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => setSelectedId(log.id)}
                    className={cn(
                      'w-full text-left flex gap-4 py-4 border-b border-border last:border-0 transition-colors',
                      selectedId === log.id && tripDetailUi.listItemActive,
                    )}
                  >
                    <div className="w-16 shrink-0 text-xs text-muted-foreground pt-1 tabular-nums">
                      {format(new Date(log.date), 'MM-dd HH:mm', { locale: zhCN })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {idx === 0 ? (
                          <Badge variant="outline" className="text-[10px] border-border bg-muted text-foreground">最新</Badge>
                        ) : null}
                        <span className="font-medium text-sm text-foreground">{log.description}</span>
                        <Badge variant="outline" className={tripDetailUi.tagAllow}>已确认</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {log.persona ? <PersonaAvatar persona={log.persona} size={18} withBackground /> : null}
                        <span>{getPersonaName(log.persona)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TripDetailSection>
        }
        sidebar={
          selected ? (
            <div className={tripDetailUi.card + ' sticky top-4'}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="font-semibold text-foreground">决策详情</h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedId(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <Badge variant="outline" className={tripDetailUi.tagAllow}>已确认</Badge>
                  <h4 className="text-lg font-bold text-foreground mt-2">{selected.description}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(selected.date), 'yyyy年M月d日 HH:mm', { locale: zhCN })}
                  </p>
                </div>
                {selected.source ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">来源</p>
                    <p className="text-sm text-foreground">{selected.source}</p>
                  </div>
                ) : null}
                <GuardianTimelineBadges metadata={selected.metadata} />
                {(() => {
                  const meta = selected.metadata as Record<string, unknown> | undefined;
                  const outputsSummary =
                    typeof meta?.outputs_summary === 'string' ? meta.outputs_summary.trim() : '';
                  const evidenceRefs = getTripDecisionEvidenceRefs(selected);
                  const showFilesLink =
                    onOpenFilesTab && evidenceRefsSuggestTripFiles(evidenceRefs);
                  const ontologyZh = extractTripDecisionOntologyEvidenceDisplayZh(selected);
                  const readinessZh = extractTripDecisionReadinessEvidenceDisplayZh(selected);
                  const readinessTechnicalRefs =
                    extractTripDecisionReadinessTechnicalEvidenceRefs(selected);
                  if (
                    !outputsSummary &&
                    evidenceRefs.length === 0 &&
                    !ontologyZh?.length &&
                    !readinessZh?.length
                  ) {
                    return null;
                  }
                  return (
                    <div className="space-y-3">
                      {showFilesLink ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-full text-xs"
                          onClick={() => {
                            trackTripDetailEvidenceFilesLink({
                              tripId,
                              fromTab: 'decision-log',
                              direction: 'to_files',
                            });
                            onOpenFilesTab?.();
                          }}
                        >
                          查看相关行程凭证
                        </Button>
                      ) : null}
                      <EvidenceRefsReadable
                      refs={evidenceRefs}
                      ontologyEvidenceDisplayZh={ontologyZh}
                      readinessEvidenceDisplayZh={readinessZh}
                      readinessTechnicalEvidenceRefs={readinessTechnicalRefs}
                      outputsSummary={outputsSummary || null}
                    />
                    </div>
                  );
                })()}
                <OntologyTripDecisionExtras log={selected} />
              </div>
            </div>
          ) : (
            <TripDetailSection title="决策详情">
              <p className="text-sm text-muted-foreground">选择左侧记录查看详情</p>
            </TripDetailSection>
          )
        }
      />
    </div>
  );
}
