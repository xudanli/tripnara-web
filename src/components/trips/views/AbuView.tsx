import { useState } from 'react';
import type { TripDetail, ItineraryItem } from '@/types/trip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle2, XCircle, ChevronRight, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface AbuViewProps {
  trip: TripDetail;
  onItemClick?: (item: ItineraryItem) => void;
}

// 模拟的风险数据（实际应该从后端获取）
interface RiskViolation {
  level: 'HARD' | 'SOFT';
  code: string;
  title: string;
  reason: string;
  evidence: Array<{ field: string; value: string; timestamp?: string }>;
  affectedItemIds: string[];
}

interface RiskMap {
  [itemId: string]: {
    level: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
    tags: string[];
    confidence: number;
  };
}

export default function AbuView({ trip, onItemClick }: AbuViewProps) {
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(null);
  const [evidenceSheetOpen, setEvidenceSheetOpen] = useState(false);

  // 模拟数据：实际应该从后端 API 获取
  const gatingStatus: 'ALLOW' | 'WARN' | 'BLOCK' = 'WARN';
  const violations: RiskViolation[] = [
    {
      level: 'HARD',
      code: 'NIGHT_HIKE',
      title: '夜间徒步风险',
      reason: 'Day 2 包含夜间徒步路段，无备用撤退点',
      evidence: [
        { field: '日落时间', value: '18:30', timestamp: '2024-01-15' },
        { field: '预计结束时间', value: '19:45' },
        { field: '路段难度', value: 'CHALLENGE' },
      ],
      affectedItemIds: ['item-2'],
    },
    {
      level: 'SOFT',
      code: 'BUFFER_INSUFFICIENT',
      title: '缓冲时间不足',
      reason: '缺少缓冲可能导致延误连锁反应',
      evidence: [
        { field: '当前缓冲', value: '15分钟' },
        { field: '建议缓冲', value: '30分钟' },
      ],
      affectedItemIds: ['item-1', 'item-3'],
    },
  ];

  const riskMap: RiskMap = {
    'item-1': { level: 'LOW', tags: ['缓冲不足'], confidence: 0.8 },
    'item-2': { level: 'HIGH', tags: ['夜间徒步', '无撤退点'], confidence: 0.95 },
    'item-3': { level: 'MEDIUM', tags: ['时间窗冲突'], confidence: 0.7 },
  };

  const getStatusIcon = () => {
    switch (gatingStatus) {
      case 'ALLOW':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'WARN':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'BLOCK':
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusText = () => {
    switch (gatingStatus) {
      case 'ALLOW':
        return '可执行';
      case 'WARN':
        return '需确认';
      case 'BLOCK':
        return '禁止';
    }
  };

  const getStatusColor = () => {
    switch (gatingStatus) {
      case 'ALLOW':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'WARN':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'BLOCK':
        return 'bg-red-50 border-red-200 text-red-800';
    }
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
    return riskMap[itemId] || { level: 'NONE', tags: [], confidence: 0 };
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
                  {gatingStatus === 'ALLOW'
                    ? '路线已通过安全检查，可以执行'
                    : gatingStatus === 'WARN'
                    ? '存在需要确认的风险，请查看详情'
                    : '存在硬红线，必须修复后才能继续'}
                </div>
              </div>
            </div>
            {gatingStatus !== 'ALLOW' && (
              <Button
                variant="outline"
                onClick={() => {
                  // 跳转到 Neptune 修复
                  console.log('跳转到 Neptune 修复');
                }}
              >
                跳转到 Neptune 修复
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
            {violations.slice(0, 3).map((violation, idx) => (
              <div
                key={idx}
                className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                  violation.level === 'HARD' ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'
                }`}
                onClick={() => {
                  // 定位到对应的行程项
                  const firstItemId = violation.affectedItemIds[0];
                  if (firstItemId) {
                    document.getElementById(`item-${firstItemId}`)?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={violation.level === 'HARD' ? 'destructive' : 'secondary'}>
                        {violation.level === 'HARD' ? '硬红线' : '软红线'}
                      </Badge>
                      <span className="font-medium">{violation.title}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{violation.reason}</div>
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
                          <div className="font-medium">
                            {item.Place?.nameCN || item.type}
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
                    v.affectedItemIds.includes(selectedItem.id)
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
                      {itemViolations.map((violation, idx) => (
                        <Card
                          key={idx}
                          className={
                            violation.level === 'HARD'
                              ? 'border-red-300 bg-red-50'
                              : 'border-yellow-300 bg-yellow-50'
                          }
                        >
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Badge
                                variant={violation.level === 'HARD' ? 'destructive' : 'secondary'}
                              >
                                {violation.level === 'HARD' ? '硬红线' : '软红线'}
                              </Badge>
                              {violation.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <div className="font-medium mb-2">拒绝原因：</div>
                              <div className="text-sm">{violation.reason}</div>
                            </div>

                            <div>
                              <div className="font-medium mb-2">证据链：</div>
                              <div className="space-y-2">
                                {violation.evidence.map((ev, evIdx) => (
                                  <div
                                    key={evIdx}
                                    className="p-2 bg-white border rounded text-sm"
                                  >
                                    <div className="font-medium">{ev.field}</div>
                                    <div className="text-muted-foreground">{ev.value}</div>
                                    {ev.timestamp && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        时间戳：{ev.timestamp}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <div className="font-medium mb-2">影响范围：</div>
                              <div className="text-sm text-muted-foreground">
                                影响 {violation.affectedItemIds.length} 个行程项
                              </div>
                            </div>

                            <div>
                              <div className="font-medium mb-2">建议动作：</div>
                              <div className="space-y-2">
                                {violation.level === 'HARD' ? (
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
                                ) : (
                                  <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => {
                                      // 确认已知悉风险
                                      console.log('确认已知悉风险');
                                    }}
                                  >
                                    我已知悉风险
                                  </Button>
                                )}
                              </div>
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

