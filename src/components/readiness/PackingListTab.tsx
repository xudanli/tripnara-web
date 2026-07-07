/**
 * 打包清单标签页组件
 * 显示和管理行程的打包清单
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Package, RefreshCw, CheckCircle2, Edit2, Save, X, Plus, Filter, ListChecks, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  workbenchCard,
  workbenchDrawerListItem,
  workbenchDrawerListItemCompleted,
  workbenchDrawerSectionBody,
  workbenchDrawerSectionDesc,
  workbenchDrawerSectionHeader,
  workbenchDrawerSectionShell,
  workbenchDrawerSectionTitle,
  workbenchDrawerStepIndex,
  workbenchDrawerToolbarShell,
  workbenchPackingCategoryBadgeClass,
  workbenchPackingPriorityBadgeClass,
  workbenchPanelTitle,
  workbenchPrimaryAction,
  workbenchSecondaryMetric,
} from '@/components/plan-studio/workbench/workbench-ui';
import { readinessApi } from '@/api/readiness';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { TripDetail } from '@/types/trip';
import { 
  inferPackingListParams, 
  isTemplateSupported 
} from '@/utils/packing-list-inference';
import {
  isPackingListZhLang,
  packingListCategoryLabel,
  packingListChecklistTitle,
  packingListItemName,
  packingListItemReason,
  packingListKnownName,
  packingListPriorityLabel,
  packingListStepDescription,
  packingListStepTitle,
  packingListUnitLabel,
  type PackingListItemLike,
  type PackingListLang,
} from '@/lib/packing-list-display.util';
import PackingListAddItemDialog from '@/components/readiness/PackingListAddItemDialog';
import {
  createManualPackingItem,
  isManualPackingItemId,
  loadManualPackingItems,
  mergePackingListItems,
  saveManualPackingItems,
  summarizeMergedPackingItems,
} from '@/lib/packing-list-manual-items';

interface PackingListItem extends PackingListItemLike {
  id: string;
  quantity: number;
  sourceFindingId?: string;
  checked: boolean;
  note?: string;
}

interface PackingListData {
  tripId: string;
  items: PackingListItem[];
  summary: {
    totalItems: number;
    checkedItems: number;
    byCategory: Record<string, number>;
  };
  lastGeneratedAt?: string;
}

interface PackingListTabProps {
  tripId: string;
  trip: TripDetail | null;
}

export default function PackingListTab({ tripId, trip }: PackingListTabProps) {
  const { t, i18n } = useTranslation();
  const packingLang: PackingListLang = isPackingListZhLang(i18n.language) ? 'zh' : 'en';
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [packingList, setPackingList] = useState<PackingListData | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editNote, setEditNote] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showChecked, setShowChecked] = useState(true);
  const [packingOrderSteps, setPackingOrderSteps] = useState<Array<{
    order: number;
    title: string;
    description: string;
    items: string[];
  }> | null>(null);
  const [preDepartureChecklist, setPreDepartureChecklist] = useState<Array<{
    id: string;
    category: string;
    title: string;
    checked: boolean;
  }> | null>(null);
  const [loadingPackingOrder, setLoadingPackingOrder] = useState(false);
  const [loadingPreDeparture, setLoadingPreDeparture] = useState(false);
  const [showPackingOrder, setShowPackingOrder] = useState(false);
  const [showPreDeparture, setShowPreDeparture] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const buildMergedPackingList = (
    serverData: Omit<PackingListData, 'items' | 'summary'> & {
      items: PackingListItem[];
      summary: PackingListData['summary'];
    } | null,
  ): PackingListData | null => {
    const manual = loadManualPackingItems(tripId);
    if (!serverData && manual.length === 0) return null;

    const mergedItems = serverData
      ? (mergePackingListItems(serverData.items, manual) as PackingListItem[])
      : (manual as PackingListItem[]);
    const summaryStats = summarizeMergedPackingItems(mergedItems);

    return {
      tripId,
      items: mergedItems,
      summary: {
        totalItems: summaryStats.totalItems,
        checkedItems: summaryStats.checkedItems,
        byCategory: summaryStats.byCategory,
      },
      lastGeneratedAt: serverData?.lastGeneratedAt,
    };
  };

  // 加载打包清单
  const loadPackingList = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const data = await readinessApi.getPackingList(tripId);
      setPackingList(buildMergedPackingList(data as PackingListData));
    } catch (err: any) {
      const errorMessage = err?.message || '';
      if (!errorMessage.includes('未找到') && !errorMessage.includes('not found')) {
        console.error('Failed to load packing list:', err);
        toast.error('加载打包清单失败');
      }
      setPackingList(buildMergedPackingList(null));
    } finally {
      setLoading(false);
    }
  };

  // 生成打包清单
  const handleGenerate = async () => {
    if (!tripId || !trip) return;
    try {
      setGenerating(true);
      
      // 自动推断参数
      const destination = trip.destination || 'IS';
      const useTemplate = isTemplateSupported(destination);
      const inferredParams = inferPackingListParams(trip);
      
      console.log('🔄 [Packing List] 生成打包清单，推断参数:', {
        useTemplate,
        ...inferredParams,
      });
      
      const result = await readinessApi.generatePackingList(tripId, {
        includeOptional: true,
        useTemplate,
        season: inferredParams.season,
        route: inferredParams.route,
        userType: inferredParams.userType,
        activities: inferredParams.activities,
        lang: packingLang,
      });
      
      // 重新加载清单
      await loadPackingList();
      
      toast.success(t('dashboard.readiness.page.packingList.generateSuccess', { 
        count: result.items.length 
      }));
    } catch (err: any) {
      console.error('Failed to generate packing list:', err);
      toast.error(t('dashboard.readiness.page.packingList.generateFailed'));
    } finally {
      setGenerating(false);
    }
  };

  // 更新清单项
  const handleUpdateItem = async (
    itemId: string,
    updates: { checked?: boolean; quantity?: number; note?: string }
  ) => {
    if (!tripId) return;

    if (isManualPackingItemId(itemId)) {
      const manual = loadManualPackingItems(tripId).map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...(updates.checked !== undefined ? { checked: updates.checked } : {}),
              ...(updates.quantity !== undefined ? { quantity: updates.quantity } : {}),
              ...(updates.note !== undefined ? { note: updates.note } : {}),
            }
          : item,
      );
      saveManualPackingItems(tripId, manual);
      setPackingList((prev) => {
        if (!prev) return buildMergedPackingList(null);
        const mergedItems = prev.items.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item,
        );
        const summaryStats = summarizeMergedPackingItems(mergedItems);
        return {
          ...prev,
          items: mergedItems,
          summary: {
            totalItems: summaryStats.totalItems,
            checkedItems: summaryStats.checkedItems,
            byCategory: summaryStats.byCategory,
          },
        };
      });
      if (updates.checked !== undefined) setEditingItemId(null);
      return;
    }

    try {
      await readinessApi.updatePackingListItem(tripId, itemId, {
        checked: updates.checked,
        quantity: updates.quantity,
        notes: updates.note,
      });
      
      // 更新本地状态
      if (packingList) {
        setPackingList({
          ...packingList,
          items: packingList.items.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
          summary: {
            ...packingList.summary,
            checkedItems: updates.checked !== undefined
              ? updates.checked
                ? packingList.summary.checkedItems + 1
                : packingList.summary.checkedItems - 1
              : packingList.summary.checkedItems,
          },
        });
      }
      
      if (updates.checked !== undefined) {
        setEditingItemId(null);
      }
    } catch (err: any) {
      console.error('Failed to update packing list item:', err);
      toast.error('更新失败');
    }
  };

  // 开始编辑
  const handleStartEdit = (item: PackingListItem) => {
    setEditingItemId(item.id);
    setEditQuantity(item.quantity);
    setEditNote(item.note || '');
  };

  // 保存编辑
  const handleSaveEdit = (itemId: string) => {
    handleUpdateItem(itemId, {
      quantity: editQuantity,
      note: editNote,
    });
    setEditingItemId(null);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditQuantity(1);
    setEditNote('');
  };

  const handleAddManualItem = (values: {
    name: string;
    category: string;
    quantity: number;
    note?: string;
  }) => {
    if (!tripId) return;
    const manual = loadManualPackingItems(tripId);
    const next = [...manual, createManualPackingItem(values)];
    saveManualPackingItems(tripId, next);
    setPackingList((prev) => buildMergedPackingList(
      prev
        ? {
            tripId: prev.tripId,
            items: prev.items.filter((item) => !isManualPackingItemId(item.id)),
            summary: prev.summary,
            lastGeneratedAt: prev.lastGeneratedAt,
          }
        : null,
    ));
    toast.success('已添加物品');
  };

  const handleDeleteManualItem = (itemId: string) => {
    if (!tripId || !isManualPackingItemId(itemId)) return;
    const next = loadManualPackingItems(tripId).filter((item) => item.id !== itemId);
    saveManualPackingItems(tripId, next);
    setPackingList((prev) => {
      if (!prev) return buildMergedPackingList(null);
      return buildMergedPackingList({
        tripId: prev.tripId,
        items: prev.items.filter((item) => !isManualPackingItemId(item.id)),
        summary: prev.summary,
        lastGeneratedAt: prev.lastGeneratedAt,
      });
    });
    toast.success('已删除');
  };

  // 🆕 加载打包顺序步骤
  const loadPackingOrderSteps = async () => {
    try {
      setLoadingPackingOrder(true);
      const result = await readinessApi.getPackingOrderSteps(packingLang);
      setPackingOrderSteps(result.steps);
    } catch (err) {
      console.error('Failed to load packing order steps:', err);
      toast.error('加载打包顺序失败');
    } finally {
      setLoadingPackingOrder(false);
    }
  };

  // 🆕 加载出发前检查清单
  const loadPreDepartureChecklist = async () => {
    try {
      setLoadingPreDeparture(true);
      const result = await readinessApi.getPreDepartureChecklist(packingLang);
      setPreDepartureChecklist(result.checklist);
    } catch (err) {
      console.error('Failed to load pre-departure checklist:', err);
      toast.error('加载出发前检查清单失败');
    } finally {
      setLoadingPreDeparture(false);
    }
  };

  useEffect(() => {
    if (tripId) {
      loadPackingList();
    }
  }, [tripId]);

  // 获取所有分类
  const categories = packingList
    ? Array.from(new Set(packingList.items.map(item => item.category)))
    : [];

  // 过滤后的清单项
  const filteredItems = packingList?.items.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }
    if (!showChecked && item.checked) {
      return false;
    }
    return true;
  }) || [];

  // 按分类分组
  const itemsByCategory = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, PackingListItem[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部操作区 */}
      <section className={workbenchDrawerToolbarShell}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={cn(workbenchPanelTitle, 'flex items-center gap-2')}>
              <Package className="h-4 w-4 text-muted-foreground" />
              {t('dashboard.readiness.page.packingList.title')}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {packingList
                ? t('dashboard.readiness.page.packingList.description', {
                    total: packingList.summary.totalItems,
                    checked: packingList.summary.checkedItems,
                  })
                : t('dashboard.readiness.page.packingList.noList')}
            </p>
            {packingList?.lastGeneratedAt ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t('dashboard.readiness.page.packingList.lastGenerated', {
                  date: packingLang === 'zh'
                    ? format(new Date(packingList.lastGeneratedAt), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })
                    : format(new Date(packingList.lastGeneratedAt), 'MMM dd, yyyy HH:mm'),
                })}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {packingList ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setShowPackingOrder(!showPackingOrder);
                    if (!showPackingOrder && !packingOrderSteps) {
                      loadPackingOrderSteps();
                    }
                  }}
                  disabled={loadingPackingOrder}
                >
                  {loadingPackingOrder ? (
                    <Spinner className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <ListChecks className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {t('dashboard.readiness.page.packingList.packingOrder') || '打包顺序'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setShowPreDeparture(!showPreDeparture);
                    if (!showPreDeparture && !preDepartureChecklist) {
                      loadPreDepartureChecklist();
                    }
                  }}
                  disabled={loadingPreDeparture}
                >
                  {loadingPreDeparture ? (
                    <Spinner className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {t('dashboard.readiness.page.packingList.preDeparture') || '出发前检查'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={loadPackingList}
                  disabled={loading}
                >
                  <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
                  {t('dashboard.readiness.page.packingList.refresh')}
                </Button>
              </>
            ) : null}
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              添加物品
            </Button>
            <Button
              size="sm"
              className={cn('h-7 text-xs', workbenchPrimaryAction)}
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Spinner className="mr-1.5 h-3.5 w-3.5" />
                  {t('dashboard.readiness.page.packingList.generating')}
                </>
              ) : (
                <>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {t('dashboard.readiness.page.packingList.generate')}
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* 🆕 打包顺序步骤 */}
      {showPackingOrder && packingOrderSteps ? (
        <section className={workbenchDrawerSectionShell}>
          <div className={workbenchDrawerSectionHeader}>
            <div>
              <h3 className={cn(workbenchDrawerSectionTitle, 'flex items-center gap-2')}>
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                {t('dashboard.readiness.page.packingList.packingOrderTitle') || '推荐打包顺序'}
              </h3>
              <p className={workbenchDrawerSectionDesc}>
                {t('dashboard.readiness.page.packingList.packingOrderDescription') ||
                  '按照以下顺序打包，让您的旅行更有序'}
              </p>
            </div>
          </div>
          <div className={workbenchDrawerSectionBody}>
            <div className="space-y-4">
              {packingOrderSteps.map((step) => (
                <div key={step.order} className="flex gap-3">
                  <div className={workbenchDrawerStepIndex}>{step.order}</div>
                  <div className="min-w-0 flex-1">
                    <h4 className="mb-1 text-sm font-semibold">{packingListStepTitle(step, packingLang)}</h4>
                    <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
                      {packingListStepDescription(step, packingLang)}
                    </p>
                    {step.items.length > 0 ? (
                      <ul className="list-inside list-disc text-xs text-muted-foreground">
                        {step.items.map((item, idx) => (
                          <li key={idx}>{packingListKnownName(item, packingLang)}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 🆕 出发前检查清单 */}
      {showPreDeparture && preDepartureChecklist ? (
        <section className={workbenchDrawerSectionShell}>
          <div className={workbenchDrawerSectionHeader}>
            <div>
              <h3 className={cn(workbenchDrawerSectionTitle, 'flex items-center gap-2')}>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                {t('dashboard.readiness.page.packingList.preDepartureTitle') || '出发前24小时检查清单'}
              </h3>
              <p className={workbenchDrawerSectionDesc}>
                {t('dashboard.readiness.page.packingList.preDepartureDescription') ||
                  '出发前最后确认，确保万无一失'}
              </p>
            </div>
          </div>
          <div className={workbenchDrawerSectionBody}>
            <div className="space-y-2">
              {preDepartureChecklist.map((item) => (
                <div
                  key={item.id}
                  className={cn(workbenchDrawerListItem, 'flex items-center gap-3 py-2.5')}
                >
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={(checked) => {
                      console.log('Toggle pre-departure item:', item.id, checked);
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <Label className="text-sm font-medium">{packingListChecklistTitle(item, packingLang)}</Label>
                    {item.category ? (
                      <Badge
                        variant="outline"
                        className={cn('ml-2 text-[10px] font-normal', workbenchPackingCategoryBadgeClass)}
                      >
                        {packingListCategoryLabel(item.category, packingLang)}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {!packingList ? (
        <section className={cn(workbenchCard, 'py-12 text-center')}>
          <Package className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60" />
          <h3 className="mb-2 text-base font-semibold">
            {t('dashboard.readiness.page.packingList.empty.title')}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('dashboard.readiness.page.packingList.empty.description')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={handleGenerate} disabled={generating} variant="outline" size="sm" className="h-8">
              {generating ? (
                <>
                  <Spinner className="mr-1.5 h-3.5 w-3.5" />
                  {t('dashboard.readiness.page.packingList.generating')}
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  {t('dashboard.readiness.page.packingList.generate')}
                </>
              )}
            </Button>
            <Button onClick={() => setAddDialogOpen(true)} size="sm" className={cn('h-8', workbenchPrimaryAction)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              添加物品
            </Button>
          </div>
        </section>
      ) : (
        <>
          {/* 统计和筛选 */}
          <section className={workbenchDrawerToolbarShell}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-sm text-muted-foreground">
                  <span className={cn(workbenchSecondaryMetric, 'font-semibold')}>
                    {packingList.summary.totalItems}
                  </span>{' '}
                  {t('dashboard.readiness.page.packingList.totalItems')} ·{' '}
                  <span className={cn(workbenchSecondaryMetric, 'font-semibold text-gate-allow-foreground')}>
                    {packingList.summary.checkedItems}
                  </span>{' '}
                  {t('dashboard.readiness.page.packingList.checked')}
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="h-7 rounded-md border border-border/50 bg-background px-2 text-xs text-foreground"
                  >
                    <option value="all">{t('dashboard.readiness.page.packingList.allCategories')}</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {packingListCategoryLabel(cat, packingLang)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-checked"
                  checked={showChecked}
                  onCheckedChange={(checked) => setShowChecked(checked === true)}
                />
                <label htmlFor="show-checked" className="cursor-pointer text-xs text-muted-foreground">
                  {t('dashboard.readiness.page.packingList.showChecked')}
                </label>
              </div>
            </div>
          </section>

          {/* 清单项列表 */}
          <div className="space-y-3">
            {Object.entries(itemsByCategory).map(([category, items]) => (
              <section key={category} className={workbenchDrawerSectionShell}>
                <div className={cn(workbenchDrawerSectionHeader, 'py-2.5')}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] font-normal', workbenchPackingCategoryBadgeClass)}
                    >
                      {packingListCategoryLabel(category, packingLang)}
                    </Badge>
                    <span className={cn(workbenchSecondaryMetric, 'text-xs text-muted-foreground')}>
                      {items.length} {t('dashboard.readiness.page.packingList.items')}
                    </span>
                  </div>
                </div>
                <div className={cn(workbenchDrawerSectionBody, 'space-y-2 pt-2')}>
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          workbenchDrawerListItem,
                          item.checked && workbenchDrawerListItemCompleted,
                          editingItemId === item.id && 'ring-1 ring-border/80',
                        )}
                      >
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={(checked) =>
                            handleUpdateItem(item.id, { checked: checked === true })
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={cn(
                                'font-medium',
                                item.checked && 'line-through text-muted-foreground'
                              )}
                            >
                              {packingListItemName(item, packingLang)}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-normal',
                                workbenchPackingPriorityBadgeClass(item.priority),
                              )}
                            >
                              {packingListPriorityLabel(item.priority, packingLang)}
                            </Badge>
                            {isManualPackingItemId(item.id) ? (
                              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                                手动
                              </Badge>
                            ) : null}
                          </div>
                          {(() => {
                            const reason = packingListItemReason(item, packingLang);
                            return reason ? (
                            <p className="text-xs text-muted-foreground mb-1">
                              {reason}
                            </p>
                            ) : null;
                          })()}
                          {editingItemId === item.id ? (
                            <div className="space-y-2 mt-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="1"
                                  value={editQuantity}
                                  onChange={(e) => setEditQuantity(Number(e.target.value))}
                                  className="w-20"
                                />
                                <span className="text-sm text-muted-foreground">
                                  {packingListUnitLabel(item.unit, packingLang) ||
                                    t('dashboard.readiness.page.packingList.pieces')}
                                </span>
                              </div>
                              <Textarea
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                placeholder={t('dashboard.readiness.page.packingList.notePlaceholder')}
                                className="text-sm"
                                rows={2}
                              />
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveEdit(item.id)}
                                >
                                  <Save className="h-3 w-3 mr-1" />
                                  {t('dashboard.readiness.page.packingList.save')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  {t('dashboard.readiness.page.packingList.cancel')}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>
                              {item.quantity}{' '}
                              <span className={workbenchSecondaryMetric}>
                                {packingListUnitLabel(item.unit, packingLang) ||
                                  t('dashboard.readiness.page.packingList.pieces')}
                              </span>
                              </span>
                              {item.note && (
                                <>
                                  <span>•</span>
                                  <span className="italic">{item.note}</span>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 ml-auto"
                                onClick={() => handleStartEdit(item)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              {isManualPackingItemId(item.id) ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-muted-foreground hover:text-error"
                                  onClick={() => handleDeleteManualItem(item.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <PackingListAddItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        lang={packingLang}
        onSubmit={handleAddManualItem}
      />
    </div>
  );
}
