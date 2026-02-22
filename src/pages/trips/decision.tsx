import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { decisionAdapter } from '@/api/decision-adapter';
import { tripsApi } from '@/api/trips';
import { routeDirectionsApi } from '@/api/route-directions';
import type {
  ValidateSafetyResponse,
  AdjustPacingResponse,
  ReplaceNodesResponse,
  RoutePlanDraft,
  WorldModelContext,
} from '@/types/strategy';
import type { TripDetail } from '@/types/trip';
import type { RouteDirection } from '@/types/places-routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Shield,
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

export default function DecisionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [routeDirection, setRouteDirection] = useState<RouteDirection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 决策结果
  const [safetyResult, setSafetyResult] = useState<ValidateSafetyResponse['data'] | null>(null);
  const [pacingResult, setPacingResult] = useState<AdjustPacingResponse['data'] | null>(null);
  const [replaceResult, setReplaceResult] = useState<ReplaceNodesResponse['data'] | null>(null);

  const [currentStep, setCurrentStep] = useState<'safety' | 'pacing' | 'replace'>('safety');
  
  // 路线方向ID（从URL参数或行程中获取）
  const routeDirectionId = searchParams.get('routeDirectionId');

  useEffect(() => {
    if (tripId) {
      loadTrip();
    }
  }, [tripId]);

  useEffect(() => {
    if (routeDirectionId) {
      loadRouteDirection();
    }
  }, [routeDirectionId]);

  const loadTrip = async () => {
    if (!tripId) return;
    try {
      const data = await tripsApi.getById(tripId);
      setTrip(data);
    } catch (err: any) {
      setError(err.message || '加载行程失败');
      console.error('Failed to load trip:', err);
    }
  };

  const loadRouteDirection = async () => {
    if (!routeDirectionId) return;
    try {
      const data = await routeDirectionsApi.getById(Number(routeDirectionId));
      setRouteDirection(data);
    } catch (err: any) {
      console.error('Failed to load route direction:', err);
      // 路线方向加载失败不影响主流程
    }
  };

  const buildRoutePlan = (): RoutePlanDraft | null => {
    if (!trip || !tripId) return null;
    if (!routeDirectionId && !routeDirection) {
      setError('请提供路线方向ID');
      return null;
    }

    const segments: RoutePlanDraft['segments'] = [];
    trip.TripDay.forEach((day, dayIndex) => {
      day.ItineraryItem.forEach((item, index) => {
        if (item.Place && index > 0) {
          const prevItem = day.ItineraryItem[index - 1];
          if (prevItem.Place) {
            // 计算距离和爬升（示例，实际应从API获取或计算）
            const fromLat = prevItem.Place.metadata?.location?.lat || 0;
            const fromLng = prevItem.Place.metadata?.location?.lng || 0;
            const toLat = item.Place.metadata?.location?.lat || 0;
            const toLng = item.Place.metadata?.location?.lng || 0;
            
            // 简单的距离计算（Haversine公式的简化版本）
            const distanceKm = calculateDistance(fromLat, fromLng, toLat, toLng);
            
            segments.push({
              segmentId: `seg-${day.id}-${index}`,
              dayIndex: dayIndex,
              distanceKm: distanceKm,
              ascentM: 0, // 需要从DEM数据获取
              slopePct: 0, // 需要从DEM数据获取
              metadata: {
                fromPlaceId: String(prevItem.Place.id),
                toPlaceId: String(item.Place.id),
              },
            });
          }
        }
      });
    });

    return {
      tripId,
      routeDirectionId: routeDirectionId || String(routeDirection?.id || ''),
      segments,
    };
  };

  // 计算两点间距离（公里）- Haversine公式
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // 地球半径（公里）
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const buildWorldContext = (): WorldModelContext | null => {
    if (!trip || !routeDirection) {
      return null;
    }

    // 获取国家代码和月份
    const countryCode = trip.destination || 'IS'; // 默认冰岛
    const startDate = new Date(trip.startDate);
    const month = startDate.getMonth() + 1; // 1-12

    // 构建世界模型上下文（三段式结构）
    return {
      // 必须：物理现实模型
      physical: {
        demEvidence: [], // 需要从API获取DEM数据
        roadStates: [],
        hazardZones: [],
        ferryStates: [],
        countryCode,
        month,
      },
      // 必须：人体能力模型
      human: {
        maxDailyAscentM: 1000, // 默认值，应从用户偏好获取
        rollingAscent3DaysM: 2000,
        maxSlopePct: 20,
        weatherRiskWeight: 0.5,
        bufferDayBias: 'MEDIUM',
        riskTolerance: 'MEDIUM',
      },
      // 必须：路线方向
      routeDirection: {
        ...routeDirection,
        id: String(routeDirection.id), // 确保id是string类型
      },
      // 可选：合规证据
      complianceEvidence: [],
    };
  };

  const handleValidateSafety = async () => {
    if (!tripId) {
      setError('请提供行程ID');
      return;
    }

    const plan = buildRoutePlan();
    if (!plan) {
      setError('无法构建路线计划，请确保已选择路线方向');
      return;
    }

    const worldContext = buildWorldContext();
    if (!worldContext) {
      setError('无法构建世界模型上下文，请确保已加载路线方向');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await decisionAdapter.validateSafety({
        tripId: tripId || undefined,
        plan,
        worldContext,
      });
      setSafetyResult(result);
      setCurrentStep('pacing');
    } catch (err: any) {
      setError(err.message || '安全校验失败');
      console.error('Safety validation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustPacing = async () => {
    if (!tripId || !safetyResult?.allowed) {
      setError('请先通过安全校验');
      return;
    }

    const plan = buildRoutePlan();
    if (!plan) {
      setError('无法构建路线计划');
      return;
    }

    const worldContext = buildWorldContext();
    if (!worldContext) {
      setError('无法构建世界模型上下文');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (!tripId) {
        setError('请提供行程ID');
        return;
      }
      const result = await decisionAdapter.adjustPacing({
        tripId,
        plan,
        worldContext,
      });
      setPacingResult(result);
      setCurrentStep('replace');
    } catch (err: any) {
      setError(err.message || '节奏调整失败');
      console.error('Pacing adjustment error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReplaceNodes = async () => {
    if (!tripId) {
      setError('请提供行程ID');
      return;
    }

    const plan = buildRoutePlan();
    if (!plan) {
      setError('无法构建路线计划');
      return;
    }

    const worldContext = buildWorldContext();
    if (!worldContext) {
      setError('无法构建世界模型上下文');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (!tripId) {
        setError('请提供行程ID');
        return;
      }
      const result = await decisionAdapter.replaceNodes({
        tripId,
        plan,
        worldContext,
        unavailableNodes: [], // 实际应从用户输入或系统检测获取
      });
      setReplaceResult(result);
    } catch (err: any) {
      setError(err.message || '节点替换失败');
      console.error('Node replacement error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAll = async () => {
    await handleValidateSafety();
    if (safetyResult?.allowed) {
      await handleAdjustPacing();
      await handleReplaceNodes();
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <div>
          <h1 className="text-3xl font-bold">决策引擎</h1>
          <p className="text-muted-foreground mt-1">三人格系统：安全校验 → 节奏调整 → 节点替换</p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* 路线方向选择 */}
      {!routeDirection && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-yellow-800 mb-4">
              请先选择路线方向。可以通过URL参数 routeDirectionId 提供，或从行程中获取。
            </p>
            {trip && (
              <div className="text-sm text-muted-foreground">
                行程目的地: {trip.destination}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      <Card>
        <CardHeader>
          <CardTitle>执行决策流程</CardTitle>
          <CardDescription>按顺序执行三人格系统的决策</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={handleValidateSafety}
              disabled={loading || !tripId || !routeDirection}
            >
              {loading && currentStep === 'safety' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              Abu: 安全校验
            </Button>
            <Button
              onClick={handleAdjustPacing}
              disabled={loading || !safetyResult?.allowed || !routeDirection}
              variant="outline"
            >
              {loading && currentStep === 'pacing' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Activity className="w-4 h-4 mr-2" />
              )}
              Dr.Dre: 节奏调整
            </Button>
            <Button
              onClick={handleReplaceNodes}
              disabled={loading || !routeDirection}
              variant="outline"
            >
              {loading && currentStep === 'replace' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Neptune: 节点替换
            </Button>
            <Button
              onClick={handleRunAll}
              disabled={loading || !tripId || !routeDirection}
              variant="default"
            >
              <Loader2 className="w-4 h-4 mr-2" />
              一键执行全部
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 决策结果 */}
      <Tabs value={currentStep} onValueChange={(v) => setCurrentStep(v as any)}>
        <TabsList>
          <TabsTrigger value="safety">安全校验</TabsTrigger>
          <TabsTrigger value="pacing" disabled={!safetyResult}>节奏调整</TabsTrigger>
          <TabsTrigger value="replace" disabled={!pacingResult}>节点替换</TabsTrigger>
        </TabsList>

        {/* Abu: 安全校验结果 */}
        <TabsContent value="safety" className="space-y-4">
          {safetyResult ? (
            <>
              <Card className={safetyResult.allowed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {safetyResult.allowed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    Abu 安全校验结果
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={safetyResult.allowed ? 'default' : 'destructive'}>
                        {safetyResult.allowed ? '通过' : '未通过'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{safetyResult.message}</span>
                    </div>

                    {safetyResult.violations.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">违规项</h3>
                        <div className="space-y-2">
                          {safetyResult.violations.map((violation, idx) => (
                            <div key={idx} className="p-3 border rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                <span className="font-medium">
                                  {violation.explanation || violation.reason || '违规项'}
                                </span>
                                {violation.violation && (
                                  <Badge variant={violation.violation === 'HARD' ? 'destructive' : 'secondary'}>
                                    {violation.violation}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {violation.segmentId && <>路段: {violation.segmentId}</>}
                                {violation.evidence?.type && (
                                  <> · 证据类型: {violation.evidence.type}</>
                                )}
                                {violation.evidence?.segmentId && (
                                  <> · 路段: {violation.evidence.segmentId}</>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 决策日志（Skills 架构） */}
                    {safetyResult.decisionLog && safetyResult.decisionLog.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">决策日志</h3>
                        <div className="space-y-2">
                          {safetyResult.decisionLog.map((log, idx) => (
                            <div key={idx} className="p-3 border rounded-lg bg-gray-50">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{log.persona}</Badge>
                                <Badge variant={log.action === 'ALLOW' ? 'default' : 'destructive'}>
                                  {log.action}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(log.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <div className="text-sm">{log.explanation}</div>
                              {log.reasonCodes && log.reasonCodes.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {log.reasonCodes.map((code, codeIdx) => (
                                    <Badge key={codeIdx} variant="outline" className="text-xs">
                                      {code}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {safetyResult.alternativeRoutes && safetyResult.alternativeRoutes.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">备选路线</h3>
                        <div className="space-y-2">
                          {safetyResult.alternativeRoutes.map((route, idx) => (
                            <Card key={idx}>
                              <CardContent className="p-4">
                                <div className="font-medium mb-1">{route.description}</div>
                                <div className="text-sm text-muted-foreground">{route.reason}</div>
                                <Button size="sm" className="mt-2" variant="outline">
                                  查看详情
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>点击"Abu: 安全校验"按钮开始校验</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Dr.Dre: 节奏调整结果 */}
        <TabsContent value="pacing" className="space-y-4">
          {pacingResult ? (
            <Card className={pacingResult.success ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Dr.Dre 节奏调整结果
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={pacingResult.success ? 'default' : 'secondary'}>
                      {pacingResult.success ? '调整成功' : '无需调整'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{pacingResult.message}</span>
                  </div>

                  {pacingResult.changes.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">变更说明</h3>
                      <div className="space-y-2">
                        {pacingResult.changes.map((change, idx) => (
                          <div key={idx} className="p-3 border rounded-lg">
                            <div className="font-medium mb-1">
                              {change.explanation || change.reason || '节奏调整'}
                            </div>
                            {change.changes && change.changes.length > 0 && (
                              <div className="space-y-1 mt-2">
                                {change.changes.map((c, cIdx) => (
                                  <div key={cIdx} className="text-sm text-muted-foreground">
                                    • 第 {c.dayIndex + 1} 天: {c.originalDuration}分钟 → {c.adjustedDuration}分钟
                                    {c.insertedBreaks && c.insertedBreaks > 0 && (
                                      <> (插入 {c.insertedBreaks} 次休息)</>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 决策日志（Skills 架构） */}
                  {pacingResult.decisionLog && pacingResult.decisionLog.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">决策日志</h3>
                      <div className="space-y-2">
                        {pacingResult.decisionLog.map((log, idx) => (
                          <div key={idx} className="p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{log.persona}</Badge>
                              <Badge variant={log.action === 'ALLOW' ? 'default' : 'destructive'}>
                                {log.action}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-sm">{log.explanation}</div>
                            {log.reasonCodes && log.reasonCodes.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {log.reasonCodes.map((code, codeIdx) => (
                                  <Badge key={codeIdx} variant="outline" className="text-xs">
                                    {code}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>请先通过安全校验</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Neptune: 节点替换结果 */}
        <TabsContent value="replace" className="space-y-4">
          {replaceResult ? (
            <Card className={replaceResult.success ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Neptune 节点替换结果
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={replaceResult.success ? 'default' : 'secondary'}>
                      {replaceResult.success ? '替换成功' : '无需替换'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{replaceResult.message}</span>
                  </div>

                  {replaceResult.replacements.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">替换说明</h3>
                      <div className="space-y-2">
                        {replaceResult.replacements.map((replacement, idx) => (
                          <div key={idx} className="p-3 border rounded-lg">
                            <div className="font-medium mb-1">
                              {replacement.explanation || replacement.reason || '节点替换'}
                            </div>
                            <div className="text-sm text-muted-foreground mt-2">
                              <div>
                                <span className="font-medium">原节点:</span> {replacement.originalNodeId}
                              </div>
                              <div>
                                <span className="font-medium">替换为:</span> {replacement.replacementNodeId}
                              </div>
                              {replacement.reason && (
                                <div className="mt-1">
                                  <span className="font-medium">原因:</span> {replacement.reason}
                                </div>
                              )}
                              {replacement.validation && (
                                <div className="mt-2 p-2 bg-gray-50 rounded">
                                  <div className="text-xs font-medium mb-1">验证结果:</div>
                                  <Badge variant={replacement.validation.safetyCheck === 'PASS' ? 'default' : 'destructive'}>
                                    {replacement.validation.safetyCheck}
                                  </Badge>
                                  {replacement.validation.elevationChange !== undefined && (
                                    <span className="text-xs ml-2">
                                      海拔变化: {replacement.validation.elevationChange}m
                                    </span>
                                  )}
                                  {replacement.validation.distanceChange !== undefined && (
                                    <span className="text-xs ml-2">
                                      距离变化: {replacement.validation.distanceChange}km
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 决策日志（Skills 架构） */}
                  {replaceResult.decisionLog && replaceResult.decisionLog.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">决策日志</h3>
                      <div className="space-y-2">
                        {replaceResult.decisionLog.map((log, idx) => (
                          <div key={idx} className="p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{log.persona}</Badge>
                              <Badge variant={log.action === 'ALLOW' ? 'default' : 'destructive'}>
                                {log.action}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-sm">{log.explanation}</div>
                            {log.reasonCodes && log.reasonCodes.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {log.reasonCodes.map((code, codeIdx) => (
                                  <Badge key={codeIdx} variant="outline" className="text-xs">
                                    {code}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>点击"Neptune: 节点替换"按钮开始替换</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

