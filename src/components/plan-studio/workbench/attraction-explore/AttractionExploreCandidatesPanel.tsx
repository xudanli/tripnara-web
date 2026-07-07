import { useMemo, useState } from 'react';
import {
  ChevronDown,
  GripVertical,
  Map,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import Logo from '@/components/common/Logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  AttractionExploreCandidate,
  AttractionExplorePriority,
  AttractionExploreSummary,
} from '@/types/attraction-explore';
import {
  workbenchAttractionExploreAiBox,
  workbenchAttractionExploreCandidateItem,
  workbenchAttractionExploreSummaryBar,
  workbenchPrimaryAction,
  workbenchScrollable,
} from '../workbench-ui';

const PRIORITY_GROUPS: Array<{
  id: AttractionExplorePriority;
  label: string;
}> = [
  { id: 'must_go', label: '必去' },
  { id: 'very_interested', label: '很感兴趣' },
  { id: 'alternative', label: '备选' },
];

export interface AttractionExploreCandidatesPanelProps {
  candidates: AttractionExploreCandidate[];
  summary?: AttractionExploreSummary | null;
  loading?: boolean;
  autoArrangePending?: boolean;
  consultAiPending?: boolean;
  consultAiAnswer?: string | null;
  onAutoArrange?: () => void;
  onCompare?: () => void;
  onViewMap?: () => void;
  onConsultAi?: () => void;
  onRemoveCandidate?: (candidateId: string) => void;
  removePending?: boolean;
  className?: string;
}

export function AttractionExploreCandidatesPanel({
  candidates,
  summary,
  loading = false,
  autoArrangePending,
  consultAiPending,
  consultAiAnswer,
  onAutoArrange,
  onCompare,
  onViewMap,
  onConsultAi,
  onRemoveCandidate,
  removePending = false,
  className,
}: AttractionExploreCandidatesPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<AttractionExplorePriority, boolean>>({
    must_go: false,
    very_interested: false,
    alternative: false,
  });

  const grouped = useMemo(() => {
    const map: Record<AttractionExplorePriority, AttractionExploreCandidate[]> = {
      must_go: [],
      very_interested: [],
      alternative: [],
    };
    for (const candidate of candidates) {
      map[candidate.priority].push(candidate);
    }
    for (const key of Object.keys(map) as AttractionExplorePriority[]) {
      map[key].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [candidates]);

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="shrink-0 border-b border-border/50 px-3 py-1.5">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">我的候选清单</h2>
      </div>

      <div className={cn('min-h-0 flex-1 overflow-y-auto p-3', workbenchScrollable)}>
        {loading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">正在加载候选清单…</p>
        ) : (
          <div className="space-y-2">
            {PRIORITY_GROUPS.map((group) => {
              const items = grouped[group.id];
              const isCollapsed = collapsed[group.id];
              return (
                <div key={group.id} className="rounded-xl border border-border/55 bg-card">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                    onClick={() =>
                      setCollapsed((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                    }
                  >
                    <span className="text-xs font-medium text-foreground">
                      {group.label}
                      <span className="ml-1.5 text-muted-foreground">({items.length})</span>
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 text-muted-foreground transition-transform',
                        isCollapsed && '-rotate-90',
                      )}
                    />
                  </button>
                  {!isCollapsed ? (
                    <ul className="space-y-1 border-t border-border/40 px-2 py-2">
                      {items.length === 0 ? (
                        <li className="px-1 py-2 text-[11px] text-muted-foreground">暂无</li>
                      ) : (
                        items.map((item) => (
                          <li key={item.id} className={workbenchAttractionExploreCandidateItem}>
                            <GripVertical
                              className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                              aria-hidden
                            />
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt=""
                                className="h-8 w-8 shrink-0 rounded-md object-cover"
                              />
                            ) : (
                              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/30 text-[10px] text-muted-foreground">
                                POI
                              </span>
                            )}
                            <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">
                              {item.name}
                            </span>
                            {onRemoveCandidate ? (
                              <button
                                type="button"
                                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                                aria-label={`移出 ${item.name}`}
                                disabled={removePending}
                                onClick={() => onRemoveCandidate(item.id)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </li>
                        ))
                      )}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {summary ? (
        <div className={cn('mx-3 mb-2 grid grid-cols-3 gap-2 px-2 py-2', workbenchAttractionExploreSummaryBar)}>
          <Stat label="景点" value={`${summary.attractionCount} 个`} />
          <Stat label="预计" value={`${summary.estimatedDays} 天`} />
          <Stat
            label="路线跨度"
            value={
              summary.routeSpanKm > 0 ? `${summary.routeSpanKm} km` : '待计算'
            }
          />
        </div>
      ) : null}

      <div className="shrink-0 space-y-2 border-t border-border/50 px-3 py-3">
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8 text-[11px]" onClick={onCompare}>
            对比所选
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 text-[11px]" onClick={onViewMap}>
            <Map className="mr-1 h-3.5 w-3.5" />
            查看地图
          </Button>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={autoArrangePending}
          className={cn('h-9 w-full rounded-lg text-xs', workbenchPrimaryAction)}
          onClick={onAutoArrange}
        >
          <Wand2 className="mr-1.5 h-3.5 w-3.5" />
          {autoArrangePending ? '编排中…' : '自动编排'}
        </Button>

        <div className={workbenchAttractionExploreAiBox}>
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background">
              <Logo variant="icon" size={16} color="currentColor" className="text-foreground" />
            </span>
            <div>
              <p className="text-xs font-semibold text-foreground">问 AI 怎么选？</p>
              <p className="text-[10px] text-muted-foreground">基于候选清单给出取舍建议</p>
            </div>
          </div>
          {consultAiAnswer ? (
            <p className="mb-2 rounded-lg border border-border/50 bg-background/80 px-2.5 py-2 text-[11px] leading-relaxed text-foreground">
              {consultAiAnswer}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={consultAiPending}
            className="h-8 w-full text-[11px]"
            onClick={onConsultAi}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {consultAiPending ? '分析中…' : '问 AI'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
