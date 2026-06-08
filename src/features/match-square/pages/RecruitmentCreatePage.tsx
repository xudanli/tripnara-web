import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { PermissionGateBanner } from '../components/PermissionGateBanner';
import { RecruitmentForm } from '../components/RecruitmentForm';
import { useCreatePost, useMatchSquareAccess } from '../hooks/useMatchSquare';
import { useOdysseyProfileCard } from '@/hooks/useOdysseyProfileCard';
import { plazaLayout } from '../lib/plaza-visual';
import {
  buildRecruitmentInitialFromTrek,
  parseTrekPlazaSearchParams,
  trekBridgeHeadline,
} from '../lib/trek-plaza-bridge';
import { buildTrekkingOrchestrationPlan } from '../lib/trekking-orchestration';
import { inferDestinationIdsFromVision, resolveDestinationRegions } from '../lib/destination-options';
import { useMatchSquareFilterOptions } from '../hooks/useMatchSquare';
import {
  buildRecruitmentInitialFromRouteTemplate,
  getCatalogEntryById,
  mergeRecruitmentCreateInitial,
  parseRouteTemplatePlazaSearchParams,
  routeTemplateBridgeHeadline,
  trekParamsFromPlazaSearch,
  type RecruitmentCreateInitial,
} from '../lib/route-template-plaza-bridge';

export default function RecruitmentCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const create = useCreatePost();
  const { data: access } = useMatchSquareAccess();
  const { data: filterOptions } = useMatchSquareFilterOptions();
  const { cardView } = useOdysseyProfileCard();

  const trekParams = useMemo(
    () => parseTrekPlazaSearchParams(searchParams),
    [searchParams]
  );

  const templateParams = useMemo(
    () => parseRouteTemplatePlazaSearchParams(searchParams),
    [searchParams]
  );

  const mergedInitial = useMemo((): RecruitmentCreateInitial | undefined => {
    const regions = resolveDestinationRegions(filterOptions?.destinationRegions);
    const mergedTrekParams = trekParamsFromPlazaSearch(trekParams, templateParams);

    let trekInitial: RecruitmentCreateInitial | undefined;
    if (
      mergedTrekParams.routeDirectionId ||
      mergedTrekParams.vibeSeed ||
      mergedTrekParams.activityProfile
    ) {
      const vision = mergedTrekParams.vibeSeed ?? '';
      const destFromVision = vision ? inferDestinationIdsFromVision(vision, regions) : {};
      const base = buildRecruitmentInitialFromTrek(mergedTrekParams, {
        destination: destFromVision.destination,
      });
      trekInitial = {
        ...base,
        destination: base.destination || destFromVision.destination || '',
        trekkingOrchestration:
          buildTrekkingOrchestrationPlan({
            visionText: base.vibeRawText ?? vision,
            activityProfile: base.activityProfile ?? undefined,
            routeDirectionId: base.routeDirectionId ?? null,
            routeDirectionName: base.routeDirectionName ?? null,
          }) ?? undefined,
        teamStatus: {
          slotsFilled: 0,
          slotsNeeded: base.slotsNeeded ?? 2,
          slotsRemaining: base.slotsNeeded ?? 2,
        },
        budgetRange:
          base.budgetMinRmb != null || base.budgetMaxRmb != null
            ? {
                minCents: base.budgetMinRmb != null ? base.budgetMinRmb * 100 : null,
                maxCents: base.budgetMaxRmb != null ? base.budgetMaxRmb * 100 : null,
              }
            : undefined,
      };
    }

    let templateInitial: RecruitmentCreateInitial | undefined;
    const catalogEntry = templateParams.routeTemplateCatalogId
      ? getCatalogEntryById(templateParams.routeTemplateCatalogId)
      : undefined;

    if (catalogEntry) {
      templateInitial = buildRecruitmentInitialFromRouteTemplate({
        catalogEntry,
        routeDirectionId: templateParams.routeDirectionId ?? trekParams.routeDirectionId,
        routeDirectionName:
          templateParams.routeDirectionName ?? trekParams.routeDirectionName,
        routeTemplateId: templateParams.routeTemplateId,
        vibeSeed: templateParams.vibeSeed ?? mergedTrekParams.vibeSeed,
        autoConfirm: templateParams.confirmTemplate,
      });
    }

    return mergeRecruitmentCreateInitial(trekInitial, templateInitial);
  }, [trekParams, templateParams, filterOptions?.destinationRegions]);

  const pageHeadline =
    (mergedInitial && routeTemplateBridgeHeadline(mergedInitial)) ||
    (mergedInitial ? trekBridgeHeadline(mergedInitial) : null);

  const gate = access ?? {
    canBrowse: true,
    canPost: false,
    canApply: false,
    quizComplete: false,
  };

  const profile = cardView?.profile;

  const handleSubmit = async (payload: Parameters<typeof create.mutateAsync>[0]) => {
    try {
      const item = await create.mutateAsync(payload);
      toast.success('招募帖已发布');
      navigate(`/dashboard/tripnara/plaza/${item.id}`);
    } catch {
      toast.error('发布失败，请重试');
    }
  };

  return (
    <div className={plazaLayout.page}>
      <div className={plazaLayout.header}>
        <DashboardSubpageHeader
          backTo="/dashboard/tripnara/plaza"
          title="发起招募"
          subtitle={
            pageHeadline
              ? `${pageHeadline} · Vibe LLM 已预填`
              : 'Vibe LLM · 像聊天一样发布，AI 帮你结构化'
          }
          maxWidth="2xl"
          className={cn('border-0 bg-transparent', plazaLayout.headerText)}
        />
      </div>

      <div className={plazaLayout.content}>
        <div className={plazaLayout.formContent}>
          {!gate.canPost ? (
            <PermissionGateBanner access={gate} action="post" />
          ) : (
            <RecruitmentForm
              initial={mergedInitial}
              autoFill={{
                personaTitle: profile?.card?.title,
                reputationScore: 4.9,
                mbtiType: profile?.mbtiType,
              }}
              onSubmit={handleSubmit}
              isSubmitting={create.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}
