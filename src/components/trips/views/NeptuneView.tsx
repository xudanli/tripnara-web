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
import type { NeptuneViewData } from '@/utils/trip-data-extractors';

interface NeptuneViewProps {
  trip: TripDetail;
  neptuneData: NeptuneViewData | null;
  onItemClick?: (item: ItineraryItem) => void;
}

export default function NeptuneView({ trip, neptuneData, onItemClick }: NeptuneViewProps) {
  const { t } = useTranslation();
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(null);
  const [alternativesSheetOpen, setAlternativesSheetOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<any | null>(null);
  const [patchSheetOpen, setPatchSheetOpen] = useState(false);

  // 如果数据未加载完成，显示加载状态
  if (!neptuneData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="w-8 h-8" />
        <span className="ml-2">加载修复数据...</span>
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
    // 应用修复（需要调用 API）
    try {
      // TODO: 调用 API 应用修复
      // await tripsApi.applySuggestion(trip.id, repair.id, { actionId: 'apply_repair' });
      console.log('应用修复:', repair.id);
    setPatchSheetOpen(false);
    setSelectedRepair(null);
      // 可以显示成功提示
    } catch (error) {
      console.error('应用修复失败:', error);
      // 可以显示错误提示
    }
  };

  return (
    <div className="space-y-6">
      {/* 顶部：修复队列（Fix Queue） */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-green-600" />
              {t('tripViews.neptune.fixQueue')}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleQuickFix}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('tripViews.neptune.applyAllFixes')}
            </Button>
          </div>
          <CardDescription>{t('tripViews.neptune.sortedByUrgency')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {repairs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-600" />
              <div>{t('tripViews.neptune.noFixesNeeded')}</div>
            </div>
          ) : (
            repairs.map((repair) => (
              <div
                key={repair.id}
                className="p-4 border border-yellow-300 bg-yellow-50 rounded-lg cursor-pointer hover:shadow-md"
                onClick={() => {
                  setSelectedRepair(repair);
                  setPatchSheetOpen(true);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <RefreshCw className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">
                          修复建议
                        </Badge>
                        <span className="font-medium">{repair.explanation}</span>
                      </div>
                      {repair.reasonCodes && repair.reasonCodes.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {repair.reasonCodes.map((code: string) => (
                            <Badge key={code} variant="outline" className="text-xs">
                              {code}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {repair.target && (
                        <div className="text-sm text-muted-foreground mt-1">
                          目标: {repair.target}
                        </div>
                      )}
                      {repair.replacement && (
                        <div className="text-sm text-muted-foreground mt-1">
                          替换为: {repair.replacement}
                      </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(repair.timestamp), 'yyyy-MM-dd HH:mm')}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 中部：时间轴（强调可替换点） */}
      <div className="space-y-4">
        {trip.TripDay.map((day) => (
          <Card key={day.id}>
            <CardHeader>
              <CardTitle>
                {format(new Date(day.date), 'yyyy年MM月dd日')} ({day.date})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {day.ItineraryItem.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">{t('tripViews.neptune.noScheduleForDay')}</div>
              ) : (
                <div className="space-y-2">
                  {day.ItineraryItem.map((item) => {
                    const itemRepairs = getItemRepairs(item.id);
                    const itemAlternatives = getItemAlternatives(item.id);
                    const isReplaceable = itemAlternatives.length > 0;
                    const isSkippable = true; // 实际应该从后端判断
                    const isLocked = false; // 实际应该从后端判断

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-shrink-0">
                          {isLocked ? (
                            <Badge variant="outline" className="bg-gray-100">
                              {t('tripViews.neptune.lock')}
                            </Badge>
                          ) : isReplaceable ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              {t('tripViews.neptune.replaceable')}
                            </Badge>
                          ) : isSkippable ? (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                              {t('tripViews.neptune.skippable')}
                            </Badge>
                          ) : (
                            <Badge variant="outline">{t('tripViews.neptune.mustKeep')}</Badge>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{item.Place?.nameCN || item.type}</div>
                          {item.note && (
                            <div className="text-sm text-muted-foreground">{item.note}</div>
                          )}
                          {itemRepairs.length > 0 && (
                            <div className="flex gap-1 mt-1">
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
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(item.startTime), 'HH:mm')} -{' '}
                          {format(new Date(item.endTime), 'HH:mm')}
                        </div>
                        {isReplaceable && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleItemClick(item)}
                          >
                            {t('tripViews.neptune.viewAlternatives')}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

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
                                    // 默认处理：应用替代方案
                                    console.log('应用替代方案:', alt.id);
                                    // TODO: 调用 API 应用替代方案
                                    // await tripsApi.applySuggestion(trip.id, alt.id, { actionId: action.id });
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

