import { useState } from 'react';
import type { TripDetail, ItineraryItem } from '@/types/trip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, AlertCircle, CheckCircle2, Info, ArrowRight, RefreshCw, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface NeptuneViewProps {
  trip: TripDetail;
  onItemClick?: (item: ItineraryItem) => void;
}

// 模拟的修复数据（实际应该从后端获取）
interface Repair {
  id: string;
  type: 'REPLACE' | 'SKIP' | 'RESCHEDULE' | 'ADD_BUFFER';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  targetItemId: string;
  patchOps: Array<{ op: string; path: string; value?: any }>;
  beforeMetrics: {
    time: number;
    distance: number;
    effort: number;
    cost: number;
    risk: string;
  };
  afterMetrics: {
    time: number;
    distance: number;
    effort: number;
    cost: number;
    risk: string;
  };
  confidence: number;
  description: string;
}

interface Alternative {
  placeId: number;
  placeName: string;
  reasonFit: string;
  delta: {
    time: number;
    distance: number;
    cost: number;
  };
  bookingInfo?: string;
}

export default function NeptuneView({ trip, onItemClick }: NeptuneViewProps) {
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(null);
  const [alternativesSheetOpen, setAlternativesSheetOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [patchSheetOpen, setPatchSheetOpen] = useState(false);

  // 模拟数据
  const repairs: Repair[] = [
    {
      id: 'repair-1',
      type: 'REPLACE',
      severity: 'CRITICAL',
      targetItemId: 'item-2',
      patchOps: [
        { op: 'replace', path: '/items/1/placeId', value: 123 },
        { op: 'replace', path: '/items/1/startTime', value: '2024-01-16T10:00:00Z' },
      ],
      beforeMetrics: {
        time: 180,
        distance: 8,
        effort: 70,
        cost: 150,
        risk: '高',
      },
      afterMetrics: {
        time: 150,
        distance: 6,
        effort: 50,
        cost: 120,
        risk: '中',
      },
      confidence: 0.9,
      description: 'Day 2 的徒步路段因天气原因不可行，建议替换为备选路线',
    },
    {
      id: 'repair-2',
      type: 'ADD_BUFFER',
      severity: 'WARNING',
      targetItemId: 'item-1',
      patchOps: [{ op: 'add', path: '/items/0/buffer', value: 30 }],
      beforeMetrics: {
        time: 120,
        distance: 5,
        effort: 40,
        cost: 200,
        risk: '中',
      },
      afterMetrics: {
        time: 150,
        distance: 5,
        effort: 40,
        cost: 200,
        risk: '低',
      },
      confidence: 0.85,
      description: '建议增加缓冲时间，避免延误连锁反应',
    },
  ];

  const alternatives: { [itemId: string]: Alternative[] } = {
    'item-2': [
      {
        placeId: 123,
        placeName: '备选路线 A',
        reasonFit: '距离相近，难度较低，天气适应性好',
        delta: { time: -30, distance: -2, cost: -30 },
        bookingInfo: '无需预订',
      },
      {
        placeId: 124,
        placeName: '备选路线 B',
        reasonFit: '体验相似，但更安全',
        delta: { time: 0, distance: 0, cost: 0 },
        bookingInfo: '需提前1天预订',
      },
    ],
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'WARNING':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'INFO':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'WARNING':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'INFO':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return '';
    }
  };

  const getItemRepairs = (itemId: string) => {
    return repairs.filter((r) => r.targetItemId === itemId);
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
    // 一键止血：应用所有硬红线修复
    const criticalRepairs = repairs.filter((r) => r.severity === 'CRITICAL');
    if (criticalRepairs.length > 0) {
      setSelectedRepair(criticalRepairs[0]);
      setPatchSheetOpen(true);
    }
  };

  const handleApplyRepair = (repair: Repair, scope: 'all' | 'today' | 'save') => {
    // 应用修复
    console.log('应用修复', repair.id, scope);
    setPatchSheetOpen(false);
    setSelectedRepair(null);
  };

  return (
    <div className="space-y-6">
      {/* 顶部：修复队列（Fix Queue） */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-green-600" />
              修复队列
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleQuickFix}>
              <RefreshCw className="w-4 h-4 mr-2" />
              一键止血
            </Button>
          </div>
          <CardDescription>按紧急度排序的修复建议</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {repairs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-600" />
              <div>暂无需要修复的问题</div>
            </div>
          ) : (
            repairs.map((repair) => (
              <div
                key={repair.id}
                className={`p-4 border rounded-lg cursor-pointer hover:shadow-md ${getSeverityColor(
                  repair.severity
                )}`}
                onClick={() => {
                  setSelectedRepair(repair);
                  setPatchSheetOpen(true);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getSeverityIcon(repair.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            repair.severity === 'CRITICAL'
                              ? 'destructive'
                              : repair.severity === 'WARNING'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {repair.severity === 'CRITICAL'
                            ? '必须修'
                            : repair.severity === 'WARNING'
                            ? '建议修'
                            : '可优化'}
                        </Badge>
                        <span className="font-medium">{repair.description}</span>
                      </div>
                      <div className="text-sm mt-2">
                        <span className="font-medium">改哪里：</span>
                        {repair.type === 'REPLACE'
                          ? '替换行程项'
                          : repair.type === 'SKIP'
                          ? '跳过行程项'
                          : repair.type === 'RESCHEDULE'
                          ? '调整时间'
                          : '增加缓冲'}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">代价：</span>
                        {repair.afterMetrics.time - repair.beforeMetrics.time > 0
                          ? `+${repair.afterMetrics.time - repair.beforeMetrics.time}分钟`
                          : `${repair.afterMetrics.time - repair.beforeMetrics.time}分钟`}
                        {repair.afterMetrics.cost - repair.beforeMetrics.cost !== 0 && (
                          <span className="ml-2">
                            {repair.afterMetrics.cost - repair.beforeMetrics.cost > 0 ? '+' : ''}
                            ¥{repair.afterMetrics.cost - repair.beforeMetrics.cost}
                          </span>
                        )}
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
                <div className="py-8 text-center text-muted-foreground">该日暂无安排</div>
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
                              锁定
                            </Badge>
                          ) : isReplaceable ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              可替换
                            </Badge>
                          ) : isSkippable ? (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                              可跳过
                            </Badge>
                          ) : (
                            <Badge variant="outline">必须保留</Badge>
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
                                  variant={
                                    repair.severity === 'CRITICAL'
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {repair.severity === 'CRITICAL' ? '需修复' : '建议修复'}
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
                            查看替代
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
              <Wrench className="w-5 h-5 text-green-600" />
              替代候选
            </SheetTitle>
            <SheetDescription>
              {selectedItem?.Place?.nameCN || selectedItem?.type} 的替代方案
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {selectedItem && (
              <>
                {getItemAlternatives(selectedItem.id).length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-muted-foreground py-8">
                        暂无替代方案
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  getItemAlternatives(selectedItem.id).map((alt, idx) => (
                    <Card key={idx} className="cursor-pointer hover:shadow-md">
                      <CardHeader>
                        <CardTitle className="text-lg">{alt.placeName}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="font-medium mb-1">为什么适合：</div>
                          <div className="text-sm text-muted-foreground">{alt.reasonFit}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <div className="text-muted-foreground">时间变化</div>
                            <div
                              className={
                                alt.delta.time > 0
                                  ? 'text-red-600'
                                  : alt.delta.time < 0
                                  ? 'text-green-600'
                                  : ''
                              }
                            >
                              {alt.delta.time > 0 ? '+' : ''}
                              {alt.delta.time}分钟
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">距离变化</div>
                            <div
                              className={
                                alt.delta.distance > 0
                                  ? 'text-red-600'
                                  : alt.delta.distance < 0
                                  ? 'text-green-600'
                                  : ''
                              }
                            >
                              {alt.delta.distance > 0 ? '+' : ''}
                              {alt.delta.distance}km
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">成本变化</div>
                            <div
                              className={
                                alt.delta.cost > 0
                                  ? 'text-red-600'
                                  : alt.delta.cost < 0
                                  ? 'text-green-600'
                                  : ''
                              }
                            >
                              {alt.delta.cost > 0 ? '+' : ''}¥{alt.delta.cost}
                            </div>
                          </div>
                        </div>
                        {alt.bookingInfo && (
                          <div className="text-sm">
                            <span className="font-medium">预订信息：</span>
                            {alt.bookingInfo}
                          </div>
                        )}
                        <Button
                          className="w-full"
                          onClick={() => {
                            // 应用替代
                            console.log('应用替代', alt.placeId);
                            setAlternativesSheetOpen(false);
                          }}
                        >
                          应用此替代
                        </Button>
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
              <Wrench className="w-5 h-5 text-green-600" />
              修复详情
            </SheetTitle>
            <SheetDescription>Before / After 对比</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {selectedRepair && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{selectedRepair.description}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Before / After 对比 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="font-medium mb-2 text-red-600">Before</div>
                        <div className="space-y-2 text-sm">
                          <div>时间: {selectedRepair.beforeMetrics.time}分钟</div>
                          <div>距离: {selectedRepair.beforeMetrics.distance}km</div>
                          <div>体力: {selectedRepair.beforeMetrics.effort}</div>
                          <div>花费: ¥{selectedRepair.beforeMetrics.cost}</div>
                          <div>风险: {selectedRepair.beforeMetrics.risk}</div>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium mb-2 text-green-600">After</div>
                        <div className="space-y-2 text-sm">
                          <div>
                            时间:{' '}
                            <span
                              className={
                                selectedRepair.afterMetrics.time -
                                  selectedRepair.beforeMetrics.time >
                                0
                                  ? 'text-red-600'
                                  : 'text-green-600'
                              }
                            >
                              {selectedRepair.afterMetrics.time}分钟
                              {selectedRepair.afterMetrics.time -
                                selectedRepair.beforeMetrics.time !==
                              0 && (
                                <span>
                                  (
                                  {selectedRepair.afterMetrics.time -
                                    selectedRepair.beforeMetrics.time >
                                  0
                                    ? '+'
                                    : ''}
                                  {selectedRepair.afterMetrics.time -
                                    selectedRepair.beforeMetrics.time}
                                  分钟)
                                </span>
                              )}
                            </span>
                          </div>
                          <div>
                            距离:{' '}
                            <span
                              className={
                                selectedRepair.afterMetrics.distance -
                                  selectedRepair.beforeMetrics.distance >
                                0
                                  ? 'text-red-600'
                                  : 'text-green-600'
                              }
                            >
                              {selectedRepair.afterMetrics.distance}km
                            </span>
                          </div>
                          <div>体力: {selectedRepair.afterMetrics.effort}</div>
                          <div>花费: ¥{selectedRepair.afterMetrics.cost}</div>
                          <div>风险: {selectedRepair.afterMetrics.risk}</div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="text-sm text-muted-foreground mb-2">
                        置信度: {Math.round(selectedRepair.confidence * 100)}%
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 操作按钮 */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleApplyRepair(selectedRepair, 'today')}
                  >
                    仅应用到今天
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleApplyRepair(selectedRepair, 'save')}
                  >
                    保存为备选方案
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleApplyRepair(selectedRepair, 'all')}
                  >
                    应用修复
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

