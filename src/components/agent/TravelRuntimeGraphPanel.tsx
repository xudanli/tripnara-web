import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, GitGraph, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TravelRuntimeGraph } from '@/types/travel-runtime-graph';
import {
  hasTravelRuntimeGraphContent,
  resolveTravelRuntimeNodeLabel,
} from '@/lib/travel-runtime-graph.util';
import { formatCascadeTriggerLabel } from '@/lib/readiness-cascade.util';
import { useTranslation } from 'react-i18next';

export interface TravelRuntimeGraphPanelProps {
  graph: TravelRuntimeGraph;
  className?: string;
  compact?: boolean;
  /** 非调试模式默认折叠，仅展示摘要 */
  defaultCollapsed?: boolean;
  /** 展示专家/调试徽章与原始 JSON */
  debugMode?: boolean;
}

function nodeStatusClass(status: string | undefined): string {
  const s = (status ?? '').toUpperCase();
  if (s.includes('BLOCK') || s.includes('CRITICAL')) {
    return 'border-gate-reject-border bg-gate-reject text-gate-reject-foreground dark:border-gate-reject-border/50 dark:bg-gate-reject/30';
  }
  if (s.includes('AFFECT') || s.includes('WARN')) {
    return 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30';
  }
  if (s.includes('ABSORB') || s.includes('BUFFER')) {
    return 'border-border bg-muted/15 text-muted-foreground dark:border-border/50 dark:bg-muted/15';
  }
  return 'border-border/70 bg-muted/20 text-foreground';
}

export default function TravelRuntimeGraphPanel({
  graph,
  className,
  compact = false,
  defaultCollapsed = true,
  debugMode = false,
}: TravelRuntimeGraphPanelProps) {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const [expanded, setExpanded] = useState(!defaultCollapsed);

  const nodeByKind = useMemo(() => {
    const map = new Map<string, typeof graph.nodes>();
    for (const node of graph.nodes) {
      const key = node.kind ?? 'UNKNOWN';
      const list = map.get(key) ?? [];
      list.push(node);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [graph.nodes]);

  if (!hasTravelRuntimeGraphContent(graph)) return null;

  const triggerLabel = graph.trigger?.label ?? graph.trigger?.message;
  const triggerFact = graph.trigger?.factType
    ? formatCascadeTriggerLabel(graph.trigger.factType, isZh)
    : undefined;

  const affectedCount = graph.nodes.filter((n) => {
    const s = (n.status ?? '').toUpperCase();
    return s.includes('AFFECT') || s.includes('BLOCK') || s.includes('WARN');
  }).length;

  const collapsedSummary =
    graph.summary ??
    t('agent.travelRuntimeGraph.collapsedSummary', {
      defaultValue: '{{trigger}}影响 {{nodes}} 个节点 · {{edges}} 条传播',
      trigger: triggerFact ?? triggerLabel ?? (isZh ? '事件' : 'event'),
      nodes: affectedCount > 0 ? affectedCount : graph.nodes.length,
      edges: graph.edges.length,
    });

  const header = (
    <div className="flex w-full items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <CardTitle className={cn('flex flex-wrap items-center gap-2 text-base', compact && 'text-sm')}>
          <GitGraph className="h-4 w-4 text-muted-foreground" />
          {t('agent.travelRuntimeGraph.title', { defaultValue: '影响传播' })}
          {debugMode ? (
            <Badge variant="outline" className="text-[10px] font-normal">
              {t('agent.travelRuntimeGraph.debugBadge', { defaultValue: '专家 / 调试' })}
            </Badge>
          ) : null}
        </CardTitle>
        {!expanded ? (
          <p className="mt-1 text-[11px] text-muted-foreground leading-snug line-clamp-2">
            {collapsedSummary}
          </p>
        ) : graph.summary ? (
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{graph.summary}</p>
        ) : null}
      </div>
      {defaultCollapsed ? (
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-180'
          )}
        />
      ) : null}
    </div>
  );

  return (
    <Card
      className={cn(
        'border-border/80 bg-muted/15 dark:bg-muted/10',
        compact && 'shadow-none',
        className
      )}
    >
      {defaultCollapsed ? (
        <button
          type="button"
          className="w-full px-3 py-2.5 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {header}
        </button>
      ) : (
        <CardHeader className={cn('pb-2', compact && 'py-3')}>{header}</CardHeader>
      )}

      {expanded ? (
        <CardContent className={cn('space-y-3 border-t', compact ? 'pt-3 pb-3' : 'pt-0')}>
          {graph.trigger ? (
            <div className="rounded-md border border-border/70 bg-card px-3 py-2">
              <div className="flex items-start gap-2">
                <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-medium text-foreground">
                    {t('agent.travelRuntimeGraph.trigger', { defaultValue: '触发' })}
                    {triggerFact ? ` · ${triggerFact}` : ''}
                  </p>
                  {triggerLabel ? (
                    <p className="text-[11px] text-muted-foreground leading-snug">{triggerLabel}</p>
                  ) : null}
                  {debugMode && graph.trigger.id ? (
                    <p className="font-mono text-[10px] text-muted-foreground">{graph.trigger.id}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {graph.nodes.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">
                {t('agent.travelRuntimeGraph.nodes', {
                  defaultValue: '受影响节点（{{count}}）',
                  count: graph.nodes.length,
                })}
              </p>
              {nodeByKind.map(([kind, nodes]) => (
                <div key={kind} className="space-y-1">
                  {!debugMode ? null : (
                    <p className="text-[10px] font-mono uppercase text-muted-foreground">{kind}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {nodes.map((node) => (
                      <span
                        key={node.id}
                        title={debugMode ? node.id : undefined}
                        className={cn(
                          'inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-[11px]',
                          nodeStatusClass(node.status)
                        )}
                      >
                        <span className="truncate">{node.label ?? node.id}</span>
                        {node.status ? (
                          <Badge variant="outline" className="h-4 px-1 text-[9px] font-normal">
                            {node.status}
                          </Badge>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {graph.edges.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">
                {t('agent.travelRuntimeGraph.edges', {
                  defaultValue: '传播路径（{{count}}）',
                  count: graph.edges.length,
                })}
              </p>
              <ul className="space-y-1 text-[11px] text-muted-foreground">
                {graph.edges.map((edge, index) => (
                  <li
                    key={edge.id ?? `${edge.from}-${edge.to}-${index}`}
                    className="rounded border border-border/60 bg-background/60 px-2 py-1 leading-snug"
                  >
                    {resolveTravelRuntimeNodeLabel(edge.from, graph.nodes)}
                    <span className="mx-1 text-foreground/70">→</span>
                    {resolveTravelRuntimeNodeLabel(edge.to, graph.nodes)}
                    {edge.kind ? (
                      <span className="ml-1 text-[10px] text-muted-foreground dark:text-muted-foreground">
                        [{edge.kind}]
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {debugMode ? (
            <details className="text-[10px]">
              <summary className="cursor-pointer select-none text-muted-foreground">
                {t('agent.travelRuntimeGraph.rawJson', { defaultValue: '原始 JSON（调试）' })}
              </summary>
              <pre className="mt-1 max-h-48 overflow-auto rounded border bg-muted/25 p-2 font-mono leading-snug">
                {JSON.stringify(graph, null, 2)}
              </pre>
            </details>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
