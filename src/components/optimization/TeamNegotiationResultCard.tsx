/**
 * 团队协商结果卡片
 *
 * 对齐 NegotiationResultCard 视觉风格，展示团队协商结论与可执行建议
 * @see docs/team-tab-product-interaction-design.md
 * @see .claude/agents/协商结果-视觉方案.md
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { TeamNegotiationResponse } from '@/types/optimization-v2';
import {
  collectTeamNegotiationCriticalConcerns,
  canShowGuardianChoose,
  extractChooseOptions,
  resolveTeamNegotiationHardBlocked,
} from '@/lib/guardian-presentation.util';
import { GuardianChooseModal } from '@/components/guardian/GuardianChooseModal';
import { GuardianPresentationPanel } from '@/components/guardian/GuardianPresentationPanel';
import { useGuardianHumanChoice } from '@/hooks/useGuardianHumanChoice';
import type { GuardianPersonaPresentation } from '@/types/guardian-presentation';
import {
  Users,
  AlertTriangle,
  MessageSquare,
  Pencil,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Shield,
  HelpCircle,
} from 'lucide-react';

// ==================== 配置 ====================

/** 效用分数 → 可读状态（与 NegotiationResultCard 一致） */
function getScoreLabel(percentage: number): string {
  if (percentage >= 70) return '良好';
  if (percentage >= 40) return '一般';
  return '待改进';
}

/** 摘要提取：取首句或前 40 字 */
function extractSummary(text: string, maxLen = 40): string {
  const match = text.match(/^[^。！？]+[。！？]?/);
  const first = (match ? match[0].trim() : text) || text;
  if (first.length <= maxLen) return first;
  return first.slice(0, maxLen) + '…';
}

// ==================== 子组件 ====================

/** 成员评估卡片（L2，对齐 GuardianEvaluation 风格） */
function MemberEvaluationRow({
  displayName,
  utility,
}: {
  displayName: string;
  utility: number;
}) {
  const safeUtility =
    typeof utility === 'number' && Number.isFinite(utility) ? utility : 0;
  const percentage = Math.round(Math.max(0, Math.min(1, safeUtility)) * 100);
  const label = getScoreLabel(percentage);

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Users className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{displayName}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold tabular-nums text-lg">{percentage}</p>
        <p className="text-xs text-muted-foreground">效用</p>
      </div>
    </div>
  );
}

/** 冲突任务行（L3，对齐 SuggestionTaskRow 结构：48px 高） */
function ConflictTaskRow({
  conflict,
  onGoToPlan,
}: {
  conflict: { description: string; suggestedResolution?: string; members?: string[] };
  onGoToPlan?: () => void;
}) {
  const [detailOpen, setDetailOpen] = React.useState(false);
  const summary = extractSummary(conflict.description);
  const hasDetail = conflict.description.length > summary.length;
  const hasSuggested = !!conflict.suggestedResolution?.trim();

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-3 min-h-[48px]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm line-clamp-2">{summary}</p>
          {conflict.members && conflict.members.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">涉及：{conflict.members.join('、')}</p>
          )}
        </div>
        {hasSuggested && onGoToPlan && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 text-xs"
            onClick={onGoToPlan}
          >
            <Pencil className="h-3 w-3 mr-1" />
            去改行程
          </Button>
        )}
      </div>
      {(hasDetail || hasSuggested) && (
        <Collapsible open={detailOpen} onOpenChange={setDetailOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors">
            {detailOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            查看详情
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 pb-3 pt-0 space-y-2 text-sm text-muted-foreground">
              {hasDetail && <p>{conflict.description}</p>}
              {hasSuggested && (
                <p className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-primary">{conflict.suggestedResolution}</span>
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

// ==================== 主组件 ====================

export interface TeamNegotiationResultCardProps {
  /** 团队协商结果 */
  result: TeamNegotiationResponse;
  /** 行程 ID（用于「去改行程」按钮展示） */
  tripId?: string;
  /** 点击「去改行程」时的回调（优先于 navigate） */
  onGoToPlan?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 是否嵌入模式（不渲染外层 Card） */
  embedded?: boolean;
  /** 是否展示成员 utility 分数（默认 false，对齐 Guardian P1） */
  showMemberUtilityScores?: boolean;
  /** 登录用户 ID（Team CHOOSE 写回） */
  userId?: string | null;
}

export function TeamNegotiationResultCard({
  result,
  tripId,
  onGoToPlan,
  className,
  embedded = false,
  showMemberUtilityScores = false,
  userId,
}: TeamNegotiationResultCardProps) {
  const navigate = useNavigate();
  const [chooseOpen, setChooseOpen] = React.useState(false);
  const [postChoosePresentation, setPostChoosePresentation] =
    React.useState<GuardianPersonaPresentation | null>(null);

  const handleGoToPlan =
    onGoToPlan ?? (tripId ? () => navigate(`/dashboard/plan-studio?tripId=${tripId}`) : undefined);

  const decisionLabel =
    result.decision === 'APPROVE'
      ? '通过'
      : result.decision === 'REJECT'
        ? '拒绝'
        : result.decision === 'APPROVE_WITH_CONDITIONS'
          ? '有条件通过'
          : '需人工决策';

  const consensusPercent = Math.round(
    Number.isFinite(result.consensusLevel) ? result.consensusLevel * 100 : 0
  );

  const constraintsSatisfied = result.teamConstraintsSatisfied !== false;
  const criticalConcerns = collectTeamNegotiationCriticalConcerns(result);
  const hardBlocked = resolveTeamNegotiationHardBlocked(result);
  const chooseOptions = extractChooseOptions({ teamNegotiation: result });
  const [activeChooseOptions, setActiveChooseOptions] = React.useState(chooseOptions);

  React.useEffect(() => {
    setActiveChooseOptions(chooseOptions);
    setPostChoosePresentation(null);
  }, [result, chooseOptions.join('|')]);

  const showChoose = canShowGuardianChoose({
    decision: result.decision,
    hardConstraintBlocked: hardBlocked,
    chooseOptions: activeChooseOptions,
  });

  const { submitChoice, isSubmitting: isChooseSubmitting } = useGuardianHumanChoice({
    userId,
    tripId,
    source: 'team_negotiation',
    decisionPoints: activeChooseOptions,
    onPresentation: (next) => {
      setPostChoosePresentation(next);
      const refreshed = extractChooseOptions({
        presentation: next,
        teamNegotiation: result,
      });
      if (refreshed.length > 0) setActiveChooseOptions(refreshed);
    },
  });

  const conflictsWithSuggestion = (result.conflicts ?? []).filter((c) => c.suggestedResolution?.trim());
  const conflictsWithoutSuggestion = (result.conflicts ?? []).filter((c) => !c.suggestedResolution?.trim());

  const content = (
    <div className={cn('space-y-4', embedded ? '' : 'pt-4')}>
        {criticalConcerns.length > 0 ? (
          <div
            className={cn(
              'rounded-lg border px-3 py-2 text-sm',
              hardBlocked
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-amber-200 bg-amber-50 text-amber-950',
            )}
          >
            <p className="font-medium flex items-center gap-1.5 mb-1">
              <Shield className="h-4 w-4 shrink-0" />
              {hardBlocked ? 'Abu 硬风险摘要' : '关键关注点'}
            </p>
            <ul className="space-y-1 text-xs sm:text-sm">
              {criticalConcerns.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
            {hardBlocked ? (
              <p className="text-xs mt-2 text-red-800">
                存在不可忽略的安全/合规或最弱链约束，请先修改方案后再协调软约束分歧。
              </p>
            ) : null}
          </div>
        ) : null}

        {postChoosePresentation ? (
          <GuardianPresentationPanel presentation={postChoosePresentation} />
        ) : null}

        {showChoose ? (
          <div className="space-y-2">
            <Button
              size="sm"
              variant="default"
              disabled={isChooseSubmitting}
              onClick={() => setChooseOpen(true)}
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
              做出团队价值取舍
            </Button>
            <GuardianChooseModal
              open={chooseOpen}
              onOpenChange={setChooseOpen}
              points={activeChooseOptions}
              title="团队协商 — 需要您选择"
              description="以下为软约束分歧，不会覆盖已判定的硬风险或最弱链约束。"
              onConfirm={(idx, text) => {
                void submitChoice(idx, text, activeChooseOptions);
              }}
            />
          </div>
        ) : null}

        {/* L1：共识度 + 结论 */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">共识度</span>
            <span className="text-sm font-bold tabular-nums">{consensusPercent}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                result.decision === 'APPROVE'
                  ? 'default'
                  : result.decision === 'REJECT'
                    ? 'destructive'
                    : 'secondary'
              }
            >
              {decisionLabel}
            </Badge>
            <Badge variant={constraintsSatisfied ? 'outline' : 'destructive'}>
              {constraintsSatisfied ? '约束满足' : '约束未满足'}
            </Badge>
          </div>
        </div>

        {/* L2：成员评估（默认隐藏 utility 气泡） */}
        {showMemberUtilityScores &&
        result.memberEvaluations &&
        result.memberEvaluations.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              成员评估
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {result.memberEvaluations.map((m, i) => (
                <MemberEvaluationRow key={i} displayName={m.displayName} utility={m.utility} />
              ))}
            </div>
          </div>
        ) : null}

        {/* L3：建议你先做（有 suggestedResolution 的冲突，≤5 条首屏，超出折叠，HCI Miller's Law） */}
        {conflictsWithSuggestion.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Lightbulb className="h-3.5 w-3.5" />
              建议你先做
            </p>
            <div className="space-y-2">
              {conflictsWithSuggestion.slice(0, 5).map((c, i) => (
                <ConflictTaskRow
                  key={i}
                  conflict={c}
                  onGoToPlan={handleGoToPlan}
                />
              ))}
            </div>
            {conflictsWithSuggestion.length > 5 && (
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <Lightbulb className="h-4 w-4" />
                  更多建议 ({conflictsWithSuggestion.length - 5} 项)
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 pt-2">
                    {conflictsWithSuggestion.slice(5).map((c, i) => (
                      <ConflictTaskRow
                        key={i + 5}
                        conflict={c}
                        onGoToPlan={handleGoToPlan}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        {/* 其他冲突（无建议的） */}
        {conflictsWithoutSuggestion.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <MessageSquare className="h-4 w-4" />
              其他冲突 ({conflictsWithoutSuggestion.length} 项)
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 pt-2">
                {conflictsWithoutSuggestion.map((c, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-sm"
                  >
                    <p>{c.description}</p>
                    {c.members && c.members.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">涉及：{c.members.join('、')}</p>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* 成员关注点（可选，折叠展示） */}
        {result.memberEvaluations?.some((m) => m.concerns?.length) && (
          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <Users className="h-4 w-4" />
              成员关注点
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 pt-2">
                {result.memberEvaluations
                  ?.filter((m) => m.concerns?.length)
                  .map((m, i) => (
                    <div key={i} className="p-2 rounded bg-muted/50 text-sm">
                      <span className="font-medium">{m.displayName}：</span>
                      <span className="text-muted-foreground">{m.concerns?.join('、')}</span>
                    </div>
                  ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
    </div>
  );

  if (embedded) {
    return <div className={cn(className)}>{content}</div>;
  }

  return (
    <Card className={cn(className)}>
      <CardContent className="pt-4">{content}</CardContent>
    </Card>
  );
}

export default TeamNegotiationResultCard;
