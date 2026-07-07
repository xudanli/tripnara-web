import { AlertTriangle, Car, Clock, ExternalLink, MapPin } from 'lucide-react';
import {
  explorationIssueSourceLabel,
  getExplorationIssueSourceKind,
  getOntologyIssueUserHint,
} from '../api/helpers';
import type { ConsumerIssueView } from '../api/types';
import {
  isVehicleRelatedIssue,
  issueSeverityLabel,
} from '../lib/issue-severity.util';
import {
  exploreUi,
  semanticBadSurface,
  semanticBadText,
  semanticWarnSurface,
  semanticWarnText,
} from '../explore-ui';
import { cn } from '@/lib/utils';

interface ConsumerRiskCardProps {
  issue: ConsumerIssueView;
}

export function ConsumerRiskCard({ issue }: ConsumerRiskCardProps) {
  const isBlock = issue.severity === 'BLOCK';
  const isOptimize = issue.severity === 'OPTIMIZE';
  const severityClass = isBlock ? semanticBadText : isOptimize ? semanticWarnText : semanticBadText;
  const showVehicleCompare = isVehicleRelatedIssue(issue);
  const sourceKind = getExplorationIssueSourceKind(issue);
  const sourceLabel = explorationIssueSourceLabel(sourceKind);
  const ontologyHint = getOntologyIssueUserHint(issue.issueId);
  const displayHeadline = issue.headline || ontologyHint || '发现行程约束问题';

  return (
    <div className="space-y-5">
      <div>
        <p className={cn('text-xs font-medium mb-1', severityClass)}>
          {issueSeverityLabel(issue.severity)}
          <span className="text-muted-foreground font-normal ml-2">{sourceLabel}</span>
        </p>
        <h2 className="text-lg font-semibold text-foreground">{displayHeadline}</h2>
        {issue.consequence && (
          <p className="text-sm text-muted-foreground mt-1">{issue.consequence}</p>
        )}
      </div>

      {showVehicleCompare ? (
        <div className="rounded-2xl border border-border bg-muted/20 p-4 flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-card border border-border flex items-center justify-center mx-auto mb-2">
              <Car className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-[10px] text-muted-foreground">已选车辆</p>
            <p className="text-xs font-semibold">当前配置</p>
          </div>
          <div className="text-2xl text-muted-foreground">→</div>
          <div className="text-center">
            <div
              className={cn(
                'w-16 h-16 rounded-xl border flex items-center justify-center mx-auto mb-2',
                isBlock ? semanticBadSurface : semanticWarnSurface,
              )}
            >
              <AlertTriangle className={cn('w-8 h-8', severityClass)} />
            </div>
            <p className="text-[10px] text-muted-foreground">路线要求</p>
            <p className="text-xs font-semibold">见下方说明</p>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'rounded-2xl border p-4 flex items-start gap-3',
            isBlock ? semanticBadSurface : semanticWarnSurface,
          )}
        >
          {isOptimize ? (
            <Clock className={cn('w-5 h-5 flex-shrink-0 mt-0.5', semanticWarnText)} />
          ) : (
            <AlertTriangle className={cn('w-5 h-5 flex-shrink-0 mt-0.5', semanticBadText)} />
          )}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {issue.explanation ?? issue.consequence ?? '系统检测到该问题可能影响当前行程安排。'}
          </p>
        </div>
      )}

      {issue.explanation && showVehicleCompare && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-2">为什么这是个问题</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{issue.explanation}</p>
        </div>
      )}

      {issue.affectedSegmentLabel && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-2">影响哪里</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {issue.affectedDay ? `第 ${issue.affectedDay} 天：` : ''}
            {issue.affectedSegmentLabel}
          </p>
          <div className={cn('mt-3 h-32 flex items-center justify-center', exploreUi.mapPlaceholder)}>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <MapPin className={cn('w-3 h-3', severityClass)} />
              受影响路段示意
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-semibold mb-2">证据溯源</p>
        <p className="text-xs text-muted-foreground mb-2">
          Batch: {issue.source.gatewayAssessmentBatchId}
        </p>
        <button type="button" className={cn(exploreUi.linkInline, 'inline-flex items-center gap-0.5 text-[10px]')}>
          查看官方来源
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
