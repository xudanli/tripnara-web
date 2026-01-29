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
        <span className="ml-2">加载安全数据...</span>
      </div>
    );
  }

  // 使用真实数据
  const gatingStatus = abuData.gatingStatus;
  const violations = abuData.violations;
  const riskMap = abuData.riskMap;

  // 标准化状态（PASSED -> ALLOW, WARN -> NEED_CONFIRM, BLOCKED -> REJECT）
  const normalizedStatus = normalizeGateStatus(gatingStatus);
  const StatusIcon = getGateStatusIcon(normalizedStatus);
  const statusLabel = getGateStatusLabel(normalizedStatus);
  const statusClasses = getGateStatusClasses(normalizedStatus);

  const getStatusIcon = () => {
    return <StatusIcon className="w-5 h-5" />;
  };

  const getStatusText = () => {
    // 保持原有的国际化文本，但使用标准化状态
    switch (normalizedStatus) {
      case 'ALLOW':
        return t('tripViews.abu.status.executable') || '已通过所有安全检查';
      case 'NEED_CONFIRM':
        return t('tripViews.abu.status.needConfirm') || '存在安全风险，建议检查';
      case 'REJECT':
        return t('tripViews.abu.status.blocked') || '存在硬约束违反，路线不可执行';
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
    if (!risk) {
      return { level: 'NONE', tags: [], confidence: 0 };
    }
    return {
      level: risk.severity,
      tags: [risk.type],
      confidence: 0.8, // 默认值
    };
  };

  return (
    <div className="space-y-6">
      {/* 顶部：安全状态条 */}
      <Card className={`border-2 ${getStatusColor()}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <div className="font-semibold text-lg">安全状态：{getStatusText()}</div>
                <div className="text-sm opacity-80">
                  {normalizedStatus === 'ALLOW'
                    ? t('tripViews.abu.violations.messages.safeToExecute') || '已通过所有安全检查'
                    : gatingStatus === 'WARN'
                    ? t('tripViews.abu.violations.messages.needConfirm') || '存在安全风险，建议检查'
                    : t('tripViews.abu.violations.messages.mustFix') || '存在硬约束违反，路线不可执行'}
                </div>
              </div>
            </div>
            {normalizedStatus !== 'ALLOW' && (
              <Button
                variant="outline"
                onClick={() => {
                  // 跳转到 Neptune 修复
                  console.log(t('tripViews.abu.violations.gotoNeptune'));
                }}
              >
                {t('tripViews.abu.violations.gotoNeptune')}
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 右侧：最关键 1-3 条红线摘要 */}
      {violations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600" />
              红线摘要
            </CardTitle>
            <CardDescription>最关键的风险项，点击可定位到对应行程项</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {violations.slice(0, 3).map((violation) => (
              <div
                key={violation.id}
                className="p-3 border border-red-300 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100"
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
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="destructive">
                        硬约束违反
                      </Badge>
                      <span className="font-medium">{violation.explanation}</span>
                    </div>
                    {violation.reasonCodes.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {violation.reasonCodes.map((code) => (
                          <Badge key={code} variant="outline" className="text-xs">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {violation.affectedDays.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        影响天数: {violation.affectedDays.join(', ')}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 中部：行程时间轴（带风险徽标） */}
      <div className="space-y-4">
        {trip.TripDay.map((day) => (
          <Card key={day.id}>
            <CardHeader>
              <CardTitle>
                {format(new Date(day.date), 'yyyy年MM月dd日')} ({day.date})
              </CardTitle>
              {/* ✅ 显示当天主题（如果存在） */}
              {day.theme && (
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  {day.theme}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {day.ItineraryItem.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  该日暂无安排
                </div>
              ) : (
                <div className="space-y-2">
                  {day.ItineraryItem.map((item) => {
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
                        className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleItemClick(item)}
                      >
                        {/* 左侧风险徽标 */}
                        <div className="flex-shrink-0">
                          {risk.level !== 'NONE' ? (
                            <Badge className={getRiskBadgeColor(risk.level)}>
                              {risk.level === 'HIGH' ? '高' : risk.level === 'MEDIUM' ? '中' : '低'}
                            </Badge>
                          ) : (
                            <div className="w-16 h-6 flex items-center justify-center text-xs text-muted-foreground">
                              无风险
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {item.Place?.nameCN || item.Place?.nameEN || (item.placeId ? `POI ${item.placeId}` : item.type)}
                            </span>
                            {/* ✅ 显示必游标记（如果存在） */}
                            {(item.isRequired || item.note?.includes('[必游]')) && (
                              <Badge variant="default" className="text-xs">
                                必游
                              </Badge>
                            )}
                          </div>
                          {item.note && (
                            <div className="text-sm text-muted-foreground">{item.note}</div>
                          )}
                          {risk.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {risk.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(item.startTime), 'HH:mm')} -{' '}
                          {format(new Date(item.endTime), 'HH:mm')}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 右侧抽屉：风险卡（Evidence Card） */}
      <Sheet open={evidenceSheetOpen} onOpenChange={setEvidenceSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600" />
              风险详情
            </SheetTitle>
            <SheetDescription>
              {selectedItem?.Place?.nameCN || selectedItem?.type} 的风险评估与证据
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {selectedItem && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">行程项信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <span className="font-medium">地点：</span>
                      {selectedItem.Place?.nameCN || selectedItem.type}
                    </div>
                    <div>
                      <span className="font-medium">时间：</span>
                      {format(new Date(selectedItem.startTime), 'yyyy-MM-dd HH:mm')} -{' '}
                      {format(new Date(selectedItem.endTime), 'HH:mm')}
                    </div>
                    <div>
                      <span className="font-medium">类型：</span>
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
                            <span className="font-medium">无风险</span>
                          </div>
                          <div className="text-sm text-green-700 mt-2">
                            该行程项已通过安全检查，无已知风险。
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
                                {itemRisk.level === 'HIGH' ? '高风险' : itemRisk.level === 'MEDIUM' ? '中风险' : '低风险'}
                              </Badge>
                              {itemRisk.tags.join(', ')}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-sm">{itemRisk.tags.join('、')}</div>
                            {itemRisk.tags.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-2">
                                风险类型: {itemRisk.tags[0]}
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
                                硬约束违反
                              </Badge>
                              {violation.explanation}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <div className="font-medium mb-2">拒绝原因：</div>
                              <div className="text-sm">{violation.explanation}</div>
                            </div>

                            {violation.reasonCodes.length > 0 && (
                            <div>
                                <div className="font-medium mb-2">原因码：</div>
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
                                <div className="font-medium mb-2">证据引用：</div>
                                <div className="text-sm text-muted-foreground">
                                  {violation.evidenceRefs.join(', ')}
                                  </div>
                              </div>
                            )}

                            <div>
                              <div className="font-medium mb-2">影响范围：</div>
                              <div className="text-sm text-muted-foreground">
                                影响 {violation.affectedDays.length} 个日期
                              </div>
                            </div>

                            <div>
                              <div className="font-medium mb-2">建议动作：</div>
                                  <Button
                                    className="w-full"
                                    variant="destructive"
                                    onClick={() => {
                                      // 跳转到 Neptune 修复
                                      console.log('跳转到 Neptune 修复');
                                    }}
                                  >
                                必须修复（跳转到 Neptune）
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

