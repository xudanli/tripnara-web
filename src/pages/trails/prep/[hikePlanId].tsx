import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Car,
  Download,
  MapPin,
  Phone,
  ExternalLink,
  Play,
  Compass,
  ListChecks,
  RefreshCw,
  CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PrepChecklist, PrepPermit, PrepTransport } from '@/types/trail';
import { useTrailOfflineDownload } from '@/hooks/useTrailOfflineDownload';
import { formatPackSize } from '@/services/ensure-hiking-offline-pack';
import {
  hikePlanRepository,
  resolveOrCreateHikePlanId,
} from '@/services/hike-plan-repository';
import type { HikePlanRecord } from '@/types/hike-plan';
import { Spinner } from '@/components/ui/spinner';
import { HikingFitnessCard } from '@/components/hiking/HikingFitnessCard';
import { HikePlanStorageSwitch } from '@/components/hiking/HikePlanStorageSwitch';
import { handleHikePlanError } from '@/lib/hike-plan-error';
import { getEmbeddedHikingErrorMessage } from '@/lib/embedded-hiking-api-errors';
import { useAuth } from '@/hooks/useAuth';
import { useHikePlanStorage } from '@/hooks/useHikePlanStorage';
import { normalizeHikePlanPrep } from '@/lib/normalize-hike-plan-prep';
import { prepCategoryLabel, prepItemLabel } from '@/lib/prep-display';
import {
  clientPermitsComplete,
  permitsLookLikePlaceholders,
  prepPermitDisplayLabel,
} from '@/lib/prep-permits-ui';

function toDateInputValue(raw?: string): string {
  if (!raw?.trim()) return '';
  return raw.split('T')[0];
}

function toTimeInputValue(raw?: string): string {
  if (!raw?.trim()) return '08:00';
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '08:00';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export default function PrepCenterPage() {
  const { hikePlanId: paramId } = useParams<{ hikePlanId: string }>();
  const navigate = useNavigate();

  const [resolvedPlanId, setResolvedPlanId] = useState<string | null>(null);
  const [plan, setPlan] = useState<HikePlanRecord | null>(null);
  const [prepLoading, setPrepLoading] = useState(true);
  const [checklist, setChecklist] = useState<PrepChecklist[]>([]);
  const [permits, setPermits] = useState<PrepPermit[]>([]);
  const [transport, setTransport] = useState<PrepTransport | null>(null);
  const [starting, setStarting] = useState(false);
  const [refreshingTemplate, setRefreshingTemplate] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [plannedDate, setPlannedDate] = useState('');
  const [plannedStartTime, setPlannedStartTime] = useState('08:00');
  const [reloadKey, setReloadKey] = useState(0);
  const { isAuthenticated } = useAuth();
  const { isApiMode } = useHikePlanStorage();
  const [prepComplete, setPrepComplete] = useState({
    checklistComplete: false,
    permitsComplete: false,
    offlineReady: false,
  });

  const routeDirectionId = plan?.routeDirectionId;

  const scheduleEditable =
    plan != null && (plan.status === 'planning' || plan.status === 'ready');

  useEffect(() => {
    if (!plan) return;
    setPlannedDate(toDateInputValue(plan.plannedDate));
    setPlannedStartTime(toTimeInputValue(plan.plannedStartTime));
  }, [plan?.id, plan?.plannedDate, plan?.plannedStartTime]);

  const applyPrepState = useCallback(
    (prep: ReturnType<typeof normalizeHikePlanPrep>) => {
      setChecklist(prep.checklist);
      setPermits(prep.permits);
      setTransport(prep.transport ?? null);
      setPrepComplete({
        checklistComplete: prep.checklistComplete,
        permitsComplete: prep.permitsComplete,
        offlineReady: prep.offlineReady,
      });
    },
    []
  );

  const { isDownloaded, downloading, localPack, tileProgress, download } =
    useTrailOfflineDownload(routeDirectionId);

  useEffect(() => {
    if (!paramId) return;
    let cancelled = false;
    (async () => {
      setPrepLoading(true);
      try {
        const { hikePlanId, plan: p, created } = await resolveOrCreateHikePlanId(paramId);
        if (cancelled) return;
        if (created && paramId !== hikePlanId) {
          navigate(`/dashboard/trails/prep/${hikePlanId}`, { replace: true });
          return;
        }
        setResolvedPlanId(hikePlanId);
        setPlan(p);
        const prep = normalizeHikePlanPrep(
          await hikePlanRepository.getPrep(hikePlanId),
          hikePlanId,
          { useDefaultsWhenEmpty: false }
        );
        if (cancelled) return;
        applyPrepState(prep);
      } catch (e) {
        if (handleHikePlanError(e, navigate)) return;
        toast.error((e as Error).message || '加载准备数据失败');
      } finally {
        if (!cancelled) setPrepLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paramId, navigate, reloadKey, applyPrepState]);

  const persistPrep = useCallback(
    async (
      next: {
        checklist?: PrepChecklist[];
        permits?: PrepPermit[];
        transport?: PrepTransport | null;
      },
      flags?: { offlineReady?: boolean }
    ) => {
      if (!resolvedPlanId) return;
      const body: Parameters<typeof hikePlanRepository.updatePrep>[1] = {};
      if (next.checklist !== undefined) body.checklist = next.checklist;
      if (next.permits !== undefined) body.permits = next.permits;
      if (next.transport !== undefined) body.transport = next.transport ?? undefined;
      if (flags?.offlineReady !== undefined) body.offlineReady = flags.offlineReady;

      const updated = await hikePlanRepository.updatePrep(resolvedPlanId, body);
      applyPrepState(
        normalizeHikePlanPrep(updated, resolvedPlanId, { useDefaultsWhenEmpty: false })
      );
    },
    [resolvedPlanId, applyPrepState]
  );

  const savePrepOrToast = useCallback(
    async (
      patch: Parameters<typeof persistPrep>[0],
      flags?: Parameters<typeof persistPrep>[1]
    ) => {
      try {
        await persistPrep(patch, flags);
      } catch (e) {
        if (handleHikePlanError(e, navigate)) return;
        toast.error((e as Error).message || '保存准备数据失败');
        throw e;
      }
    },
    [persistPrep, navigate]
  );

  const handleChecklistToggle = async (categoryId: string, itemId: string) => {
    const prev = checklist;
    const next = prev.map((cat) =>
      cat.id === categoryId
        ? {
            ...cat,
            items: (cat.items ?? []).map((item) =>
              item.id === itemId ? { ...item, checked: !item.checked } : item
            ),
          }
        : cat
    );
    setChecklist(next);
    try {
      await savePrepOrToast({ checklist: next });
    } catch {
      setChecklist(prev);
    }
  };

  const handlePermitToggle = async (permitId: string) => {
    const prev = permits;
    const next = prev.map((p) => (p.id === permitId ? { ...p, obtained: !p.obtained } : p));
    setPermits(next);
    try {
      await savePrepOrToast({ permits: next });
    } catch {
      setPermits(prev);
    }
  };

  const permitsArePlaceholders = permitsLookLikePlaceholders(permits);

  const offlineReady = prepComplete.offlineReady || isDownloaded;

  /** 角标/进度以当前勾选为准，避免后端 permitsComplete 与 UI 不一致 */
  const permitsCompleteUi = clientPermitsComplete(permits);

  const canStart =
    prepComplete.checklistComplete &&
    permitsCompleteUi &&
    offlineReady;

  const prepProgress = useMemo(() => {
    const steps = [
      {
        key: 'checklist',
        done: prepComplete.checklistComplete,
        label: '必需装备已勾选',
      },
      {
        key: 'permits',
        done: permitsCompleteUi,
        label: '许可/预约已确认',
      },
      { key: 'offline', done: offlineReady, label: '离线包已下载' },
    ];
    const doneCount = steps.filter((s) => s.done).length;
    return { steps, doneCount, total: steps.length };
  }, [prepComplete, offlineReady, permitsCompleteUi]);

  const emergencyContacts = useMemo(() => {
    const rescue = localPack?.hikingDetail?.emergency?.rescuePhone;
    const list: Array<{ name: string; phone: string; type: string }> = [];
    if (rescue) list.push({ name: '救援电话', phone: rescue, type: 'rescue' });
    return list;
  }, [localPack]);

  const handleRefreshPrepTemplate = async () => {
    if (!resolvedPlanId) return;
    setRefreshingTemplate(true);
    try {
      const prep = await hikePlanRepository.refreshPrepTemplate(resolvedPlanId);
      applyPrepState(prep);
      toast.success('已从路线最新模板同步（已保留您的勾选与许可状态）');
    } catch (e) {
      if (handleHikePlanError(e, navigate)) return;
      toast.error((e as Error).message || '同步模板失败');
    } finally {
      setRefreshingTemplate(false);
    }
  };

  const handleDownloadOfflinePack = async () => {
    if (!routeDirectionId) {
      toast.error('路线 ID 无效');
      return;
    }
    try {
      const result = await download();
      const pack = result?.record;
      await persistPrep({}, { offlineReady: true });
      toast.success(
        result?.fromCache
          ? `离线包已就绪（缓存命中 · ${pack?.meta.version ?? pack?.version}）`
          : `离线包已下载（${pack?.meta.version ?? pack?.version} · 约 ${formatPackSize(pack?.sizeBytes ?? 0)}）`
      );
    } catch (e) {
      toast.error((e as Error).message || '下载失败');
    }
  };

  const handleStartHike = async () => {
    if (!resolvedPlanId) return;
    setStarting(true);
    try {
      await hikePlanRepository.start(resolvedPlanId);
      navigate(`/dashboard/trails/on-trail/${resolvedPlanId}`);
    } catch (e) {
      if (handleHikePlanError(e, navigate)) return;
      toast.error(getEmbeddedHikingErrorMessage(e));
    } finally {
      setStarting(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!resolvedPlanId) return;
    if (!plannedDate.trim()) {
      toast.error('请选择出发日期');
      return;
    }
    setSavingSchedule(true);
    try {
      const updated = await hikePlanRepository.update(resolvedPlanId, {
        plannedDate: plannedDate.trim(),
        plannedStartTime: plannedStartTime.trim() || undefined,
      });
      setPlan(updated);
      toast.success('出发时间已保存');
    } catch (e) {
      if (handleHikePlanError(e, navigate)) return;
      toast.error(getEmbeddedHikingErrorMessage(e));
    } finally {
      setSavingSchedule(false);
    }
  };

  if (prepLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* 返回按钮 */}
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回
      </Button>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            徒步准备中心
            {plan?.nameCN ? ` · ${plan.nameCN}` : ''}
          </h1>
          <p className="text-muted-foreground">把「可执行计划」变成「可出门行动」</p>
        </div>
        {routeDirectionId && (
          <Button
            variant="outline"
            onClick={() =>
              navigate(`/dashboard/readiness?trailId=${routeDirectionId}`)
            }
          >
            <Compass className="h-4 w-4 mr-2" />
            Readiness
          </Button>
        )}
      </div>

      <HikingFitnessCard
        className="mb-4"
        onUpdated={() => setReloadKey((k) => k + 1)}
      />

      <HikePlanStorageSwitch className="mb-4" />

      {plan ? (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-teal-700" />
              出发安排
            </CardTitle>
            <CardDescription>
              设置徒步出发日期与时刻，将写入 HikePlan 并用于 Readiness 归因
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prep-planned-date">出发日期</Label>
                <Input
                  id="prep-planned-date"
                  type="date"
                  value={plannedDate}
                  disabled={!scheduleEditable || savingSchedule}
                  onChange={(e) => setPlannedDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prep-planned-time">出发时间</Label>
                <Input
                  id="prep-planned-time"
                  type="time"
                  value={plannedStartTime}
                  disabled={!scheduleEditable || savingSchedule}
                  onChange={(e) => setPlannedStartTime(e.target.value)}
                />
              </div>
            </div>
            {!scheduleEditable ? (
              <p className="text-xs text-muted-foreground">
                行程已开始或已结束，出发时间不可修改
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={savingSchedule || !plannedDate}
                  onClick={() => void handleSaveSchedule()}
                >
                  {savingSchedule ? '保存中…' : '保存出发时间'}
                </Button>
                {plan.tripId ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/dashboard/trips/${plan.tripId}`)}
                  >
                    查看关联行程
                  </Button>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {isApiMode && isAuthenticated && resolvedPlanId && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed p-3 text-sm">
          <p className="text-muted-foreground">
            运营更新路线清单后，可同步最新{' '}
            <code className="text-xs">hikingDetail</code> 模板（保留 checked / obtained）
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={refreshingTemplate || prepLoading}
            onClick={handleRefreshPrepTemplate}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshingTemplate ? 'animate-spin' : ''}`}
            />
            同步路线模板
          </Button>
        </div>
      )}

      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="flex items-center gap-1 font-medium">
              <ListChecks className="h-4 w-4" />
              准备进度 {prepProgress.doneCount}/{prepProgress.total}
            </span>
            <span className="text-muted-foreground">
              {Math.round((prepProgress.doneCount / prepProgress.total) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 transition-all"
              style={{
                width: `${(prepProgress.doneCount / prepProgress.total) * 100}%`,
              }}
            />
          </div>
          {!canStart && (
            <ul className="mt-3 text-xs text-muted-foreground space-y-1">
              {prepProgress.steps
                .filter((s) => !s.done)
                .map((s) => (
                  <li key={s.key}>· {s.label}</li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="checklist" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checklist">装备清单</TabsTrigger>
          <TabsTrigger value="permits">许可/预约</TabsTrigger>
          <TabsTrigger value="transport">到达与返程</TabsTrigger>
          <TabsTrigger value="offline">离线包</TabsTrigger>
        </TabsList>

        {/* Checklist */}
        <TabsContent value="checklist">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>装备清单</CardTitle>
                  <CardDescription>
                    根据温度、风、路线风险自动生成
                  </CardDescription>
                </div>
                {prepComplete.checklistComplete ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    必需品已备齐
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    缺少必需品
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {(checklist ?? []).map((category) => {
                const items = category.items ?? [];
                const categoryChecked = items
                  .filter((item) => item.required)
                  .every((item) => item.checked);
                const missingRequired = items.filter(
                  (item) => item.required && !item.checked
                );

                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">
                        {prepCategoryLabel(category.category)}
                      </h3>
                      {categoryChecked ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          缺少 {missingRequired.length} 项
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-2 rounded-lg border hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={() =>
                              handleChecklistToggle(category.id, item.id)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={item.required ? 'font-medium' : ''}>
                                {prepItemLabel(item)}
                              </span>
                              {item.required && (
                                <Badge variant="destructive" className="text-xs">
                                  必需
                                </Badge>
                              )}
                            </div>
                            {item.reason && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.reason}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {!prepComplete.checklistComplete && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-900 font-medium mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    关键装备缺失
                  </div>
                  <p className="text-sm text-red-700">
                    缺少必需装备可能触发 Abu 的风险提示，请确保所有必需物品已准备。
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permits */}
        <TabsContent value="permits">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>许可/预约</CardTitle>
                  <CardDescription>需要预约、费用、链接</CardDescription>
                </div>
                {permitsCompleteUi ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    已获取
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    待获取
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {permitsArePlaceholders && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-950">
                  <p className="font-medium mb-1">许可模板未配全（非前端默认）</p>
                  <p className="text-amber-800">
                    当前 {permits.length} 条来自旧 prep 占位。请点上方「同步路线模板」（
                    <code className="text-xs">POST .../prep/refresh-template</code>
                    ），并确认路线详情 <code className="text-xs">hikingDetail.permits</code>{' '}
                    含 nameCN / titleZh（如 FÍ 山屋预订）。
                  </p>
                </div>
              )}
              {(permits ?? []).map((permit, index) => (
                <Card key={permit.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        className="mt-1 shrink-0"
                        checked={permit.obtained}
                        disabled={prepLoading || refreshingTemplate}
                        onCheckedChange={() => void handlePermitToggle(permit.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">
                            {prepPermitDisplayLabel(permit, index)}
                          </h3>
                          {permit.required && (
                            <Badge variant="destructive" className="text-xs">
                              必需
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {permit.capacity && (
                            <div>容量：{permit.capacity} 人</div>
                          )}
                          {permit.deadline && (
                            <div>截止时间：{permit.deadline}</div>
                          )}
                          {permit.cost && <div>费用：${permit.cost}</div>}
                        </div>
                      </div>
                      {permit.bookingUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => window.open(permit.bookingUrl, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          预约
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {permits.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  无需许可
                </div>
              )}

              {!permitsCompleteUi && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-900 font-medium mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    预约失败时
                  </div>
                  <p className="text-sm text-yellow-700">
                    Neptune 将提供替代营地/替代路线建议
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transport */}
        <TabsContent value="transport">
          <Card>
            <CardHeader>
              <CardTitle>到达与返程</CardTitle>
              <CardDescription>自驾、公交、班车信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!transport ? (
                <p className="text-sm text-muted-foreground">暂无交通信息</p>
              ) : (
              <>
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  到达起点
                </h3>
                <div className="p-4 border rounded-lg space-y-2 text-sm">
                  <div>
                    <span className="font-medium">方式：</span>
                    {transport.toTrailhead?.method ?? '待补充'}
                  </div>
                  {transport.toTrailhead?.parkingLocation && (
                    <div>
                      <span className="font-medium">停车点：</span>
                      <Button variant="link" size="sm" className="p-0 h-auto">
                        <MapPin className="h-3 w-3 mr-1" />
                        查看位置
                      </Button>
                    </div>
                  )}
                  {transport.toTrailhead?.estimatedDuration != null && (
                    <div>
                      <span className="font-medium">预计车程：</span>
                      {transport.toTrailhead.estimatedDuration} 分钟
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  从终点返回
                </h3>
                <div className="p-4 border rounded-lg space-y-2 text-sm">
                  <div>
                    <span className="font-medium">方式：</span>
                    {transport.fromTrailhead?.method ?? '待补充'}
                  </div>
                  {transport.fromTrailhead?.lastDeparture && (
                    <div>
                      <span className="font-medium">末班车：</span>
                      {transport.fromTrailhead.lastDeparture}
                    </div>
                  )}
                  {transport.fromTrailhead?.suggestedDepartTime && (
                    <div>
                      <span className="font-medium">建议出发：</span>
                      {transport.fromTrailhead.suggestedDepartTime}
                    </div>
                  )}
                  {!transport.fromTrailhead?.lastDeparture &&
                    !transport.fromTrailhead?.suggestedDepartTime && (
                    <div className="text-muted-foreground italic">
                      返程班次信息待补充
                    </div>
                  )}
                </div>
              </div>
              </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Offline Pack */}
        <TabsContent value="offline">
          <Card>
            <CardHeader>
              <CardTitle>离线包</CardTitle>
              <CardDescription>离线地图、轨迹、紧急联系卡</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isDownloaded && localPack ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-900 font-medium mb-2">
                      <CheckCircle2 className="h-4 w-4" />
                      已下载 · {localPack.nameCN}
                    </div>
                    <div className="text-sm text-green-700 space-y-1">
                      <div>
                        版本 {localPack.meta?.version ?? localPack.version} · checksum{' '}
                        <code className="text-xs">{localPack.checksum.slice(0, 12)}…</code>
                      </div>
                      <div>
                        下载时间：{new Date(localPack.downloadedAt).toLocaleString()} ·{' '}
                        {formatPackSize(localPack.sizeBytes)}
                      </div>
                      {localPack.meta?.noteZh ? (
                        <div className="text-xs">{localPack.meta.noteZh}</div>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">包含内容</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>
                          轨迹 {localPack.lineCoordinates.length} 点 · 补给{' '}
                          {localPack.markers.length} 处
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>日分段 {localPack.daySkeleton.length} 天</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>
                          撤退点{' '}
                          {localPack.hikingDetail?.alternatives?.exitPoints?.length ?? 0} 个
                        </span>
                      </div>
                      {localPack.vectorTileManifest ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm">
                            含 Mapbox 矢量清单（
                            {localPack.vectorTileManifest.tiles.provider}）
                          </span>
                        </div>
                      ) : null}
                      {localPack.tileCache && localPack.tileCache.tileCount > 0 ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>
                            离线底图 {localPack.tileCache.tileCount} 张瓦片（
                            {localPack.tileCache.format === 'vector' ? '矢量' : '栅格'} ·{' '}
                            {formatPackSize(localPack.tileCache.bytesCached)}）
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-700">
                          <AlertTriangle className="h-4 w-4" />
                          <span>底图瓦片未缓存，行中可能仅显示轨迹线</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {emergencyContacts.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">紧急联系人</h3>
                      <div className="space-y-2">
                        {emergencyContacts.map((contact, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 border rounded-lg text-sm"
                          >
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="font-medium">{contact.name}</div>
                              <div className="text-muted-foreground">{contact.phone}</div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {contact.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Download className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    下载离线包以确保在无信号区域也能使用
                  </p>
                  <Button
                    onClick={handleDownloadOfflinePack}
                    disabled={downloading || !routeDirectionId}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {downloading
                      ? tileProgress
                        ? `底图瓦片 ${tileProgress.done}/${tileProgress.total}…`
                        : '下载中…'
                      : '下载离线包'}
                  </Button>
                  {downloading && tileProgress ? (
                    <p className="text-xs text-muted-foreground mt-2">
                      含 GeoJSON + 地图瓦片（失败 {tileProgress.failed} 张仍可使用已缓存部分）
                    </p>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Start Hike CTA */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">准备完成</h3>
              <p className="text-sm text-muted-foreground">
                {canStart
                  ? '所有准备工作已完成，可以开始徒步'
                  : '请完成所有必需的准备工作'}
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleStartHike}
              disabled={!canStart || starting}
            >
              <Play className="h-4 w-4 mr-2" />
              开始徒步
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

