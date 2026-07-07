/**
 * 旅行条件 — fetchScenarioDetail + lockedFields 控制表单项 disabled
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ExploreFlowLayout, ExploreFooterNav } from '@/features/exploration/components/ExploreFlowLayout';
import { ExploreConditionsForm } from '@/features/exploration/components/ExploreConditionsForm';
import { CandidatesStaleBanner } from '@/features/exploration/components/CandidatesStaleBanner';
import {
  fetchConditionsCatalog,
  fetchScenarioDetail,
  isExplorationUnavailable,
  isRouteAlreadySelected,
  patchScenarioConditions,
} from '@/features/exploration/api/client';
import {
  canPatchConditionsAfterMaterialize,
  getConditionsChangedBannerText,
} from '@/features/exploration/api/helpers';
import { useExplorationTravelContext } from '@/features/exploration/context/ExplorationTravelContext';
import {
  loadExplorationScenarioDetail,
  patchExplorationConditionsViaIntent,
} from '@/features/exploration/travel-context/exploration-travel-context';
import type {
  ConditionsCatalogInsuranceTier,
  ConditionsCatalogVehicleType,
  ExplorationScenarioDetail,
} from '@/features/exploration/api/types';
import {
  DEFAULT_CONDITIONS_FORM,
  destinationLabelFromCode,
  formToPatchScenarioConditions,
  hasConditionsFormErrors,
  persistConditionsForm,
  scenarioDetailToForm,
  validateConditionsForm,
  INSURANCE_TIER_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
} from '@/features/exploration/conditions-form.util';
import type { ConditionsFormFieldErrors } from '@/features/exploration/conditions-form.util';
import { exploreBasePath } from '@/features/exploration/constants';
import { exploreUi, semanticInfoText } from '@/features/exploration/explore-ui';
import { cn } from '@/lib/utils';

export default function ExploreConditionsPage() {
  const { scenarioId = '' } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const base = exploreBasePath(scenarioId);
  const travelContext = useExplorationTravelContext();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<ExplorationScenarioDetail | null>(null);
  const [form, setForm] = useState(DEFAULT_CONDITIONS_FORM);
  const [staleBanner, setStaleBanner] = useState<string | null>(null);
  const [vehicleOptions, setVehicleOptions] =
    useState<ConditionsCatalogVehicleType[]>(VEHICLE_TYPE_OPTIONS);
  const [insuranceOptions, setInsuranceOptions] = useState<ConditionsCatalogInsuranceTier[]>(
    INSURANCE_TIER_OPTIONS,
  );
  const [fieldErrors, setFieldErrors] = useState<ConditionsFormFieldErrors>({});

  const handleFormChange = (next: typeof form) => {
    setForm(next);
    persistConditionsForm(next);
    setFieldErrors({});
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const provider = travelContext.getProvider();
        if (travelContext.enabled && provider) {
          const [scenarioDetail, catalog] = await Promise.all([
            loadExplorationScenarioDetail(provider),
            fetchConditionsCatalog('IS'),
          ]);
          if (cancelled) return;
          setDetail(scenarioDetail);
          setForm(scenarioDetailToForm(scenarioDetail));
          if (catalog.vehicleTypes?.length) {
            setVehicleOptions(catalog.vehicleTypes);
          }
          if (catalog.insuranceTiers?.length) {
            setInsuranceOptions(catalog.insuranceTiers);
          }
        } else {
          const [scenarioDetail, catalog] = await Promise.all([
            fetchScenarioDetail(scenarioId),
            fetchConditionsCatalog('IS'),
          ]);
          if (cancelled) return;
          setDetail(scenarioDetail);
          setForm(scenarioDetailToForm(scenarioDetail));
          if (catalog.vehicleTypes?.length) {
            setVehicleOptions(catalog.vehicleTypes);
          }
          if (catalog.insuranceTiers?.length) {
            setInsuranceOptions(catalog.insuranceTiers);
          }
        }
      } catch (err) {
        if (cancelled) return;
        if (isExplorationUnavailable(err)) {
          toast.message('后端未就绪，展示本地默认条件');
          setDetail({
            scenarioId,
            sessionId: '',
            lockedFields: [],
            scenario: {
              destinationCodes: [DEFAULT_CONDITIONS_FORM.destinationCode],
              dateRange: {
                startDate: DEFAULT_CONDITIONS_FORM.startDate,
                endDate: DEFAULT_CONDITIONS_FORM.endDate,
              },
              travelers: Array.from({ length: DEFAULT_CONDITIONS_FORM.adultCount }, () => ({
                type: 'ADULT' as const,
              })),
              budget: {
                currency: DEFAULT_CONDITIONS_FORM.currency,
                min: DEFAULT_CONDITIONS_FORM.budgetMin,
                max: DEFAULT_CONDITIONS_FORM.budgetMax,
              },
              mobilityContext: { vehicleType: DEFAULT_CONDITIONS_FORM.vehicleType },
              insuranceContext: { coverageTier: DEFAULT_CONDITIONS_FORM.insuranceCoverageTier },
              rentalContext: {
                pickupLocation: DEFAULT_CONDITIONS_FORM.rentalPickupLocation,
                pickupTimeLocal: DEFAULT_CONDITIONS_FORM.rentalPickupTimeLocal,
                afterHoursPickupConfirmed: DEFAULT_CONDITIONS_FORM.afterHoursPickupConfirmed,
              },
            },
          });
          setForm(DEFAULT_CONDITIONS_FORM);
        } else {
          toast.error(err instanceof Error ? err.message : '加载条件失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [scenarioId, travelContext.enabled, travelContext.getProvider]);

  useEffect(() => {
    if (travelContext.enabled) return;
    let cancelled = false;
    void fetchConditionsCatalog('IS')
      .then((catalog) => {
        if (!cancelled && catalog.vehicleTypes?.length) {
          setVehicleOptions(catalog.vehicleTypes);
        }
        if (!cancelled && catalog.insuranceTiers?.length) {
          setInsuranceOptions(catalog.insuranceTiers);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [travelContext.enabled]);

  const lockedFields = detail?.lockedFields ?? [];
  const isResearchMode = Boolean(detail?.researchProtocolId) || lockedFields.length > 0;
  const destLabel = destinationLabelFromCode(form.destinationCode);

  const handleContinue = async () => {
    const errors = validateConditionsForm(form, lockedFields);
    if (hasConditionsFormErrors(errors)) {
      setFieldErrors(errors);
      toast.error('请先修正旅行条件中的问题');
      return;
    }

    if (
      detail &&
      canPatchConditionsAfterMaterialize(detail.materializationStatus, detail.candidatesStatus)
    ) {
      setSubmitting(true);
      try {
        const provider = travelContext.getProvider();
        if (travelContext.enabled && provider) {
          const res = await patchExplorationConditionsViaIntent(
            provider,
            formToPatchScenarioConditions(form),
          );
          setDetail(res);
          if (res.candidatesStatus?.status === 'STALE') {
            setStaleBanner(getConditionsChangedBannerText(true));
          }
        } else {
          const res = await patchScenarioConditions(scenarioId, formToPatchScenarioConditions(form));
          if (res.candidatesStatus) {
            setDetail((prev) => (prev ? { ...prev, candidatesStatus: res.candidatesStatus } : prev));
          }
          if (res.candidatesStatus?.status === 'STALE') {
            setStaleBanner(getConditionsChangedBannerText(res.tripSynced));
          }
        }
      } catch (err) {
        if (isRouteAlreadySelected(err)) {
          toast.error('已选定路线，无法修改条件');
          return;
        }
        if (!isExplorationUnavailable(err)) {
          toast.error(err instanceof Error ? err.message : '同步条件失败');
          return;
        }
      } finally {
        setSubmitting(false);
      }
    }
    navigate(`${base}/principles`);
  };

  return (
    <ExploreFlowLayout
      scenarioId={scenarioId}
      currentStep="conditions"
      title={`先确定这趟${destLabel}旅行的基本条件`}
      subtitle={
        isResearchMode
          ? '当前为冰岛研究体验：部分条件由协议锁定，不可修改。'
          : '确认目的地、时间与出行约束，再进入原则选择。'
      }
      onBack={() => navigate('/dashboard/trips/new')}
      footer={
        <ExploreFooterNav
          onBack={() => navigate('/dashboard/trips/new')}
          backLabel="返回"
          onPrimary={() => void handleContinue()}
          primaryLabel={submitting ? '同步中…' : '确认并继续'}
          primaryDisabled={loading || submitting}
        />
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          正在加载条件…
        </div>
      ) : (
        <>
          {staleBanner ? (
            <CandidatesStaleBanner message={staleBanner} showRegenerate={false} />
          ) : null}

          {isResearchMode && (
            <div className={cn(exploreUi.tipBox, 'flex gap-3 items-start mb-6')}>
              <Lock className={cn('w-4 h-4 flex-shrink-0 mt-0.5', semanticInfoText)} />
              <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                <p className="font-medium text-foreground">带锁字段为协议固定条件</p>
                <p>
                  由后端返回的 <code className="text-[10px]">lockedFields</code>{' '}
                  控制表单项是否可编辑。请点击下方「确认并继续」进入原则选择。
                </p>
              </div>
            </div>
          )}

          <ExploreConditionsForm
            value={form}
            onChange={handleFormChange}
            lockedFields={lockedFields}
            vehicleOptions={vehicleOptions}
            insuranceOptions={insuranceOptions}
            errors={fieldErrors}
          />
        </>
      )}
    </ExploreFlowLayout>
  );
}
