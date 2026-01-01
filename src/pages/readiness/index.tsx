import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import { readinessApi } from '@/api/readiness';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Share2, 
  Download, 
  Eye,
  RefreshCw,
  Play,
  Wrench,
  Calendar,
  MapPin,
  MoreVertical,
} from 'lucide-react';
import { format } from 'date-fns';
import type { TripDetail } from '@/types/trip';
import type { ReadinessData, RepairOption, EvidenceItem, Blocker } from '@/types/readiness';
import ReadinessStatusBadge from '@/components/readiness/ReadinessStatusBadge';
import ScoreGauge from '@/components/readiness/ScoreGauge';
import BlockerCard from '@/components/readiness/BlockerCard';
import RepairOptionCard from '@/components/readiness/RepairOptionCard';
import BreakdownBarList from '@/components/readiness/BreakdownBarList';
import EvidenceListItem from '@/components/readiness/EvidenceListItem';
import CoverageMiniMap from '@/components/readiness/CoverageMiniMap';

export default function ReadinessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tripId = searchParams.get('tripId');
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [readinessData, setReadinessData] = useState<ReadinessData | null>(null);
  const [selectedBlockerId, setSelectedBlockerId] = useState<string | null>(null);
  const [selectedRepairOptionId, setSelectedRepairOptionId] = useState<string | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [showAllBlockers, setShowAllBlockers] = useState(false);
  const [refreshingEvidence, setRefreshingEvidence] = useState(false);
  const [capabilityPacks, setCapabilityPacks] = useState<any[]>([]);
  const [evaluatedPacks, setEvaluatedPacks] = useState<any[]>([]);
  const [loadingCapabilityPacks, setLoadingCapabilityPacks] = useState(false);

  useEffect(() => {
    if (tripId) {
      loadData();
    } else {
      // 如果没有 tripId，尝试获取最近的 trip
      loadRecentTrip();
    }
  }, [tripId]);

  const loadRecentTrip = async () => {
    try {
      setLoading(true);
      const trips = await tripsApi.getAll();
      if (trips && trips.length > 0) {
        // 获取最近编辑的 trip
        const sortedTrips = [...trips].sort((a, b) => {
          const aTime = new Date(a.updatedAt || a.createdAt).getTime();
          const bTime = new Date(b.updatedAt || b.createdAt).getTime();
          return bTime - aTime;
        });
        const recentTripId = sortedTrips[0].id;
        // 更新 URL 并加载数据
        navigate(`/dashboard/readiness?tripId=${recentTripId}`, { replace: true });
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load recent trip:', err);
      setLoading(false);
    }
  };

  // 从 trip 数据构建 CheckReadinessDto
  const buildCheckReadinessDto = (trip: TripDetail): any => {
    return {
      destinationId: trip.destination || '',
      trip: {
        startDate: trip.startDate,
        endDate: trip.endDate,
      },
      itinerary: {
        countries: [trip.destination].filter(Boolean),
        // TODO: 从 trip 数据中提取更多信息（activities, season, region 等）
      },
    };
  };

  // 加载能力包信息
  const loadCapabilityPacks = async (trip: TripDetail) => {
    try {
      setLoadingCapabilityPacks(true);
      // 并行加载能力包列表和评估结果
      const [packsResponse, evaluateResponse] = await Promise.all([
        readinessApi.getCapabilityPacks().catch(() => null),
        readinessApi.evaluateCapabilityPacks(buildCheckReadinessDto(trip)).catch(() => null),
      ]);

      if (packsResponse) {
        setCapabilityPacks(packsResponse.packs || []);
      }

      if (evaluateResponse) {
        setEvaluatedPacks(evaluateResponse.results || []);
      }
    } catch (err) {
      console.error('Failed to load capability packs:', err);
    } finally {
      setLoadingCapabilityPacks(false);
    }
  };

  const loadData = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      // 并行加载 trip 和 readiness 数据
      const [tripData, readinessData] = await Promise.all([
        tripsApi.getById(tripId),
        readinessApi.getTripReadiness(tripId).catch(() => {
          // 如果后端还没有实现 /readiness/trip/:tripId，则使用备用方案
          return null;
        }),
      ]);
      
      setTrip(tripData);
      
      // 加载能力包信息（不阻塞主流程）
      loadCapabilityPacks(tripData);
      
      if (readinessData) {
        setReadinessData(readinessData);
      } else {
        // 备用方案1：尝试使用 check 接口
        try {
          const checkResult = await readinessApi.check(buildCheckReadinessDto(tripData));
          // 将 check 结果转换为 ReadinessData
          setReadinessData(convertCheckResultToReadinessData(checkResult, tripData));
        } catch (checkErr) {
          // 备用方案2：使用个性化清单和风险预警构建 ReadinessData
          const [checklist, riskWarnings] = await Promise.all([
            readinessApi.getPersonalizedChecklist(tripId).catch(() => null),
            readinessApi.getRiskWarnings(tripId).catch(() => null),
          ]);
          
          if (checklist || riskWarnings) {
            setReadinessData(convertToReadinessData(checklist, riskWarnings, tripData));
          } else {
            // 如果所有 API 都失败，使用模拟数据
            setReadinessData(generateMockReadinessData());
          }
        }
      }
    } catch (err) {
      console.error('Failed to load readiness data:', err);
      // 出错时使用模拟数据作为降级方案
      setReadinessData(generateMockReadinessData());
    } finally {
      setLoading(false);
    }
  };

  // 将 check 接口结果转换为 ReadinessData 格式
  const convertCheckResultToReadinessData = (
    checkResult: any,
    trip: TripDetail
  ): ReadinessData => {
    const totalBlockers = checkResult?.summary?.totalBlockers || 0;
    const totalMust = checkResult?.summary?.totalMust || 0;
    const status: ReadinessData['status'] = 
      totalBlockers > 0 ? 'not-ready' : totalMust > 0 ? 'nearly' : 'ready';

    // 从 findings 中提取 blockers
    const blockers: Blocker[] = [];
    checkResult?.findings?.forEach((finding: any) => {
      finding.blockers?.forEach((item: any, index: number) => {
        blockers.push({
          id: `blocker-${finding.category}-${index}`,
          title: item.message,
          severity: 'critical' as const,
          impactScope: trip.destination || 'Unknown',
          evidenceSummary: {
            source: item.evidence || 'system',
            timestamp: new Date().toISOString(),
          },
          category: finding.category === 'entry' ? 'ticket' : 
                   finding.category === 'safety' ? 'road' : 'other' as const,
        });
      });
    });

    // 从 findings 中提取 watchlist（从 should 中提取）
    const watchlist: Blocker[] = [];
    checkResult?.findings?.forEach((finding: any) => {
      finding.should?.slice(0, 2).forEach((item: any, index: number) => {
        watchlist.push({
          id: `watch-${finding.category}-${index}`,
          title: item.message,
          severity: 'medium' as const,
          impactScope: trip.destination || 'Unknown',
          evidenceSummary: {
            source: item.evidence || 'system',
            timestamp: new Date().toISOString(),
          },
          category: 'other' as const,
        });
      });
    });

    // 计算分数
    const riskCount = checkResult?.risks?.length || 0;
    const highRiskCount = checkResult?.risks?.filter((r: any) => r.severity === 'high').length || 0;
    const overallScore = Math.max(0, 100 - (totalBlockers * 20) - (highRiskCount * 10) - (riskCount * 5));

    return {
      status,
      score: {
        overall: overallScore,
        evidenceCoverage: 85,
        scheduleFeasibility: 70,
        transportCertainty: 65,
        safetyRisk: Math.max(0, 100 - (highRiskCount * 20)),
        buffers: 60,
      },
      blockers,
      watchlist: status === 'ready' ? watchlist : undefined,
    };
  };

  // 将 API 响应转换为 ReadinessData 格式
  const convertToReadinessData = (
    checklist: any,
    riskWarnings: any,
    trip: TripDetail
  ): ReadinessData => {
    // 计算总体状态
    const totalBlockers = checklist?.summary?.totalBlockers || 0;
    const totalMust = checklist?.summary?.totalMust || 0;
    const status: ReadinessData['status'] = 
      totalBlockers > 0 ? 'not-ready' : totalMust > 0 ? 'nearly' : 'ready';

    // 转换 blockers
    const blockers: Blocker[] = (checklist?.checklist?.blocker || []).map((item: any, index: number) => ({
      id: `blocker-${index}`,
      title: item.message,
      severity: 'critical' as const,
      impactScope: trip.destination || 'Unknown',
      evidenceSummary: {
        source: item.evidence || 'system',
        timestamp: new Date().toISOString(),
      },
      category: 'other' as const,
    }));

    // 转换 watchlist（从 should/optional 中提取）
    const watchlist: Blocker[] = (checklist?.checklist?.should || []).slice(0, 3).map((item: any, index: number) => ({
      id: `watch-${index}`,
      title: item.message,
      severity: 'medium' as const,
      impactScope: trip.destination || 'Unknown',
      evidenceSummary: {
        source: item.evidence || 'system',
        timestamp: new Date().toISOString(),
      },
      category: 'other' as const,
    }));

    // 计算分数（基于 blockers 和 risks）
    const riskCount = riskWarnings?.summary?.totalRisks || 0;
    const highRiskCount = riskWarnings?.summary?.highSeverity || 0;
    const overallScore = Math.max(0, 100 - (totalBlockers * 20) - (highRiskCount * 10) - (riskCount * 5));

    return {
      status,
      score: {
        overall: overallScore,
        evidenceCoverage: checklist ? 85 : 0,
        scheduleFeasibility: 70,
        transportCertainty: 65,
        safetyRisk: Math.max(0, 100 - (highRiskCount * 20)),
        buffers: 60,
      },
      blockers,
      watchlist: status === 'ready' ? watchlist : undefined,
    };
  };

  // 生成模拟数据（降级方案）
  const generateMockReadinessData = (): ReadinessData => {
    const status = 'nearly' as ReadinessData['status'];
    const isReady = (status as string) === 'ready';
    return {
      status,
      score: {
        overall: 72,
        evidenceCoverage: 85,
        scheduleFeasibility: 70,
        transportCertainty: 65,
        safetyRisk: 80,
        buffers: 60,
      },
      executableWindow: {
        start: '08:30',
        end: '18:00',
      },
      blockers: [
        {
          id: 'blocker-1',
          title: 'Road closed on Segment 2',
          severity: 'critical',
          impactScope: 'Day 1 / Segment 2',
          evidenceSummary: {
            source: 'road.is',
            timestamp: new Date().toISOString(),
          },
          category: 'road',
        },
        {
          id: 'blocker-2',
          title: 'POI missing opening hours',
          severity: 'high',
          impactScope: 'POI #3',
          evidenceSummary: {
            source: 'opening hours',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
          },
          category: 'poi',
        },
        {
          id: 'blocker-3',
          title: 'Weather risk: wind',
          severity: 'medium',
          impactScope: 'Day 2',
          evidenceSummary: {
            source: 'forecast',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
          },
          category: 'weather',
        },
      ],
      watchlist: isReady ? [
        {
          id: 'watch-1',
          title: 'Potential traffic delay',
          severity: 'medium',
          impactScope: 'Day 3',
          evidenceSummary: {
            source: 'traffic.api',
            timestamp: new Date().toISOString(),
          },
          category: 'road',
        },
      ] : undefined,
    };
  };

  const handleFixBlocker = async (blockerId: string) => {
    if (!tripId) return;
    setSelectedBlockerId(blockerId);
    
    try {
      // 调用 API 获取修复方案
      const response = await readinessApi.getRepairOptions(tripId, blockerId);
      const repairOptions = response.options;
      
      setReadinessData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          repairOptions,
          selectedBlockerId: blockerId,
        };
      });

      // 移动端打开 sheet
      if (window.innerWidth < 768) {
        setMobileSheetOpen(true);
      }
    } catch (err) {
      console.error('Failed to load repair options:', err);
      // 降级方案：使用模拟数据
      const mockRepairOptions: RepairOption[] = [
      {
        id: 'repair-1',
        title: '替换 POI',
        description: '使用附近的替代 POI，距离增加 30 分钟',
        changes: {
          time: '+30min',
          distance: '+2km',
          risk: '下降',
        },
        reasonCode: 'REPLACE_POI',
        evidenceLink: '#',
      },
      {
        id: 'repair-2',
        title: '调整出发时间',
        description: '避开风窗，提前 1 小时出发',
        changes: {
          time: '-60min',
          risk: '下降',
        },
        reasonCode: 'ADJUST_TIME',
        evidenceLink: '#',
      },
      {
        id: 'repair-3',
        title: '改走备用路线',
        description: '使用备用路线，距离增加 12km',
        changes: {
          distance: '+12km',
          time: '+45min',
          risk: '下降',
        },
        reasonCode: 'ALTERNATIVE_ROUTE',
        evidenceLink: '#',
      },
    ];
    
    setReadinessData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        repairOptions: mockRepairOptions,
        selectedBlockerId: blockerId,
      };
    });

    // 移动端打开 sheet
    if (window.innerWidth < 768) {
      setMobileSheetOpen(true);
    }
    }
  };

  const handleApplyFix = async (optionId: string) => {
    if (!tripId || !selectedBlockerId) return;
    
    try {
      // 调用 API 应用修复
      await readinessApi.applyRepair(tripId, selectedBlockerId, optionId);
      // 重新加载数据
      await loadData();
      setSelectedBlockerId(null);
      setSelectedRepairOptionId(null);
      setMobileSheetOpen(false);
    } catch (err) {
      console.error('Failed to apply fix:', err);
      // TODO: 显示错误提示
    }
  };

  const handlePreviewFix = (_optionId: string) => {
    if (!tripId) return;
    navigate(`/dashboard/trips/${tripId}?tab=plan&highlight=${selectedBlockerId}`);
  };

  const handleStartExecute = () => {
    if (!tripId) return;
    navigate(`/dashboard/execute?tripId=${tripId}`);
  };

  const handleRunRepair = async () => {
    if (!tripId) return;
    
    try {
      // 调用 Neptune 自动修复
      await readinessApi.autoRepair(tripId);
      // 重新加载数据
      await loadData();
    } catch (err) {
      console.error('Failed to run auto repair:', err);
      // TODO: 显示错误提示
    }
  };

  const handleRefreshAllEvidence = async () => {
    if (!tripId) return;
    
    try {
      setRefreshingEvidence(true);
      await readinessApi.refreshEvidence(tripId);
      // 重新加载数据
      await loadData();
    } catch (err) {
      console.error('Failed to refresh evidence:', err);
      // TODO: 显示错误提示
    } finally {
      setRefreshingEvidence(false);
    }
  };

  const handleRefreshSingleEvidence = async (evidenceId: string) => {
    if (!tripId) return;
    
    try {
      await readinessApi.refreshEvidence(tripId, evidenceId);
      // 重新加载数据
      await loadData();
    } catch (err) {
      console.error('Failed to refresh evidence:', err);
      // TODO: 显示错误提示
    }
  };

  const displayedBlockers = showAllBlockers 
    ? readinessData?.blockers || []
    : (readinessData?.blockers || []).slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!tripId || !trip || !readinessData) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">请先选择一个行程</p>
            <Button onClick={() => navigate('/dashboard/trips')}>
              前往行程库
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isReady = readinessData.status === 'ready';
  const isNearly = readinessData.status === 'nearly';
  const isNotReady = readinessData.status === 'not-ready';

  return (
    <div className="h-full flex flex-col">
      {/* Header 区域 */}
      <div className="border-b bg-background px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* 左侧：Trip 基本信息 */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{trip.destination || 'Untitled Trip'}</h1>
                <Badge variant="outline" className="text-xs">
                  {trip.pacingConfig?.level === 'STEADY' ? 'Steady & Safe' :
                   trip.pacingConfig?.level === 'BALANCED' ? 'Balanced' :
                   trip.pacingConfig?.level === 'EXPLORATORY' ? 'Exploratory' : 'Standard'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(new Date(trip.startDate), 'MMM dd')} - {format(new Date(trip.endDate), 'MMM dd')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>Plan v{trip.pipelineStatus?.stages?.length || 1}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Last updated: {format(new Date(trip.updatedAt || trip.createdAt), 'MMM dd, HH:mm')}
              </div>
            </div>

            {/* 中间：Readiness 状态和分数 */}
            <div className="flex flex-col items-center gap-3">
              <ReadinessStatusBadge status={readinessData.status} size="lg" />
              <ScoreGauge score={readinessData.score.overall} size={100} />
              {readinessData.executableWindow && (
                <div className="text-xs text-muted-foreground text-center">
                  Best window: {readinessData.executableWindow.start}–{readinessData.executableWindow.end}
                </div>
              )}
            </div>

            {/* 右侧：主操作 */}
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              {(isReady || isNearly) ? (
                <Button size="lg" onClick={handleStartExecute} className="w-full sm:w-auto">
                  <Play className="h-4 w-4 mr-2" />
                  Start Execute
                </Button>
              ) : (
                <Button size="lg" onClick={handleRunRepair} className="w-full sm:w-auto">
                  <Wrench className="h-4 w-4 mr-2" />
                  Run Repair
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Eye className="h-4 w-4 mr-2" />
                    View Evidence
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                  {isNotReady && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Force Start (Risky)
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Not Ready 状态下的 Top Blocker 横幅 */}
          {isNotReady && readinessData.blockers.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div className="flex-1">
                  <div className="font-semibold text-red-900">
                    Top Blocker: {readinessData.blockers[0].title}
                  </div>
                  <div className="text-sm text-red-700">
                    {readinessData.blockers[0].impactScope}
                  </div>
                </div>
                <Button size="sm" onClick={() => handleFixBlocker(readinessData.blockers[0].id)}>
                  Fix Now
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Core 区域：Blockers + Repair Preview */}
      <div className="flex-1 overflow-y-auto bg-muted/30">
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左列：Blockers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {isReady ? 'Watchlist' : 'Blockers'}
                </h2>
                {!isReady && readinessData.blockers.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllBlockers(!showAllBlockers)}
                  >
                    {showAllBlockers ? 'Show Top 3' : `View all (${readinessData.blockers.length})`}
                  </Button>
                )}
              </div>

              {isReady && readinessData.watchlist ? (
                <div className="space-y-3">
                  {readinessData.watchlist.map((blocker) => (
                    <BlockerCard
                      key={blocker.id}
                      blocker={blocker}
                      onFix={handleFixBlocker}
                    />
                  ))}
                  {readinessData.watchlist.length === 0 && (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No potential risks identified</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedBlockers.length > 0 ? (
                    displayedBlockers.map((blocker) => (
                      <BlockerCard
                        key={blocker.id}
                        blocker={blocker}
                        onFix={handleFixBlocker}
                      />
                    ))
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No blockers found</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>

            {/* 右列：Repair Preview (桌面端) */}
            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold mb-4">Repair Preview</h2>
              {readinessData.repairOptions && readinessData.repairOptions.length > 0 ? (
                <div className="space-y-3">
                  {readinessData.repairOptions.map((option) => (
                    <RepairOptionCard
                      key={option.id}
                      option={option}
                      isSelected={selectedRepairOptionId === option.id}
                      onSelect={setSelectedRepairOptionId}
                      onApply={handleApplyFix}
                      onPreview={handlePreviewFix}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground mb-2">No fixes needed</p>
                    <p className="text-xs text-muted-foreground">
                      Click "Fix" on a blocker to see repair options
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Details 区域：Tabs */}
          <div className="mt-8">
            <Tabs defaultValue="breakdown" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="breakdown">Readiness Breakdown</TabsTrigger>
                <TabsTrigger value="capability">Capability Packs</TabsTrigger>
                <TabsTrigger value="evidence">Evidence Chain</TabsTrigger>
                <TabsTrigger value="coverage">Coverage Map</TabsTrigger>
              </TabsList>

              <TabsContent value="breakdown" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Score Breakdown</CardTitle>
                    <CardDescription>
                      Detailed breakdown of readiness dimensions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BreakdownBarList
                      score={readinessData.score}
                      onShowBlockers={(dimension) => {
                        // TODO: 过滤并显示该维度的 blockers
                        console.log('Show blockers for:', dimension);
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="capability" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Capability Packs</CardTitle>
                    <CardDescription>
                      System capability packs triggered for this trip
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingCapabilityPacks ? (
                      <div className="flex items-center justify-center py-8">
                        <Spinner className="w-6 h-6" />
                      </div>
                    ) : evaluatedPacks.length > 0 ? (
                      <div className="space-y-4">
                        <div className="text-sm text-muted-foreground mb-4">
                          {evaluatedPacks.filter((p) => p.triggered).length} of {evaluatedPacks.length} packs triggered
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {evaluatedPacks.map((result, index) => {
                            const pack = result.pack;
                            const isTriggered = result.triggered;
                            return (
                              <Card
                                key={index}
                                className={isTriggered ? 'border-primary' : 'opacity-60'}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-sm">{pack.displayName}</h3>
                                        {isTriggered && (
                                          <Badge className="bg-primary text-primary-foreground text-xs">
                                            Triggered
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mb-2">
                                        {pack.description}
                                      </p>
                                      {isTriggered && result.reason && (
                                        <p className="text-xs text-muted-foreground italic">
                                          Reason: {result.reason}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                        {capabilityPacks.length > 0 && (
                          <div className="mt-6 pt-4 border-t">
                            <h4 className="text-sm font-medium mb-3">All Available Packs</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {capabilityPacks.map((pack, index) => (
                                <div
                                  key={index}
                                  className="p-3 border rounded-lg text-sm"
                                >
                                  <div className="font-medium">{pack.displayName}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {pack.description}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">No capability packs available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="evidence" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Evidence Chain</CardTitle>
                        <CardDescription>
                          All evidence sources and their coverage
                        </CardDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleRefreshAllEvidence}
                        disabled={refreshingEvidence}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshingEvidence ? 'animate-spin' : ''}`} />
                        Refresh All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* 按类别分组显示证据 */}
                      {(['road', 'weather', 'poi', 'ticket', 'lodging'] as const).map((category) => {
                        const categoryEvidences: EvidenceItem[] = [
                          {
                            id: `evidence-${category}-1`,
                            category,
                            source: category === 'road' ? 'road.is' : category === 'weather' ? 'forecast.io' : 'google.places',
                            timestamp: new Date().toISOString(),
                            scope: 'Day 1',
                            confidence: 'high',
                          },
                          {
                            id: `evidence-${category}-2`,
                            category,
                            source: category === 'road' ? 'traffic.api' : category === 'weather' ? 'weather.gov' : 'tripadvisor',
                            timestamp: new Date(Date.now() - 3600000).toISOString(),
                            scope: 'Segment 2',
                            confidence: 'medium',
                          },
                        ];
                        return (
                          <div key={category} className="space-y-2">
                            <h3 className="text-sm font-medium capitalize">{category}</h3>
                            {categoryEvidences.map((evidence) => (
                              <EvidenceListItem
                                key={evidence.id}
                                evidence={evidence}
                                onRefresh={handleRefreshSingleEvidence}
                                onOpen={(id) => {
                                  // TODO: 打开证据详情
                                  console.log('Open evidence:', id);
                                }}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="coverage" className="mt-6">
                <CoverageMiniMap
                  gaps={[
                    {
                      id: 'gap-1',
                      type: 'road',
                      location: 'Segment 2',
                      description: 'Missing road status evidence',
                    },
                    {
                      id: 'gap-2',
                      type: 'poi',
                      location: 'POI #3',
                      description: 'Missing opening hours',
                    },
                  ]}
                  onGapClick={(gapId) => {
                    // 定位到对应的 blocker
                    const blocker = readinessData.blockers.find(b => b.id === gapId);
                    if (blocker) {
                      handleFixBlocker(blocker.id);
                    }
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* 移动端 Repair Preview Sheet */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>Repair Options</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 overflow-y-auto">
            {readinessData.repairOptions && readinessData.repairOptions.length > 0 ? (
              readinessData.repairOptions.map((option) => (
                <RepairOptionCard
                  key={option.id}
                  option={option}
                  isSelected={selectedRepairOptionId === option.id}
                  onSelect={setSelectedRepairOptionId}
                  onApply={handleApplyFix}
                  onPreview={handlePreviewFix}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No repair options available
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

