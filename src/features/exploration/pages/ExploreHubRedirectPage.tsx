/**
 * Hub ① — 用户先填写旅行条件，确认后再创建探索会话
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ExploreConditionsForm } from '@/features/exploration/components/ExploreConditionsForm';
import {
  ExploreFlowLayout,
  ExploreFooterNav,
} from '@/features/exploration/components/ExploreFlowLayout';
import {
  fetchConditionsCatalog,
  ICELAND_RESEARCH_PROTOCOL_ID,
  isExplorationUnavailable,
  startExplorationFromHub,
  trackExplorationEvent,
} from '@/features/exploration/api/client';
import type {
  ConditionsCatalogInsuranceTier,
  ConditionsCatalogVehicleType,
} from '@/features/exploration/api/types';
import {
  DEFAULT_CONDITIONS_FORM,
  destinationLabelFromCode,
  formToCreateScenarioRequest,
  hasConditionsFormErrors,
  persistConditionsForm,
  readStoredConditionsForm,
  validateConditionsForm,
  INSURANCE_TIER_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
} from '@/features/exploration/conditions-form.util';
import { explorationFlags } from '@/features/exploration/flags';
import { persistFlowState, explorePath } from '@/features/exploration/flow-state';

export default function ExploreHubRedirectPage() {
  const navigate = useNavigate();
  const isUserConfig = explorationFlags.userConfigurableConditions;
  const isResearchMode = explorationFlags.researchMode;

  const [form, setForm] = useState(readStoredConditionsForm);
  const [fieldErrors, setFieldErrors] = useState<ReturnType<typeof validateConditionsForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const [vehicleOptions, setVehicleOptions] =
    useState<ConditionsCatalogVehicleType[]>(VEHICLE_TYPE_OPTIONS);
  const [insuranceOptions, setInsuranceOptions] = useState<ConditionsCatalogInsuranceTier[]>(
    INSURANCE_TIER_OPTIONS,
  );

  useEffect(() => {
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
      .catch(() => {
        /* 使用本地默认车辆选项 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFormChange = useCallback((next: typeof form) => {
    setForm(next);
    persistConditionsForm(next);
    setFieldErrors({});
  }, []);

  const handleStart = async () => {
    const lockedFields = isResearchMode
      ? ['destinationCodes', 'dateRange', 'travelers', 'budget', 'mobilityContext']
      : [];
    const errors = validateConditionsForm(form, lockedFields);
    if (hasConditionsFormErrors(errors)) {
      setFieldErrors(errors);
      toast.error('请先修正旅行条件中的问题');
      return;
    }

    setSubmitting(true);
    try {
      persistConditionsForm(form);
      const data = isUserConfig
        ? await startExplorationFromHub(formToCreateScenarioRequest(form))
        : await startExplorationFromHub({ researchProtocolId: ICELAND_RESEARCH_PROTOCOL_ID });

      persistFlowState({
        scenarioId: data.scenarioId,
        sessionId: data.sessionId,
        tripId: data.tripId,
        assignedVariant: data.assignedVariant,
        researchProtocolId: isUserConfig ? undefined : ICELAND_RESEARCH_PROTOCOL_ID,
        materializationStatus: data.materializationStatus,
      });

      void trackExplorationEvent(data.sessionId, 'exploration_session_started', {
        scenarioId: data.scenarioId,
        protocolId: isUserConfig ? undefined : ICELAND_RESEARCH_PROTOCOL_ID,
        entryVariant: data.assignedVariant,
        tripId: data.tripId,
        currentStep: 'hub_start',
      });

      const nextStep = isResearchMode ? 'conditions' : 'principles';
      navigate(explorePath(data.scenarioId, nextStep), { replace: true });
    } catch (err) {
      if (isExplorationUnavailable(err)) {
        const scenarioId = crypto.randomUUID();
        const sessionId = crypto.randomUUID();
        persistFlowState({
          scenarioId,
          sessionId,
          assignedVariant: 'THREE_ROUTE_COMPARISON',
        });
        toast.message('后端未就绪，使用演示模式继续');
        navigate(explorePath(scenarioId, isResearchMode ? 'conditions' : 'principles'), {
          replace: true,
        });
        return;
      }
      toast.error(err instanceof Error ? err.message : '创建探索会话失败');
    } finally {
      setSubmitting(false);
    }
  };

  const destLabel = destinationLabelFromCode(form.destinationCode);

  return (
    <ExploreFlowLayout
      scenarioId=""
      currentStep="conditions"
      title={
        isResearchMode
          ? `冰岛研究体验 · 固定旅行条件`
          : `你想去哪？先告诉我们要去 ${destLabel}`
      }
      subtitle={
        isResearchMode
          ? '以下为协议锁定的研究样本条件。确认后将进入原则选择。'
          : '填写目的地、日期、人数、预算与车辆，我们将据此比较路线策略。'
      }
      onBack={() => navigate('/dashboard/trips/new')}
      footer={
        <ExploreFooterNav
          onBack={() => navigate('/dashboard/trips/new')}
          backLabel="返回"
          onPrimary={() => void handleStart()}
          primaryLabel={submitting ? '创建中…' : '开始探索'}
          primaryDisabled={submitting}
        />
      }
    >
      <ExploreConditionsForm
        value={form}
        onChange={handleFormChange}
        lockedFields={
          isResearchMode
            ? ['destinationCodes', 'dateRange', 'travelers', 'budget', 'mobilityContext']
            : []
        }
        vehicleOptions={vehicleOptions}
        insuranceOptions={insuranceOptions}
        errors={fieldErrors}
        disabled={submitting}
      />

      {submitting ? (
        <p className="mt-4 text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          正在创建探索会话…
        </p>
      ) : null}
    </ExploreFlowLayout>
  );
}
