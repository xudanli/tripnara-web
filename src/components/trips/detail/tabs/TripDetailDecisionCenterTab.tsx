import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TravelStatusSection from '@/components/travel-status/TravelStatusSection';
import TravelStatusDecisionCards from '@/components/travel-status/TravelStatusDecisionCards';
import TravelStatusIntentInput from '@/components/travel-status/TravelStatusIntentInput';
import { useTravelStatusSurface } from '@/hooks/useTravelStatusSurface';
import { TripDetailSection, TripDetailTwoColumn } from '../trip-detail-ui';

interface TripDetailDecisionCenterTabProps {
  tripId: string;
  onOpenTimeline?: () => void;
  scrollToSection?: 'verify' | null;
  onScrollToSectionHandled?: () => void;
}

/** 决策中心 — 待拍板事项 + 建议确认 + AI 意图 */
export default function TripDetailDecisionCenterTab({
  tripId,
  onOpenTimeline,
  scrollToSection,
  onScrollToSectionHandled,
}: TripDetailDecisionCenterTabProps) {
  const navigate = useNavigate();
  const decisionQueueRef = useRef<HTMLDivElement>(null);
  const verificationRef = useRef<HTMLDivElement>(null);

  const {
    status,
    isLoading,
    error,
    isUnavailable,
    preview,
    previewIntent,
    isSubmitting,
    isAccepting,
    acceptingProblemId,
    isSubmittingQueueAction,
    submittingQueueAction,
    decisionQueueItems,
    openDecisionCount,
    suggestedConfirmCount,
    hasInlineVerificationItems,
    handleViewAlternatives,
    handleQueueSecondaryAction,
    handleAcceptRecommended,
    handleIntentSubmit,
    refresh,
  } = useTravelStatusSurface(tripId);

  const scrollToDecisionQueue = useCallback(() => {
    decisionQueueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    if (scrollToSection !== 'verify') return;
    verificationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onScrollToSectionHandled?.();
  }, [scrollToSection, onScrollToSectionHandled]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LogoLoading />
      </div>
    );
  }

  if (error && isUnavailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">决策中心暂不可用</CardTitle>
          <CardDescription>travel-status 接口尚未就绪。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {onOpenTimeline ? (
            <Button variant="outline" size="sm" onClick={onOpenTimeline}>
              查看规划
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/dashboard/plan-studio?tripId=${tripId}`)}
          >
            进入 Plan Studio
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error || !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">加载失败</CardTitle>
          <CardDescription>{(error as Error)?.message ?? '无法获取旅行状态'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" onClick={() => void refresh()}>
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <TripDetailTwoColumn
      main={
        <div className="space-y-4">
          <div ref={decisionQueueRef}>
            <TravelStatusSection
              id="travel-decisions"
              title="需要你决定"
              description={
                openDecisionCount > 0
                  ? `${openDecisionCount} 项待处理 · 接受推荐后将更新有效行程`
                  : '暂无必须拍板的事项'
              }
            >
              <TravelStatusDecisionCards
                items={decisionQueueItems}
                suggestedConfirmCount={suggestedConfirmCount}
                onScrollToVerification={() =>
                  document.getElementById('travel-verification')?.scrollIntoView({ behavior: 'smooth' })
                }
                onAcceptRecommended={handleAcceptRecommended}
                onViewAlternatives={handleViewAlternatives}
                onKeepOriginal={(problemId, action) =>
                  void handleQueueSecondaryAction(problemId, action, 'keepOriginal')
                }
                onDefer={(problemId, action) =>
                  void handleQueueSecondaryAction(problemId, action, 'defer')
                }
                acceptingProblemId={isAccepting ? acceptingProblemId : null}
                submittingAction={
                  isSubmittingQueueAction && submittingQueueAction
                    ? {
                        problemId: submittingQueueAction.problemId,
                        kind: submittingQueueAction.actionKind,
                      }
                    : null
                }
              />
            </TravelStatusSection>
          </div>

          {(status.pendingVerification?.items?.length ?? 0) > 0 || suggestedConfirmCount > 0 ? (
            <div ref={verificationRef}>
            <TravelStatusSection
              id="travel-verification"
              title="建议确认"
              description={
                hasInlineVerificationItems
                  ? '非阻塞项 · 确认后提升行程把握度'
                  : `${suggestedConfirmCount} 项在规划工作台 · 非阻塞`
              }
            >
              {(status.pendingVerification?.items ?? []).length > 0 ? (
                <ul className="space-y-2">
                  {(status.pendingVerification?.items ?? []).map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-gate-confirm-border/35 bg-gate-confirm/5 px-3 py-2.5"
                    >
                      <p className="text-xs font-medium text-foreground">{item.label}</p>
                      {item.summary ? (
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                          {item.summary}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-lg border border-gate-confirm-border/35 bg-gate-confirm/5 px-3 py-3">
                  <p className="text-xs font-medium text-foreground">
                    共 {suggestedConfirmCount} 项建议确认
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    这些项在规划工作台的行前任务中。确认后将提升行程可执行把握度。
                  </p>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => navigate(`/dashboard/plan-studio?tripId=${tripId}&tab=tasks`)}
                >
                  {hasInlineVerificationItems ? '前往 Plan Studio 处理' : `在 Plan Studio 查看 ${suggestedConfirmCount} 项`}
                </Button>
                {onOpenTimeline ? (
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onOpenTimeline}>
                    查看规划详情
                  </Button>
                ) : null}
              </div>
            </TravelStatusSection>
            </div>
          ) : null}
        </div>
      }
      sidebar={
        <TripDetailSection title="问 AI" description="自然语言提问或发起修改">
          <TravelStatusIntentInput
            preview={preview}
            onPreview={previewIntent}
            onSubmit={(message) => handleIntentSubmit(message, scrollToDecisionQueue)}
            isSubmitting={isSubmitting}
          />
        </TripDetailSection>
      }
    />
  );
}
