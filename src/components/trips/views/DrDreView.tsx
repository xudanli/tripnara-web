import { useState } from 'react';
import type { TripDetail, ItineraryItem } from '@/types/trip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Brain, TrendingUp, Clock, DollarSign, Activity, Lock, RefreshCw, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DrDreViewProps {
  trip: TripDetail;
  onItemClick?: (item: ItineraryItem) => void;
}

// 模拟的指标数据（实际应该从后端获取）
interface Metrics {
  timeTotal: number; // 总耗时（分钟）
  bufferTotal: number; // 总缓冲（分钟）
  fatigueScore: number; // 疲劳指数（0-100）
  ascent: number; // 总爬升（米）
  costEstimate: number; // 预计花费
  reliability: number; // 可靠性评分（0-100）
}

interface MetricsByItem {
  [itemId: string]: {
    duration: number;
    buffer: number;
    effort: number; // 体力消耗（0-100）
    cost: number;
    ascent?: number;
    distance?: number;
  };
}

interface Candidate {
  id: string;
  deltaSummary: string;
  metrics: Metrics;
  patchPreview: any;
}

export default function DrDreView({ trip, onItemClick }: DrDreViewProps) {
  const [priorities, setPriorities] = useState({
    time: 50,
    comfort: 50,
    cost: 50,
    experience: 50,
  });
  const [constraints, setConstraints] = useState({
    latestEndTime: false,
    fixedLunch: false,
    maxDailySteps: false,
    avoidNightRoute: false,
  });
  const [lockedItems, setLockedItems] = useState<Set<string>>(new Set());
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);

  // 模拟数据
  const metrics: Metrics = {
    timeTotal: 1440, // 24小时
    bufferTotal: 180, // 3小时
    fatigueScore: 65,
    ascent: 1200,
    costEstimate: 5000,
    reliability: 85,
  };

  const metricsByItem: MetricsByItem = {
    'item-1': {
      duration: 120,
      buffer: 15,
      effort: 40,
      cost: 200,
      distance: 5,
    },
    'item-2': {
      duration: 180,
      buffer: 30,
      effort: 70,
      cost: 150,
      ascent: 500,
    },
    'item-3': {
      duration: 90,
      buffer: 20,
      effort: 30,
      cost: 100,
    },
  };

  const handleLockItem = (itemId: string) => {
    const newLocked = new Set(lockedItems);
    if (newLocked.has(itemId)) {
      newLocked.delete(itemId);
    } else {
      newLocked.add(itemId);
    }
    setLockedItems(newLocked);
  };

  const handleRegenerate = async () => {
    // 模拟生成候选方案
    setShowCandidates(true);
    setCandidates([
      {
        id: 'candidate-1',
        deltaSummary: '优化时间分配，减少等待时间',
        metrics: { ...metrics, timeTotal: 1320, bufferTotal: 150 },
        patchPreview: {},
      },
      {
        id: 'candidate-2',
        deltaSummary: '平衡舒适度与效率',
        metrics: { ...metrics, fatigueScore: 55, bufferTotal: 210 },
        patchPreview: {},
      },
      {
        id: 'candidate-3',
        deltaSummary: '成本优化方案',
        metrics: { ...metrics, costEstimate: 4200, reliability: 80 },
        patchPreview: {},
      },
    ]);
  };

  const getItemMetrics = (itemId: string) => {
    return metricsByItem[itemId] || {
      duration: 0,
      buffer: 0,
      effort: 0,
      cost: 0,
    };
  };

  const isOverThreshold = (value: number, threshold: number) => {
    return value > threshold;
  };

  return (
    <div className="space-y-6">
      {/* 顶部：当日/全程指标条（KPI strip） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-600" />
            全程指标
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">总耗时</div>
              <div className="text-lg font-bold">{Math.floor(metrics.timeTotal / 60)}h</div>
              <div className="text-xs text-muted-foreground">{metrics.timeTotal % 60}m</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">总缓冲</div>
              <div className="text-lg font-bold">{Math.floor(metrics.bufferTotal / 60)}h</div>
              <div className="text-xs text-muted-foreground">{metrics.bufferTotal % 60}m</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">疲劳指数</div>
              <div className="text-lg font-bold">{metrics.fatigueScore}</div>
              <div className="text-xs text-muted-foreground">/100</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">总爬升</div>
              <div className="text-lg font-bold">{metrics.ascent}m</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">预计花费</div>
              <div className="text-lg font-bold">¥{metrics.costEstimate}</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">可靠性</div>
              <div className="text-lg font-bold">{metrics.reliability}</div>
              <div className="text-xs text-muted-foreground">/100</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">总步行</div>
              <div className="text-lg font-bold">12.5km</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-12 gap-6">
        {/* 左侧：时间轴（强调数值） */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
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
                      const itemMetrics = getItemMetrics(item.id);
                      const isLocked = lockedItems.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleLockItem(item.id)}
                              className={isLocked ? 'text-orange-600' : ''}
                            >
                              <Lock className={`w-4 h-4 ${isLocked ? 'fill-current' : ''}`} />
                            </Button>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{item.Place?.nameCN || item.type}</div>
                            {item.note && (
                              <div className="text-sm text-muted-foreground">{item.note}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>
                                {itemMetrics.duration}分
                                {itemMetrics.buffer > 0 && (
                                  <span className="text-muted-foreground ml-1">
                                    (+{itemMetrics.buffer}缓冲)
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Activity className="w-4 h-4 text-muted-foreground" />
                              <span className={isOverThreshold(itemMetrics.effort, 70) ? 'text-red-600 font-medium' : ''}>
                                体力{itemMetrics.effort}
                              </span>
                            </div>
                            {itemMetrics.ascent && (
                              <div className="text-muted-foreground">
                                爬升{itemMetrics.ascent}m
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-muted-foreground" />
                              <span>¥{itemMetrics.cost}</span>
                            </div>
                          </div>
                          {isOverThreshold(itemMetrics.effort, 70) && (
                            <Badge variant="destructive" className="ml-2">
                              超负荷
                            </Badge>
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

        {/* 右侧：What-if 面板 */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-orange-600" />
                What-if 调参
              </CardTitle>
              <CardDescription>调整优先级，预览不同方案</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 优先级滑杆 */}
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center justify-between mb-2">
                    <span>时间优先</span>
                    <span className="text-sm text-muted-foreground">{priorities.time}%</span>
                  </Label>
                  <Slider
                    value={[priorities.time]}
                    onValueChange={([value]) =>
                      setPriorities({ ...priorities, time: value })
                    }
                    max={100}
                    step={5}
                  />
                </div>
                <div>
                  <Label className="flex items-center justify-between mb-2">
                    <span>舒适优先</span>
                    <span className="text-sm text-muted-foreground">{priorities.comfort}%</span>
                  </Label>
                  <Slider
                    value={[priorities.comfort]}
                    onValueChange={([value]) =>
                      setPriorities({ ...priorities, comfort: value })
                    }
                    max={100}
                    step={5}
                  />
                </div>
                <div>
                  <Label className="flex items-center justify-between mb-2">
                    <span>成本优先</span>
                    <span className="text-sm text-muted-foreground">{priorities.cost}%</span>
                  </Label>
                  <Slider
                    value={[priorities.cost]}
                    onValueChange={([value]) =>
                      setPriorities({ ...priorities, cost: value })
                    }
                    max={100}
                    step={5}
                  />
                </div>
                <div>
                  <Label className="flex items-center justify-between mb-2">
                    <span>体验密度</span>
                    <span className="text-sm text-muted-foreground">{priorities.experience}%</span>
                  </Label>
                  <Slider
                    value={[priorities.experience]}
                    onValueChange={([value]) =>
                      setPriorities({ ...priorities, experience: value })
                    }
                    max={100}
                    step={5}
                  />
                </div>
              </div>

              {/* 约束开关 */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label htmlFor="latest-end-time">最晚结束时间</Label>
                  <Switch
                    id="latest-end-time"
                    checked={constraints.latestEndTime}
                    onCheckedChange={(checked) =>
                      setConstraints({ ...constraints, latestEndTime: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="fixed-lunch">午餐固定</Label>
                  <Switch
                    id="fixed-lunch"
                    checked={constraints.fixedLunch}
                    onCheckedChange={(checked) =>
                      setConstraints({ ...constraints, fixedLunch: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="max-daily-steps">每天最大步数</Label>
                  <Switch
                    id="max-daily-steps"
                    checked={constraints.maxDailySteps}
                    onCheckedChange={(checked) =>
                      setConstraints({ ...constraints, maxDailySteps: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="avoid-night-route">避开夜路</Label>
                  <Switch
                    id="avoid-night-route"
                    checked={constraints.avoidNightRoute}
                    onCheckedChange={(checked) =>
                      setConstraints({ ...constraints, avoidNightRoute: checked })
                    }
                  />
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="space-y-2 pt-4 border-t">
                <Button className="w-full" onClick={handleRegenerate}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  一键重新排程
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setShowCandidates(true)}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  生成对比方案
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 锁定项提示 */}
          {lockedItems.size > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="text-sm">
                  <div className="font-medium mb-2">已锁定 {lockedItems.size} 项</div>
                  <div className="text-muted-foreground">
                    重新排程时将保持这些项不变，其他项围绕它们调整
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 候选方案对比（弹窗或展开区域） */}
      {showCandidates && candidates.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>对比方案</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCandidates(false)}>
                关闭
              </Button>
            </div>
            <CardDescription>选择最适合的方案，点击"应用"写入行程</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {candidates.map((candidate) => (
                <Card key={candidate.id} className="cursor-pointer hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">{candidate.deltaSummary}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-1">
                      <div>总耗时: {Math.floor(candidate.metrics.timeTotal / 60)}h</div>
                      <div>缓冲: {Math.floor(candidate.metrics.bufferTotal / 60)}h</div>
                      <div>疲劳: {candidate.metrics.fatigueScore}</div>
                      <div>花费: ¥{candidate.metrics.costEstimate}</div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        // 预览方案
                        console.log('预览方案', candidate.id);
                      }}
                    >
                      预览
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCandidates(false)}>
                取消
              </Button>
              <Button
                onClick={() => {
                  // 应用选中的方案
                  console.log('应用方案');
                  setShowCandidates(false);
                }}
              >
                应用方案
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

