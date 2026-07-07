import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import type { AutomationAuthorizationScope, AutomationPermissionTier } from '@/api/automation-authorization.types';
import { Button } from '@/components/ui/button';
import AutomationCategoryPanel from '@/components/trip-automation/AutomationCategoryPanel';
import AutomationAuthorizationPageSkeleton from '@/components/trip-automation/AutomationAuthorizationPageSkeleton';
import AutomationHowItWorksDialog from '@/components/trip-automation/AutomationHowItWorksDialog';
import AutomationLevelSelector from '@/components/trip-automation/AutomationLevelSelector';
import AutomationSidebar from '@/components/trip-automation/AutomationSidebar';
import { tripAutomationHeaderCard, tripAutomationPageShell } from '@/components/trip-automation/trip-automation-ui';
import {
  loadTripForAutomationHeader,
  useAutomationAuthorization,
} from '@/hooks/useAutomationAuthorization';
import { buildTripTravelStatusPath, buildTripAiActivityLogPath } from '@/lib/travel-status-navigation.util';
import {
  apiLevelToUiLevel,
  buildCatalogForUiLevel,
  mapRecentLogs,
  resolveAutomationBoundaries,
  resolveAutomationTabCounts,
  resolveAutomationUiLevel,
  uiLevelToApiLevel,
  type AutomationFilterTab,
  type AutomationUiLevel,
} from '@/lib/trip-automation-authorization.util';
import {
  resolveAutomationConfirmMembers,
  resolveTeamGovernanceRules,
} from '@/lib/trip-automation-context.util';
import type { TripDetail } from '@/types/trip';

export default function TripAutomationAuthorizationPage() {
  const { id: tripId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const auth = useAutomationAuthorization({ tripId, enabled: Boolean(tripId) });

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [tripLoading, setTripLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<AutomationUiLevel>('L2');
  const [savedLevel, setSavedLevel] = useState<AutomationUiLevel>('L2');
  const [scope, setScope] = useState<AutomationAuthorizationScope>('TRIP');
  const [savedScope, setSavedScope] = useState<AutomationAuthorizationScope>('TRIP');
  const [actionOverrides, setActionOverrides] = useState<Record<string, AutomationPermissionTier>>({});
  const [savedOverrides, setSavedOverrides] = useState<Record<string, AutomationPermissionTier>>({});
  const [activeTab, setActiveTab] = useState<AutomationFilterTab>('auto');
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const view = auth.view;
  const contract = view?.contract ?? null;
  const catalog = view?.travelStatus?.automation?.catalog;
  const mergedCatalog = useMemo(
    () => buildCatalogForUiLevel(catalog, selectedLevel, actionOverrides),
    [catalog, selectedLevel, actionOverrides],
  );
  const groups = mergedCatalog?.groups ?? [];
  const catalogDegraded = !auth.isReady;

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    (async () => {
      try {
        setTripLoading(true);
        const data = await loadTripForAutomationHeader(tripId);
        if (!cancelled) setTrip(data);
      } catch (err) {
        if (!cancelled) toast.error((err as Error)?.message ?? '加载行程失败');
      } finally {
        if (!cancelled) setTripLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  useEffect(() => {
    if (!view) return;
    setScope(view.scope ?? 'TRIP');
    setSavedScope(view.scope ?? 'TRIP');
  }, [view?.scope, view?.tripId]);

  useEffect(() => {
    if (!view) return;
    if (scope === 'USER_TEMPLATE') return;

    const uiLevel = resolveAutomationUiLevel(view.travelStatus.automation);
    setSelectedLevel(uiLevel);
    setSavedLevel(uiLevel);
    setSavedScope('TRIP');

    const overrides = (view.contract?.automation?.actionOverrides ?? {}) as Record<
      string,
      AutomationPermissionTier
    >;
    setActionOverrides(overrides);
    setSavedOverrides(overrides);
  }, [view, scope]);

  useEffect(() => {
    if (scope !== 'USER_TEMPLATE') return;
    const template = auth.userTemplate;
    if (!template?.automation) return;

    const uiLevel = template.automation.defaultLevel
      ? apiLevelToUiLevel(template.automation.defaultLevel)
      : resolveAutomationUiLevel(view?.travelStatus?.automation);
    const overrides = (template.automation.actionOverrides ?? {}) as Record<
      string,
      AutomationPermissionTier
    >;

    setSelectedLevel(uiLevel);
    setSavedLevel(uiLevel);
    setSavedScope('USER_TEMPLATE');
    setActionOverrides(overrides);
    setSavedOverrides(overrides);
  }, [scope, auth.userTemplate]);

  const tabCounts = useMemo(() => {
    if (auth.isReady) return resolveAutomationTabCounts(mergedCatalog);
    return resolveAutomationTabCounts(null, view?.travelStatus?.automation?.tierCounts);
  }, [auth.isReady, mergedCatalog, view?.travelStatus?.automation?.tierCounts]);

  const boundaries = useMemo(
    () => resolveAutomationBoundaries(contract),
    [contract],
  );

  const recentLogs = useMemo(
    () => mapRecentLogs(view?.travelStatus?.aiCompletedWork?.items ?? []),
    [view?.travelStatus?.aiCompletedWork?.items],
  );

  const confirmMembers = useMemo(
    () => resolveAutomationConfirmMembers(auth.contextSnapshot, contract),
    [auth.contextSnapshot, contract],
  );

  const governanceRules = useMemo(
    () => resolveTeamGovernanceRules(contract, auth.contextSnapshot),
    [contract, auth.contextSnapshot],
  );

  const tripScopeLabel = trip?.name || trip?.destination || '本行程';
  const dirty =
    selectedLevel !== savedLevel ||
    scope !== savedScope ||
    JSON.stringify(actionOverrides) !== JSON.stringify(savedOverrides);

  const handleManageTemplate = useCallback(() => {
    setScope('USER_TEMPLATE');
    void auth.refreshUserTemplate();
  }, [auth]);

  const handleActionTierChange = useCallback((actionKey: string, tier: AutomationPermissionTier) => {
    setActionOverrides((prev) => ({ ...prev, [actionKey]: tier }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!tripId || !view) return;
    if (selectedLevel === 'L4') {
      toast.message('L4 高自治尚在实验阶段', {
        description: '当前版本暂不支持启用，请选择 L0–L3。',
      });
      return;
    }
    try {
      await auth.save({
        scope,
        constraintsVersion: view.constraintsVersion,
        automationPaused: view.automationPaused,
        automation: {
          defaultLevel: uiLevelToApiLevel(selectedLevel),
          actionOverrides,
        },
      });
      setSavedLevel(selectedLevel);
      setSavedScope(scope);
      setSavedOverrides(actionOverrides);
      toast.success(
        scope === 'USER_TEMPLATE' ? '默认自动化规则已保存' : '自动化规则已保存',
      );
    } catch (err) {
      toast.error((err as Error)?.message ?? '保存失败');
    }
  }, [tripId, view, selectedLevel, scope, actionOverrides, auth]);

  const handleRestoreDefaults = useCallback(async () => {
    if (!tripId) return;
    try {
      if (scope === 'USER_TEMPLATE') {
        await auth.resetUserTemplateDefaults();
      } else {
        await auth.resetDefaults();
      }
      toast.success('已恢复默认自动化规则');
    } catch (err) {
      toast.error((err as Error)?.message ?? '恢复默认失败');
    }
  }, [auth, tripId, scope]);

  const handleTemporaryBoost = useCallback(() => {
    if (selectedLevel === 'L3' || selectedLevel === 'L4') {
      toast.message('当前已是较高自治级别');
      return;
    }
    setSelectedLevel('L3');
    toast.message('已临时设为 L3 边界内自动执行', {
      description: '请点击「保存并应用规则」使变更生效。',
    });
  }, [selectedLevel]);

  const handlePauseToggle = useCallback(async () => {
    if (!view) return;
    try {
      await auth.pause(!view.automationPaused);
      toast.success(view.automationPaused ? '已恢复自动执行' : '已暂停自动执行');
    } catch (err) {
      toast.error((err as Error)?.message ?? '操作失败');
    }
  }, [auth, view]);

  const handleUndo = useCallback(
    async (logId: string) => {
      try {
        await auth.undoWork(logId);
        toast.success('已撤销最近一次自动修改');
      } catch (err) {
        toast.error((err as Error)?.message ?? '撤销失败');
      }
    },
    [auth],
  );

  if (!tripId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        缺少行程 ID
      </div>
    );
  }

  if (tripLoading || auth.isPageLoading) {
    return <AutomationAuthorizationPageSkeleton />;
  }

  return (
    <div className={tripAutomationPageShell}>
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 text-muted-foreground"
          onClick={() => navigate(buildTripTravelStatusPath(tripId))}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          返回概览
        </Button>
      </div>

      <header className={tripAutomationHeaderCard}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                AI 自动执行授权中心
              </h1>
              <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              设定 AI 在行程规划与行中监控时可自动执行的操作范围。系统会在边界内处理任务，超出边界的事项会进入决策队列等待你确认。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setHowItWorksOpen(true)}
            >
              <HelpCircle className="mr-1.5 h-3.5 w-3.5" />
              如何工作？
            </Button>
            <Button
              variant={scope === 'USER_TEMPLATE' ? 'secondary' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => void handleManageTemplate()}
            >
              管理规则模板
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={auth.isResetting || auth.isResettingUserTemplate}
              onClick={() => void handleRestoreDefaults()}
            >
              {auth.isResetting || auth.isResettingUserTemplate ? '恢复中…' : '恢复默认设置'}
            </Button>
            <Button
              size="sm"
              className="h-8 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={auth.isSaving || !dirty}
              onClick={() => void handleSave()}
            >
              {auth.isSaving ? '保存中…' : '保存并应用规则'}
            </Button>
          </div>
        </div>
      </header>

      {auth.isDegraded ? (
        <div className="mt-4 rounded-xl border border-gate-confirm-border/45 bg-gate-confirm/8 px-3 py-2.5 text-xs text-gate-confirm-foreground">
          聚合授权接口暂不可用，当前使用约束合约与 travel-status 降级数据；权限目录可能为空。
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>
          规则应用范围：
          <span className="ml-1 font-medium text-foreground">
            {scope === 'USER_TEMPLATE' ? '全部我的行程' : `本行程 · ${tripScopeLabel}`}
          </span>
        </span>
        <div className="inline-flex rounded-lg border border-border/60 p-0.5">
          <button
            type="button"
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
              scope === 'TRIP' ? 'bg-muted/30 text-foreground' : 'text-muted-foreground'
            }`}
            onClick={() => setScope('TRIP')}
          >
            本行程
          </button>
          <button
            type="button"
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
              scope === 'USER_TEMPLATE' ? 'bg-muted/30 text-foreground' : 'text-muted-foreground'
            }`}
            onClick={() => setScope('USER_TEMPLATE')}
          >
            全部我的行程
          </button>
        </div>
        {scope === 'USER_TEMPLATE' ? (
          <Button
            variant="link"
            size="sm"
            className="h-auto px-0 text-[11px] text-muted-foreground"
            onClick={() => void auth.refreshUserTemplate()}
          >
            刷新用户默认模板
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-start">
        <div className="space-y-4">
          <AutomationLevelSelector value={selectedLevel} onChange={setSelectedLevel} />
          <AutomationCategoryPanel
            groups={groups}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabCounts={tabCounts}
            uiLevel={selectedLevel}
            levelPreview={selectedLevel !== savedLevel}
            onActionTierChange={handleActionTierChange}
            catalogDegraded={catalogDegraded}
            isCatalogRefreshing={auth.isFetching}
            onRefreshCatalog={() => void auth.refresh()}
          />
        </div>

        <AutomationSidebar
          boundaries={boundaries}
          recentLogs={recentLogs}
          confirmMembers={confirmMembers}
          governanceRules={governanceRules}
          isContextSnapshotRefreshing={auth.isContextSnapshotFetching}
          onRefreshContextSnapshot={() => void auth.refreshContextSnapshot()}
          paused={view?.automationPaused ?? view?.travelStatus.automation.paused}
          isPausing={auth.isPausing}
          undoingLogId={auth.isUndoing ? auth.undoingLogId : null}
          onEditBoundaries={() =>
            navigate(
              `/dashboard/plan-studio?tripId=${encodeURIComponent(tripId)}&tab=schedule&view=constraints&constraintId=change_strategy`,
            )
          }
          onPause={() => void handlePauseToggle()}
          onResume={() => void handlePauseToggle()}
          onUndo={(logId) => void handleUndo(logId)}
          onTemporaryBoost={handleTemporaryBoost}
          onViewDecisionHistory={() => navigate(buildTripAiActivityLogPath(tripId))}
        />
      </div>

      <AutomationHowItWorksDialog open={howItWorksOpen} onOpenChange={setHowItWorksOpen} />
    </div>
  );
}
