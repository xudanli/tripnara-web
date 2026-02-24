import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TripDetail, ItineraryItem } from '@/types/trip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { LogoLoading } from '@/components/common/LogoLoading';
import type { NeptuneViewData } from '@/utils/trip-data-extractors';
import { tripsApi } from '@/api/trips';
import { toast } from 'sonner';

interface NeptuneViewProps {
  trip: TripDetail;
  neptuneData: NeptuneViewData | null;
  onItemClick?: (item: ItineraryItem) => void;
  onRepairApplied?: () => void; // 🆕 修复应用后的回调
  onAlternativeApplied?: () => void; // 🆕 替代方案应用后的回调
}

export default function NeptuneView({ trip, neptuneData, onItemClick, onRepairApplied, onAlternativeApplied }: NeptuneViewProps) {
  const { t } = useTranslation();
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(null);
  const [alternativesSheetOpen, setAlternativesSheetOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<any | null>(null);
  const [patchSheetOpen, setPatchSheetOpen] = useState(false);

  // 如果数据未加载完成，显示加载状态
  if (!neptuneData) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <LogoLoading size={40} />
        <span>加载修复数据...</span>
      </div>
    );
  }

  // 使用真实数据
  const repairs = neptuneData.repairs || [];
  const alternatives = neptuneData.alternatives || {};

  const getItemRepairs = (itemId: string) => {
    return repairs.filter((r) => r.target === itemId);
  };

  const getItemAlternatives = (itemId: string) => {
    return alternatives[itemId] || [];
  };

  const handleItemClick = (item: ItineraryItem) => {
    setSelectedItem(item);
    setAlternativesSheetOpen(true);
    if (onItemClick) {
      onItemClick(item);
    }
  };

  const handleQuickFix = () => {
    // 一键止血：应用第一个修复
    if (repairs.length > 0) {
      setSelectedRepair(repairs[0]);
      setPatchSheetOpen(true);
    }
  };

  const handleApplyRepair = async (repair: any) => {
    // 🐛 修复：调用 API 应用修复
    try {
      const result = await tripsApi.applySuggestion(trip.id, repair.id, {
        actionId: 'apply_repair',
      });
      
      if (result.success) {
        toast.success('修复方案已应用');
        setPatchSheetOpen(false);
        setSelectedRepair(null);
        // 触发父组件刷新数据
        onRepairApplied?.();
      } else {
        toast.error(result.message || '应用修复失败');
      }
    } catch (error: any) {
      console.error('应用修复失败:', error);
      toast.error(error?.message || '应用修复失败，请重试');
    }
  };

  return (
    <div className="space-y-4">
      {/* 顶部：修复队列（Fix Queue） */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-green-600" />
              {t('tripViews.neptune.fixQueue')}
            </CardTitle>
            {repairs.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleQuickFix}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                {t('tripViews.neptune.applyAllFixes')}
              </Button>
            )}
          </div>
          <CardDescription className="text-xs">{t('tripViews.neptune.sortedByUrgency')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {repairs.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-600" />
              <div className="text-sm font-medium text-gray-900 mb-1">{t('tripViews.neptune.noFixesNeeded')}</div>
              <div className="text-xs text-muted-foreground">所有行程项状态良好，无需修复</div>
            </div>
          ) : (
            repairs.map((repair) => (
              <div
                key={repair.id}
                className="p-3 border border-yellow-200 bg-yellow-50/50 rounded-lg cursor-pointer hover:bg-yellow-100/50 transition-colors"
                onClick={() => {
                  setSelectedRepair(repair);
                  setPatchSheetOpen(true);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <RefreshCw className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="outline" className="text-xs">
                          修复建议
                        </Badge>
                        <span className="text-sm font-medium truncate">{repair.explanation}</span>
                      </div>
                      {repair.reasonCodes && repair.reasonCodes.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {repair.reasonCodes.map((code: string) => (
                            <Badge key={code} variant="outline" className="text-xs">
                              {code}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {(repair.target || repair.replacement) && (
                        <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
                          {repair.target && <div>目标: {repair.target}</div>}
                          {repair.replacement && <div>替换为: {repair.replacement}</div>}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1.5">
                        {format(new Date(repair.timestamp), 'yyyy-MM-dd HH:mm')}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 中部：时间轴（强调可替换点）- 仅在有待修复项时显示 */}
      {repairs.length > 0 && (
        <div className="space-y-4">
          {trip.TripDay.map((day) => (
          <Card key={day.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {format(new Date(day.date), 'yyyy年MM月dd日')} ({day.date})
              </CardTitle>
              {/* ✅ 显示当天主题（如果存在） */}
              {day.theme && (
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  {day.theme}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {day.ItineraryItem.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">{t('tripViews.neptune.noScheduleForDay')}</div>
              ) : (
                <div className="space-y-3">
                  {day.ItineraryItem.map((item) => {
                    const itemRepairs = getItemRepairs(item.id);
                    const itemAlternatives = getItemAlternatives(item.id);
                    const isReplaceable = itemAlternatives.length > 0;
                    const isSkippable = true; // 实际应该从后端判断
                    const isLocked = false; // 实际应该从后端判断

                    // 🔍 诊断：检查Place信息是否存在
                    if (item.placeId && !item.Place) {
                      console.warn('⚠️ [NeptuneView] 行程项缺少Place信息:', {
                        itemId: item.id,
                        placeId: item.placeId,
                        type: item.type,
                        note: item.note,
                        day: day.date,
                      });
                    }

                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-shrink-0 pt-0.5">
                          {isLocked ? (
                            <Badge variant="outline" className="bg-gray-100 text-xs">
                              {t('tripViews.neptune.lock')}
                            </Badge>
                          ) : isReplaceable ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                              {t('tripViews.neptune.replaceable')}
                            </Badge>
                          ) : isSkippable ? (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">
                              {t('tripViews.neptune.skippable')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">{t('tripViews.neptune.mustKeep')}</Badge>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium truncate">{item.Place?.nameCN || item.Place?.nameEN || (item.placeId ? `POI ${item.placeId}` : item.type)}</span>
                            {/* ✅ 显示必游标记（如果存在） */}
                            {(item.isRequired || item.note?.includes('[必游]')) && (
                              <Badge variant="default" className="text-xs">
                                必游
                              </Badge>
                            )}
                          </div>
                          {item.note && (
                            <div className="text-xs text-muted-foreground mb-1.5 line-clamp-2">{item.note}</div>
                          )}
                          {itemRepairs.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {itemRepairs.map((repair) => (
                                <Badge
                                  key={repair.id}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  修复建议
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(item.startTime), 'HH:mm')} -{' '}
                            {format(new Date(item.endTime), 'HH:mm')}
                          </div>
                          {isReplaceable && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleItemClick(item)}
                            >
                              {t('tripViews.neptune.viewAlternatives')}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {/* 右侧抽屉：替代候选列表 */}
      <Sheet open={alternativesSheetOpen} onOpenChange={setAlternativesSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-green-600" />
              {t('tripViews.neptune.alternativeCandidates')}
            </SheetTitle>
            <SheetDescription>
              {t('tripViews.neptune.alternativesFor', { itemName: selectedItem?.Place?.nameCN || selectedItem?.type || '' })}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {selectedItem && (
              <>
                {getItemAlternatives(selectedItem.id).length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-muted-foreground py-8">
                        {t('tripViews.neptune.noAlternatives')}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  getItemAlternatives(selectedItem.id).map((alt, idx) => (
                    <Card key={idx} className="cursor-pointer hover:shadow-md">
                      <CardHeader>
                        <CardTitle className="text-lg">{alt.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {alt.description && (
                          <div>
                            <div className="font-medium mb-1">说明</div>
                            <div className="text-sm text-muted-foreground">{alt.description}</div>
                          </div>
                        )}
                        {alt.actions && alt.actions.length > 0 && (
                          <div className="space-y-2">
                            {alt.actions.map((action: any) => (
                        <Button
                                key={action.id}
                          className="w-full"
                                variant={action.primary ? 'default' : 'outline'}
                                onClick={async () => {
                                  if (action.handler) {
                                    await action.handler();
                                  } else {
                                    // 🐛 修复：调用 API 应用替代方案
                                    try {
                                      const result = await tripsApi.applySuggestion(trip.id, alt.id, {
                                        actionId: action.id || 'apply_alternative',
                                      });
                                      
                                      if (result.success) {
                                        toast.success('替代方案已应用');
                                        setAlternativesSheetOpen(false);
                                        // 触发父组件刷新数据
                                        onAlternativeApplied?.();
                                      } else {
                                        toast.error(result.message || '应用替代方案失败');
                                      }
                                    } catch (error: any) {
                                      console.error('应用替代方案失败:', error);
                                      toast.error(error?.message || '应用替代方案失败，请重试');
                                    }
                                  }
                            setAlternativesSheetOpen(false);
                          }}
                        >
                                {action.label || '应用'}
                        </Button>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Patch Diff 详情（修复详情） */}
      <Sheet open={patchSheetOpen} onOpenChange={setPatchSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-green-600" />
              修复详情
            </SheetTitle>
            <SheetDescription>Before / After 对比</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {selectedRepair && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{selectedRepair.explanation}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 修复说明 */}
                    <div>
                      <div className="font-medium mb-2">修复说明</div>
                      <div className="text-sm">{selectedRepair.explanation}</div>
                    </div>

                    {/* 原因码 */}
                    {selectedRepair.reasonCodes && selectedRepair.reasonCodes.length > 0 && (
                      <div>
                        <div className="font-medium mb-2">原因码</div>
                        <div className="flex gap-2 flex-wrap">
                          {selectedRepair.reasonCodes.map((code: string) => (
                            <Badge key={code} variant="outline">
                              {code}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 修复内容 */}
                    {selectedRepair.target && (
                      <div>
                        <div className="font-medium mb-2">原计划</div>
                        <div className="text-sm text-muted-foreground">{selectedRepair.originalPlan || selectedRepair.target}</div>
                      </div>
                    )}
                    {selectedRepair.replacement && (
                          <div>
                        <div className="font-medium mb-2">替换为</div>
                        <div className="text-sm text-muted-foreground">{selectedRepair.replacement}</div>
                      </div>
                    )}

                    {/* 时间戳 */}
                    <div>
                      <div className="font-medium mb-2">时间</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(selectedRepair.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 操作按钮 */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setPatchSheetOpen(false)}
                  >
                    取消
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleApplyRepair(selectedRepair)}
                  >
                    {t('tripViews.neptune.applyFix') || '应用修复'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

