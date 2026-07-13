/**
 * 顾问（旅行社）代客创建行程
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildCollabCenterPlanStudioUrl } from '@/lib/collab-center-navigation';
import { ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TripCreationFlowShell } from '@/components/guide-import/TripCreationFlowShell';
import { GuideImportPageShell } from '@/components/guide-import/guide-import-ui';
import { flowStepIndex, type FlowStepItem } from '@/components/guide-import/FlowStepper';
import {
  AdvisorTripCreateBasicStep,
  AdvisorTripCreateBudgetStep,
  AdvisorTripCreateReviewStep,
  AdvisorTripCreateRolesStep,
} from '@/components/advisor-trip-create/AdvisorTripCreateFormSteps';
import { AdvisorTripInviteCodesPanel } from '@/components/advisor-trip-create/AdvisorTripInviteCodesPanel';
import { TripResponsibilityOwnersPanel } from '@/features/member-onboarding';
import { useAccountCapabilities } from '@/hooks/useAccountCapabilities';
import {
  useAdvisorStaffOptions,
  useAdvisorTripCreateContext,
  useCreateAdvisorTrip,
  useResolvedOrganizationId,
} from '@/hooks/useAdvisorTripCreate';
import {
  buildCreateAdvisorTripRequest,
  canAccessAdvisorTripCreate,
  createDefaultAdvisorTripForm,
  validateAdvisorTripStep,
  type AdvisorTripCreateStepId,
} from '@/lib/advisor-trip-create.util';
import {
  persistResponsibilityOwnersAfterAdvisorCreate,
} from '@/lib/trip-responsibility.util';
import type { CreateAdvisorTripResponse } from '@/types/advisor-trip-create';
import type { TripResponsibilityOwners } from '@/types/trip-responsibility';
import { Link } from 'react-router-dom';

const STEPS: readonly FlowStepItem[] = [
  { id: 'basic', label: '基本信息' },
  { id: 'roles', label: '角色指定' },
  { id: 'budget', label: '预算与要求' },
  { id: 'invite', label: '邀请码' },
] as const;

export default function AdvisorCreateTripPage() {
  const navigate = useNavigate();
  const { data: capabilities } = useAccountCapabilities();
  const { data: createContext } = useAdvisorTripCreateContext();
  const organizationId = useResolvedOrganizationId(capabilities);
  const { advisors, leaders } = useAdvisorStaffOptions(organizationId);
  const createTrip = useCreateAdvisorTrip();

  const canAccess = canAccessAdvisorTripCreate(capabilities);

  const [currentStepId, setCurrentStepId] = useState<AdvisorTripCreateStepId>('basic');
  const [form, setForm] = useState(() => createDefaultAdvisorTripForm());
  const [result, setResult] = useState<
    (CreateAdvisorTripResponse & { responsibilityOwners?: TripResponsibilityOwners }) | null
  >(null);

  useEffect(() => {
    if (!createContext) return;
    setForm((prev) => ({
      ...prev,
      organizationId: organizationId ?? prev.organizationId,
      advisor: prev.advisor.name
        ? prev.advisor
        : {
            userId: createContext.userId,
            name: createContext.displayName,
          },
    }));
  }, [createContext, organizationId]);

  const stepIndex = flowStepIndex(STEPS, currentStepId);
  const isInviteStep = currentStepId === 'invite';

  const footerPrimaryLabel = useMemo(() => {
    if (isInviteStep) return null;
    if (stepIndex === STEPS.length - 2) return '创建行程并生成邀请码';
    return '下一步';
  }, [isInviteStep, stepIndex]);

  const handleBack = () => {
    if (result) {
      navigate('/dashboard/trips/new');
      return;
    }
    if (stepIndex === 0) {
      navigate('/dashboard/trips/new');
      return;
    }
    setCurrentStepId(STEPS[stepIndex - 1].id as AdvisorTripCreateStepId);
  };

  const handleNext = async () => {
    if (isInviteStep) return;

    const validationStep = currentStepId === 'budget' ? 'budget' : currentStepId;
    const error = validateAdvisorTripStep(validationStep, form);
    if (error) {
      toast.error(error);
      return;
    }

    if (currentStepId === 'budget') {
      try {
        const body = buildCreateAdvisorTripRequest(form);
        const response = await createTrip.mutateAsync({ body, formSnapshot: form });
        const owners = await persistResponsibilityOwnersAfterAdvisorCreate(
          response.tripId,
          form,
          response.responsibilityOwners,
        );
        setResult({ ...response, responsibilityOwners: owners });
        setCurrentStepId('invite');
        toast.success('行程已创建，成员邀请码已生成');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '创建失败，请稍后重试');
      }
      return;
    }

    setCurrentStepId(STEPS[stepIndex + 1].id as AdvisorTripCreateStepId);
  };

  if (!canAccess) {
    return (
      <GuideImportPageShell className="min-h-full">
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
          <h1 className="text-2xl font-semibold">顾问代客创建</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            此入口面向旅行社顾问与机构成员。请先完成
            <Link to="/dashboard/account/agency" className="mx-1 underline">
              机构认证
            </Link>
            或
            <Link to="/dashboard/account/professional" className="mx-1 underline">
              专业认证
            </Link>
            ，或由机构管理员将你加入组织并授予顾问角色。
          </p>
          <Button type="button" variant="outline" onClick={() => navigate('/dashboard/trips/new')}>
            返回创建入口
          </Button>
        </div>
      </GuideImportPageShell>
    );
  }

  return (
    <GuideImportPageShell className="min-h-full">
      <TripCreationFlowShell
        steps={STEPS}
        currentStepId={currentStepId}
        navAriaLabel="顾问创建行程步骤"
        title={isInviteStep ? '成员邀请码' : '顾问代客创建行程'}
        subtitle={
          isInviteStep
            ? '按角色将邀请码或链接发送给干系人；接受后需完成成员偏好采集。'
            : '为旅行社客户创建 PLANNING 行程，指定关键角色并生成干系人邀请码。'
        }
        onBack={handleBack}
        footer={
          isInviteStep ? null : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                第 {stepIndex + 1} / {STEPS.length - 1} 步
              </p>
              <Button
                type="button"
                onClick={() => void handleNext()}
                disabled={createTrip.isPending}
              >
                {createTrip.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    创建中…
                  </>
                ) : (
                  <>
                    {footerPrimaryLabel}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )
        }
      >
        {currentStepId === 'basic' ? (
          <AdvisorTripCreateBasicStep form={form} onChange={setForm} />
        ) : null}

        {currentStepId === 'roles' ? (
          <AdvisorTripCreateRolesStep
            form={form}
            onChange={setForm}
            advisorOptions={advisors}
            leaderOptions={leaders.length > 0 ? leaders : advisors}
          />
        ) : null}

        {currentStepId === 'budget' ? (
          <AdvisorTripCreateBudgetStep form={form} onChange={setForm} />
        ) : null}

        {currentStepId === 'budget' ? (
          <div className="mt-4">
            <AdvisorTripCreateReviewStep form={form} />
          </div>
        ) : null}

        {isInviteStep && result ? (
          <div className="space-y-6">
            <AdvisorTripInviteCodesPanel
              inviteCodes={result.memberInviteCodes}
              tripId={result.tripId}
              onContinue={() =>
                navigate(
                  `${buildCollabCenterPlanStudioUrl(result.tripId, { collabTab: 'invites' })}&source=advisor-create`,
                )
              }
            />
            {result.responsibilityOwners ? (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="mb-3 text-sm font-semibold">责任分配</h3>
                <TripResponsibilityOwnersPanel
                  owners={result.responsibilityOwners}
                  compact
                />
                <Button
                  type="button"
                  variant="link"
                  className="mt-2 h-auto p-0 text-xs"
                  onClick={() =>
                    navigate(`/dashboard/trips/${result.tripId}/responsibility`)
                  }
                >
                  查看完整责任分配
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </TripCreationFlowShell>
    </GuideImportPageShell>
  );
}
