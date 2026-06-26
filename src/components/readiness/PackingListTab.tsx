/**
 * 打包清单标签页组件
 * 显示和管理行程的打包清单
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Package, RefreshCw, CheckCircle2, Edit2, Save, X, Plus, Filter, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
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

// 🎨 统一颜色 Token（符合 TripNARA 克制原则）
const CATEGORY_COLORS: Record<string, string> = {
  'clothing': 'bg-blue-50 text-blue-700', // ✅ 修复：使用 bg-blue-50 而不是 bg-blue-100
  'electronics': 'bg-purple-50 text-purple-700', // ✅ 修复：使用 bg-purple-50 而不是 bg-purple-100
  'toiletries': 'bg-pink-50 text-pink-700', // ✅ 修复：使用 bg-pink-50 而不是 bg-pink-100
  'documents': 'bg-red-50 text-red-700', // ✅ 修复：使用 bg-red-50 而不是 bg-red-100
  'food': 'bg-amber-50 text-amber-700', // ✅ 修复：使用 bg-amber-50 而不是 bg-orange-100
  'safety': 'bg-amber-50 text-amber-700', // ✅ 修复：使用 bg-amber-50 而不是 bg-yellow-100
  'other': 'bg-gray-50 text-gray-700', // ✅ 修复：使用 bg-gray-50 而不是 bg-gray-100
};

const PRIORITY_COLORS: Record<string, string> = {
  'must': 'bg-red-50 text-red-700 border-red-200', // ✅ 修复：使用 bg-red-50 而不是 bg-red-100
  'should': 'bg-amber-50 text-amber-700 border-amber-200', // ✅ 修复：使用 bg-amber-50 而不是 bg-yellow-100
  'optional': 'bg-gray-50 text-gray-700 border-gray-200', // ✅ 修复：使用 bg-gray-50 而不是 bg-gray-100
};

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

  // 加载打包清单
  const loadPackingList = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const data = await readinessApi.getPackingList(tripId);
      setPackingList(data);
    } catch (err: any) {
      // 如果清单不存在，不显示错误（可能是还没生成）
      const errorMessage = err?.message || '';
      if (!errorMessage.includes('未找到') && !errorMessage.includes('not found')) {
        console.error('Failed to load packing list:', err);
        toast.error('加载打包清单失败');
      }
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
    try {
      await readinessApi.updatePackingListItem(tripId, itemId, updates);
      
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
    <div className="space-y-6">
      {/* 头部操作区 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t('dashboard.readiness.page.packingList.title')}
              </CardTitle>
              <CardDescription>
                {packingList
                  ? t('dashboard.readiness.page.packingList.description', {
                      total: packingList.summary.totalItems,
                      checked: packingList.summary.checkedItems,
                    })
                  : t('dashboard.readiness.page.packingList.noList')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {packingList && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowPackingOrder(!showPackingOrder);
                      if (!showPackingOrder && !packingOrderSteps) {
                        loadPackingOrderSteps();
                      }
                    }}
                    disabled={loadingPackingOrder}
                  >
                    {loadingPackingOrder ? (
                      <Spinner className="h-4 w-4 mr-2" />
                    ) : (
                      <ListChecks className="h-4 w-4 mr-2" />
                    )}
                    {t('dashboard.readiness.page.packingList.packingOrder') || '打包顺序'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowPreDeparture(!showPreDeparture);
                      if (!showPreDeparture && !preDepartureChecklist) {
                        loadPreDepartureChecklist();
                      }
                    }}
                    disabled={loadingPreDeparture}
                  >
                    {loadingPreDeparture ? (
                      <Spinner className="h-4 w-4 mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    {t('dashboard.readiness.page.packingList.preDeparture') || '出发前检查'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadPackingList}
                    disabled={loading}
                  >
                    <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                    {t('dashboard.readiness.page.packingList.refresh')}
                  </Button>
                </>
              )}
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    {t('dashboard.readiness.page.packingList.generating')}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('dashboard.readiness.page.packingList.generate')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        {packingList && packingList.lastGeneratedAt && (
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {t('dashboard.readiness.page.packingList.lastGenerated', {
                date: packingLang === 'zh'
                  ? format(new Date(packingList.lastGeneratedAt), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })
                  : format(new Date(packingList.lastGeneratedAt), 'MMM dd, yyyy HH:mm'),
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* 🆕 打包顺序步骤 */}
      {showPackingOrder && packingOrderSteps && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              {t('dashboard.readiness.page.packingList.packingOrderTitle') || '推荐打包顺序'}
            </CardTitle>
            <CardDescription>
              {t('dashboard.readiness.page.packingList.packingOrderDescription') || '按照以下顺序打包，让您的旅行更有序'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {packingOrderSteps.map((step) => (
                <div key={step.order} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                    {step.order}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{packingListStepTitle(step, packingLang)}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {packingListStepDescription(step, packingLang)}
                    </p>
                    {step.items.length > 0 && (
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {step.items.map((item, idx) => (
                          <li key={idx}>{packingListKnownName(item, packingLang)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 🆕 出发前检查清单 */}
      {showPreDeparture && preDepartureChecklist && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              {t('dashboard.readiness.page.packingList.preDepartureTitle') || '出发前24小时检查清单'}
            </CardTitle>
            <CardDescription>
              {t('dashboard.readiness.page.packingList.preDepartureDescription') || '出发前最后确认，确保万无一失'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {preDepartureChecklist.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={(checked) => {
                      // 这里可以添加更新逻辑
                      console.log('Toggle pre-departure item:', item.id, checked);
                    }}
                  />
                  <div className="flex-1">
                    <Label className="font-medium">{packingListChecklistTitle(item, packingLang)}</Label>
                    {item.category && (
                      <Badge variant="outline" className="ml-2">
                        {packingListCategoryLabel(item.category, packingLang)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!packingList ? (
        // 空状态
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {t('dashboard.readiness.page.packingList.empty.title')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('dashboard.readiness.page.packingList.empty.description')}
            </p>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  {t('dashboard.readiness.page.packingList.generating')}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('dashboard.readiness.page.packingList.generate')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 统计和筛选 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="font-semibold">{packingList.summary.totalItems}</span>{' '}
                    {t('dashboard.readiness.page.packingList.totalItems')} •{' '}
                    <span className="font-semibold text-green-600">
                      {packingList.summary.checkedItems}
                    </span>{' '}
                    {t('dashboard.readiness.page.packingList.checked')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="all">{t('dashboard.readiness.page.packingList.allCategories')}</option>
                      {categories.map(cat => (
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
                  <label
                    htmlFor="show-checked"
                    className="text-sm cursor-pointer"
                  >
                    {t('dashboard.readiness.page.packingList.showChecked')}
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 清单项列表 */}
          <div className="space-y-4">
            {Object.entries(itemsByCategory).map(([category, items]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(CATEGORY_COLORS[category] || CATEGORY_COLORS.other)}
                    >
                      {packingListCategoryLabel(category, packingLang)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({items.length} {t('dashboard.readiness.page.packingList.items')})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {items.map(item => (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border',
                          item.checked && 'bg-muted/50',
                          editingItemId === item.id && 'ring-2 ring-blue-500'
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
                                'text-xs',
                                PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.optional
                              )}
                            >
                              {packingListPriorityLabel(item.priority, packingLang)}
                            </Badge>
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
                                {packingListUnitLabel(item.unit, packingLang) ||
                                  t('dashboard.readiness.page.packingList.pieces')}
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
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
