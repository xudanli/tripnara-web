import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TripDetail, ItineraryItem } from '@/types/trip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle2, ChevronRight, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import type { AbuViewData } from '@/utils/trip-data-extractors';
import {
  normalizeGateStatus,
  getGateStatusIcon,
  getGateStatusLabel,
  getGateStatusClasses,
} from '@/lib/gate-status';
import { cn } from '@/lib/utils';

interface AbuViewProps {
  trip: TripDetail;
  abuData: AbuViewData | null;
  onItemClick?: (item: ItineraryItem) => void;
}

export default function AbuView({ trip, abuData, onItemClick }: AbuViewProps) {
  const { t } = useTranslation();
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(null);
  const [evidenceSheetOpen, setEvidenceSheetOpen] = useState(false);

  // 如果数据未加载完成，显示加载状态
  if (!abuData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="w-8 h-8" />
        <span className="ml-2">{t('tripViews.abu.loadingSafetyData')}</span>
      </div>
    );
  }

  // 使用真实数据
  const gatingStatus = abuData.gatingStatus;
  const violations = abuData.violations || [];
  const riskMap = abuData.riskMap || {};

  // 标准化状态（PASSED -> ALLOW, WARN -> NEED_CONFIRM, BLOCKED -> REJECT）
  const normalizedStatus = normalizeGateStatus(gatingStatus);
  const StatusIcon = getGateStatusIcon(normalizedStatus);
  const statusLabel = getGateStatusLabel(normalizedStatus);
  const statusClasses = getGateStatusClasses(normalizedStatus);

  const getStatusIcon = () => {
    return <StatusIcon className="w-5 h-5" />;
  };

  const getStatusText = () => {
    // 使用国际化文本
    switch (normalizedStatus) {
      case 'ALLOW':
        return t('tripViews.abu.status.executable');
      case 'NEED_CONFIRM':
        return t('tripViews.abu.status.needConfirm');
      case 'REJECT':
        return t('tripViews.abu.status.blocked');
      default:
        return statusLabel;
    }
  };

  const getStatusColor = () => {
    return statusClasses;
  };


  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'MEDIUM':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'LOW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleItemClick = (item: ItineraryItem) => {
    setSelectedItem(item);
    setEvidenceSheetOpen(true);
    if (onItemClick) {
      onItemClick(item);
    }
  };

  const getItemRisk = (itemId: string) => {
    const risk = riskMap[itemId];
    if (!risk || !risk.severity) {
      return { level: 'NONE', tags: [], confidence: 0 };
    }
    return {
      level: risk.severity,
      tags: risk.type ? [risk.type] : [],
      confidence: 0.8, // 默认值
    };
  };

  return (
    <div className="space-y-4">
      {/* 顶部：安全状态条 */}
      <Card className={`border ${getStatusColor()}`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {getStatusIcon()}
              <div>
                <div className="font-semibold text-base">{t('tripViews.abu.safetyStatus')}：{getStatusText()}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {normalizedStatus === 'ALLOW'
                    ? t('tripViews.abu.violations.messages.safeToExecute')
                    : gatingStatus === 'WARN'
                    ? t('tripViews.abu.violations.messages.needConfirm')
                    : t('tripViews.abu.violations.messages.mustFix')}
                </div>
              </div>
            </div>
            {normalizedStatus !== 'ALLOW' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // 跳转到 Neptune 修复
                  console.log(t('tripViews.abu.violations.gotoNeptune'));
                }}
              >
                {t('tripViews.abu.violations.gotoNeptune')}
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 🆕 无风险时的友好提示 */}
      {normalizedStatus === 'ALLOW' && violations.length === 0 && Object.keys(riskMap).length === 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-600" />
            <div className="text-sm font-medium text-gray-900 mb-1">{t('tripViews.abu.allItemsGood')}</div>
            <div className="text-xs text-muted-foreground">{t('tripViews.abu.noFixNeeded')}</div>
          </CardContent>
        </Card>
      )}

      {/* 右侧：最关键 1-3 条红线摘要 */}
      {violations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-600" />
              {t('tripViews.abu.redlineSummary.title')}
            </CardTitle>
            <CardDescription className="text-xs">{t('tripViews.abu.redlineSummary.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {violations.slice(0, 3).map((violation) => (
              <div
                key={violation.id}
                className="p-3 border border-red-200 bg-red-50/50 rounded-lg cursor-pointer hover:bg-red-100/50 transition-colors"
                onClick={() => {
                  // 定位到对应的行程项
                  const firstDay = violation.affectedDays[0];
                  if (firstDay) {
                    // 尝试找到对应的行程项
                    const day = trip.TripDay.find(d => d.id === firstDay || d.date === firstDay);
                    if (day && day.ItineraryItem.length > 0) {
                      const itemId = day.ItineraryItem[0].id;
                      document.getElementById(`item-${itemId}`)?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="destructive" className="text-xs">
                        {t('tripViews.abu.hardConstraintViolation')}
                      </Badge>
                      <span className="text-sm font-medium truncate">{violation.explanation}</span>
                    </div>
                    {violation.reasonCodes.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {violation.reasonCodes.map((code) => (
                          <Badge key={code} variant="outline" className="text-xs">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {violation.affectedDays.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1.5">
                        {t('tripViews.abu.affectedDays')}: {violation.affectedDays.join(', ')}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 中部：行程时间轴（带风险徽标）- 仅在存在风险时显示，且只显示有风险的行程项 */}
      {(normalizedStatus !== 'ALLOW' || violations.length > 0 || Object.keys(riskMap).length > 0) && (
        <div className="space-y-4">
          {trip.TripDay.map((day) => {
            // 🆕 先过滤出有风险的行程项
            const riskyItems = day.ItineraryItem.filter((item) => {
              const risk = getItemRisk(item.id);
              return risk.level !== 'NONE';
            });

            // 🆕 如果这一天没有有风险的行程项，不显示这一天
            if (riskyItems.length === 0) {
              return null;
            }

            return (
              <Card key={day.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {format(new Date(day.date), t('tripViews.abu.dateFormat'))} ({day.date})
                  </CardTitle>
                  {/* ✅ 显示当天主题（如果存在） */}
                  {day.theme && (
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      {day.theme}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {riskyItems.map((item) => {
                      const risk = getItemRisk(item.id);
                      
                      // 🔍 诊断：检查Place信息是否存在
                      if (item.placeId && !item.Place) {
                        console.warn('⚠️ [AbuView] 行程项缺少Place信息:', {
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
                          id={`item-${item.id}`}
                          className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleItemClick(item)}
                        >
                          {/* 左侧风险徽标 */}
                          <div className="flex-shrink-0 pt-0.5">
                            <Badge className={cn(getRiskBadgeColor(risk.level), 'text-xs')}>
                              {risk.level === 'HIGH' ? t('tripViews.abu.riskLevel.high') : risk.level === 'MEDIUM' ? t('tripViews.abu.riskLevel.medium') : t('tripViews.abu.riskLevel.low')}
                            </Badge>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium truncate">
                                {item.Place?.nameCN || item.Place?.nameEN || (item.placeId ? `POI ${item.placeId}` : item.type)}
                              </span>
                              {/* ✅ 显示必游标记（如果存在） */}
                              {(item.isRequired || item.note?.includes('[必游]')) && (
                                <Badge variant="default" className="text-xs">
                                  {t('tripViews.abu.mustVisit')}
                                </Badge>
                              )}
                            </div>
                            {item.note && (
                              <div className="text-xs text-muted-foreground mb-1.5 line-clamp-2">{item.note}</div>
                            )}
                            {risk.tags.length > 0 && (
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                              {risk.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
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
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 右侧抽屉：风险卡（Evidence Card） */}
      <Sheet open={evidenceSheetOpen} onOpenChange={setEvidenceSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600" />
              {t('tripViews.abu.riskDetails.title')}
            </SheetTitle>
            <SheetDescription>
              {selectedItem?.Place?.nameCN || selectedItem?.type}{t('tripViews.abu.riskDetails.subtitle')}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {selectedItem && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('tripViews.abu.itemInfo.title')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <span className="font-medium">{t('tripViews.abu.itemInfo.location')}:</span>{' '}
                      {selectedItem.Place?.nameCN || selectedItem.type}
                    </div>
                    <div>
                      <span className="font-medium">{t('tripViews.abu.itemInfo.time')}:</span>{' '}
                      {format(new Date(selectedItem.startTime), 'yyyy-MM-dd HH:mm')} -{' '}
                      {format(new Date(selectedItem.endTime), 'HH:mm')}
                    </div>
                    <div>
                      <span className="font-medium">{t('tripViews.abu.itemInfo.type')}:</span>{' '}
                      {selectedItem.type}
                    </div>
                  </CardContent>
                </Card>

                {(() => {
                  const itemRisk = getItemRisk(selectedItem.id);
                  const itemViolations = violations.filter((v) =>
                    v.affectedDays.some(day => {
                      const tripDay = trip.TripDay.find(d => d.id === day || d.date === day);
                      return tripDay?.ItineraryItem.some(item => item.id === selectedItem.id);
                    })
                  );

                  if (itemViolations.length === 0 && itemRisk.level === 'NONE') {
                    return (
                      <Card className="border-green-200 bg-green-50">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-2 text-green-800">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-medium">{t('tripViews.abu.noRisk.title')}</span>
                          </div>
                          <div className="text-sm text-green-700 mt-2">
                            {t('tripViews.abu.noRisk.description')}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {itemRisk.level !== 'NONE' && (
                        <Card className="border-red-300 bg-red-50">
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Badge variant="destructive">
                                {itemRisk.level === 'HIGH' ? t('tripViews.abu.riskLevel.highRisk') : itemRisk.level === 'MEDIUM' ? t('tripViews.abu.riskLevel.mediumRisk') : t('tripViews.abu.riskLevel.lowRisk')}
                              </Badge>
                              {itemRisk.tags.join(', ')}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-sm">{itemRisk.tags.join('、')}</div>
                            {itemRisk.tags.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-2">
                                {t('tripViews.abu.riskType')}: {itemRisk.tags[0]}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                      
                      {itemViolations.map((violation) => (
                        <Card
                          key={violation.id}
                          className="border-red-300 bg-red-50"
                        >
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Badge variant="destructive">
                                {t('tripViews.abu.hardConstraintViolation')}
                              </Badge>
                              {violation.explanation}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <div className="font-medium mb-2">{t('tripViews.abu.rejectReason')}:</div>
                              <div className="text-sm">{violation.explanation}</div>
                            </div>

                            {violation.reasonCodes.length > 0 && (
                            <div>
                                <div className="font-medium mb-2">{t('tripViews.abu.reasonCodes')}:</div>
                                <div className="flex gap-2 flex-wrap">
                                  {violation.reasonCodes.map((code) => (
                                    <Badge key={code} variant="outline">
                                      {code}
                                    </Badge>
                                  ))}
                                </div>
                                      </div>
                                    )}

                            {violation.evidenceRefs && violation.evidenceRefs.length > 0 && (
                              <div>
                                <div className="font-medium mb-2">{t('tripViews.abu.evidenceRefs')}:</div>
                                <div className="text-sm text-muted-foreground">
                                  {violation.evidenceRefs.join(', ')}
                                  </div>
                              </div>
                            )}

                            <div>
                              <div className="font-medium mb-2">{t('tripViews.abu.affectedScope')}:</div>
                              <div className="text-sm text-muted-foreground">
                                {t('tripViews.abu.affectedDatesCount', { count: violation.affectedDays.length })}
                              </div>
                            </div>

                            <div>
                              <div className="font-medium mb-2">{t('tripViews.abu.suggestedAction')}:</div>
                                  <Button
                                    className="w-full"
                                    variant="destructive"
                                    onClick={() => {
                                      // 跳转到 Neptune 修复
                                      console.log(t('tripViews.abu.violations.gotoNeptune'));
                                    }}
                                  >
                                {t('tripViews.abu.mustFixNeptune')}
                                    <ExternalLink className="w-4 h-4 ml-2" />
                                  </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

