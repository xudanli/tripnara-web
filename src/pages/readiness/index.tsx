import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import type { ReadinessCheckResult, PersonalizedChecklistResponse, RiskWarningsResponse, CheckReadinessDto } from '@/api/readiness';
import ReadinessStatusBadge from '@/components/readiness/ReadinessStatusBadge';
import ScoreGauge from '@/components/readiness/ScoreGauge';
import BlockerCard from '@/components/readiness/BlockerCard';
import RepairOptionCard from '@/components/readiness/RepairOptionCard';
import BreakdownBarList from '@/components/readiness/BreakdownBarList';
import EvidenceListItem from '@/components/readiness/EvidenceListItem';
import CoverageMiniMap from '@/components/readiness/CoverageMiniMap';
import RiskCard from '@/components/readiness/RiskCard';
import ChecklistSection from '@/components/readiness/ChecklistSection';

export default function ReadinessPage() {
  const { t, i18n } = useTranslation();
  
  // 获取当前语言代码（'zh' 或 'en'）
  const getLangCode = () => {
    const lang = i18n.language || 'en';
    return lang.startsWith('zh') ? 'zh' : 'en';
  };
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tripId = searchParams.get('tripId');
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [readinessData, setReadinessData] = useState<ReadinessData | null>(null);
  const [rawReadinessResult, setRawReadinessResult] = useState<ReadinessCheckResult | null>(null);
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

  // 验证 ReadinessData 数据格式
  const validateReadinessData = (data: unknown): data is ReadinessData => {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    if (!('status' in obj) || !('score' in obj) || !('blockers' in obj)) return false;
    const score = obj.score;
    if (!score || typeof score !== 'object') return false;
    const scoreObj = score as Record<string, unknown>;
    if (typeof scoreObj.overall !== 'number') return false;
    if (!Array.isArray(obj.blockers)) return false;
    return true;
  };

  // 从 trip 数据构建 CheckReadinessDto
  const buildCheckReadinessDto = (trip: TripDetail): CheckReadinessDto => {
    return {
      destinationId: trip.destination || '',
      trip: {
        startDate: trip.startDate,
        endDate: trip.endDate,
      },
      itinerary: {
        countries: [trip.destination].filter(Boolean) as string[],
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
        readinessApi.getTripReadiness(tripId, getLangCode()).catch((err) => {
          // 如果后端还没有实现 /readiness/trip/:tripId，则使用备用方案
          console.warn('getTripReadiness failed, trying fallback:', err);
          return null;
        }),
      ]);
      
      setTrip(tripData);
      
      // 加载能力包信息（不阻塞主流程）
      loadCapabilityPacks(tripData);
      
      let finalReadinessData: ReadinessData | null = null;
      
      if (readinessData) {
        // getTripReadiness 返回 ReadinessCheckResult，需要转换为 ReadinessData
        console.log('Using getTripReadiness data for trip:', tripId, 'destination:', tripData.destination);
        console.log('Raw readiness data from API:', JSON.stringify(readinessData, null, 2));
        setRawReadinessResult(readinessData); // 保存原始数据用于展示详细信息和清单
        const convertedData = convertCheckResultToReadinessData(readinessData, tripData);
        console.log('Converted readiness data:', JSON.stringify(convertedData, null, 2));
        if (validateReadinessData(convertedData)) {
          finalReadinessData = convertedData;
      } else {
          console.warn('Converted readiness data validation failed, using fallback');
        }
      }
      
      // 如果 getTripReadiness 失败或转换失败，使用备用方案
      if (!finalReadinessData) {
        // 备用方案1：尝试使用 check 接口
        try {
          const checkDto = buildCheckReadinessDto(tripData);
          console.log('Trying check API with DTO:', checkDto);
          const checkResult = await readinessApi.check(checkDto);
          console.log('✅ Using check API result for trip:', tripId, 'destination:', tripData.destination, 'result:', checkResult);
          setRawReadinessResult(checkResult); // 保存原始数据用于展示详细信息和清单
          // 将 check 结果转换为 ReadinessData
          finalReadinessData = convertCheckResultToReadinessData(checkResult, tripData);
        } catch (checkErr: any) {
          console.warn('❌ check API failed, trying fallback 2:', {
            error: checkErr,
            message: checkErr?.message,
            response: checkErr?.response?.data,
            status: checkErr?.response?.status,
          });
          // 备用方案2：使用个性化清单和风险预警构建 ReadinessData
          const [checklist, riskWarnings] = await Promise.all([
            readinessApi.getPersonalizedChecklist(tripId, getLangCode()).catch((err) => {
              console.warn('getPersonalizedChecklist failed:', err);
              return null;
            }),
            readinessApi.getRiskWarnings(tripId, getLangCode()).catch((err) => {
              console.warn('getRiskWarnings failed:', err);
              return null;
            }),
          ]);
          
          if (checklist && riskWarnings) {
            console.log('Using checklist/riskWarnings data for trip:', tripId, 'destination:', tripData.destination);
            finalReadinessData = convertToReadinessData(checklist, riskWarnings, tripData);
          } else {
            // 如果所有 API 都失败，使用模拟数据
            console.warn('All APIs failed, using mock data for trip:', tripId, 'destination:', tripData.destination);
            finalReadinessData = generateMockReadinessData();
          }
        }
      }
      
      // 设置最终的数据
      if (finalReadinessData) {
        setReadinessData(finalReadinessData);
      } else {
        // 如果所有方案都失败，使用模拟数据
            setReadinessData(generateMockReadinessData());
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
    checkResult: ReadinessCheckResult,
    trip: TripDetail
  ): ReadinessData => {
    const totalBlockers = checkResult?.summary?.totalBlockers || 0;
    const totalMust = checkResult?.summary?.totalMust || 0;
    const status: ReadinessData['status'] = 
      totalBlockers > 0 ? 'not-ready' : totalMust > 0 ? 'nearly' : 'ready';

    // 从 findings 中提取 blockers
    const blockers: Blocker[] = [];
    checkResult?.findings?.forEach((finding, findingIndex) => {
      const findingId = finding.destinationId || finding.packId || `finding-${findingIndex}`;
      finding.blockers?.forEach((item, index: number) => {
        // 从 item 的 category 或推断类别
        const category = item.category === 'entry' ? 'ticket' : 
                        item.category === 'safety' ? 'road' : 
                        'other' as const;
        
        // 处理 evidence：可能是数组或字符串
        const evidenceSource = Array.isArray(item.evidence) 
          ? item.evidence[0]?.sourceId || 'system'
          : typeof item.evidence === 'string' 
          ? item.evidence 
          : 'system';
        
        blockers.push({
          id: `blocker-${findingId}-${index}`,
          title: item.message,
          severity: 'critical' as const,
          impactScope: trip.destination || t('dashboard.readiness.page.unknown'),
          evidenceSummary: {
            source: evidenceSource,
            timestamp: new Date().toISOString(),
          },
          category,
        });
      });
    });

    // 从 findings 中提取 watchlist（从 should 中提取）
    const watchlist: Blocker[] = [];
    checkResult?.findings?.forEach((finding, findingIndex: number) => {
      finding.should?.slice(0, 2).forEach((item, index: number) => {
        const findingId = finding.destinationId || finding.packId || `finding-${findingIndex}`;
        watchlist.push({
          id: `watch-${findingId}-${index}`,
          title: item.message,
          severity: 'medium' as const,
          impactScope: trip.destination || t('dashboard.readiness.page.unknown'),
          evidenceSummary: {
            source: item.evidence?.[0]?.sourceId || 'system',
            timestamp: new Date().toISOString(),
          },
          category: 'other' as const,
        });
      });
    });

    // 计算分数
    const riskCount = checkResult?.risks?.length || 0;
    const highRiskCount = checkResult?.risks?.filter((r) => r.severity === 'high').length || 0;
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
    checklist: PersonalizedChecklistResponse,
    riskWarnings: RiskWarningsResponse,
    trip: TripDetail
  ): ReadinessData => {
    // 计算总体状态
    const totalBlockers = checklist?.summary?.totalBlockers || 0;
    const totalMust = checklist?.summary?.totalMust || 0;
    const status: ReadinessData['status'] = 
      totalBlockers > 0 ? 'not-ready' : totalMust > 0 ? 'nearly' : 'ready';

    // 转换 blockers
    const blockers: Blocker[] = (checklist?.checklist?.blocker || []).map((item, index: number) => {
      // 处理 evidence：可能是数组或字符串
      const evidenceSource = Array.isArray(item.evidence) 
        ? item.evidence[0]?.sourceId || 'system'
        : typeof item.evidence === 'string' 
        ? item.evidence 
        : 'system';
      
      return {
        id: `blocker-${index}`,
        title: item.message,
        severity: 'critical' as const,
        impactScope: trip.destination || t('dashboard.readiness.page.unknown'),
        evidenceSummary: {
          source: evidenceSource,
          timestamp: new Date().toISOString(),
        },
        category: 'other' as const,
      };
    });

    // 转换 watchlist（从 should/optional 中提取）
    const watchlist: Blocker[] = (checklist?.checklist?.should || []).slice(0, 3).map((item, index: number) => {
      // 处理 evidence：可能是数组或字符串
      const evidenceSource = Array.isArray(item.evidence) 
        ? item.evidence[0]?.sourceId || 'system'
        : typeof item.evidence === 'string' 
        ? item.evidence 
        : 'system';
      
      return {
        id: `watch-${index}`,
        title: item.message,
        severity: 'medium' as const,
        impactScope: trip.destination || t('dashboard.readiness.page.unknown'),
        evidenceSummary: {
          source: evidenceSource,
          timestamp: new Date().toISOString(),
        },
        category: 'other' as const,
      };
    });

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
            <p className="text-muted-foreground mb-4">{t('dashboard.readiness.page.noTripSelected')}</p>
            <Button onClick={() => navigate('/dashboard/trips')}>
              {t('dashboard.readiness.page.goToTrips')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 安全检查：确保 score 字段存在
  if (!readinessData.score) {
    console.error('ReadinessData missing score field:', readinessData);
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">{t('dashboard.readiness.page.dataFormatError')}</p>
            <Button onClick={() => window.location.reload()}>
              {t('dashboard.readiness.page.refreshPage')}
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
                <h1 className="text-xl font-bold">{trip.destination || t('dashboard.readiness.page.untitledTrip')}</h1>
                <Badge variant="outline" className="text-xs">
                  {trip.pacingConfig?.level === 'STEADY' ? t('dashboard.readiness.page.pacingLevel.steady') :
                   trip.pacingConfig?.level === 'BALANCED' ? t('dashboard.readiness.page.pacingLevel.balanced') :
                   trip.pacingConfig?.level === 'EXPLORATORY' ? t('dashboard.readiness.page.pacingLevel.exploratory') : t('dashboard.readiness.page.pacingLevel.standard')}
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
                  <span>{t('dashboard.readiness.page.plan')} v{trip.pipelineStatus?.stages?.length || 1}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {t('dashboard.readiness.page.lastUpdated', {
                  date: format(new Date(trip.updatedAt || trip.createdAt), 'MMM dd, HH:mm'),
                })}
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
                  {t('dashboard.readiness.page.startExecute')}
                </Button>
              ) : (
                <Button size="lg" onClick={handleRunRepair} className="w-full sm:w-auto">
                  <Wrench className="h-4 w-4 mr-2" />
                  {t('dashboard.readiness.page.runRepair')}
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
                    {t('dashboard.readiness.page.actions.viewEvidence')}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 className="h-4 w-4 mr-2" />
                    {t('dashboard.readiness.page.actions.share')}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="h-4 w-4 mr-2" />
                    {t('dashboard.readiness.page.actions.export')}
                  </DropdownMenuItem>
                  {isNotReady && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        {t('dashboard.readiness.page.actions.forceStart')}
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
                    {t('dashboard.readiness.page.topBlocker', { title: readinessData.blockers[0].title })}
                  </div>
                  <div className="text-sm text-red-700">
                    {readinessData.blockers[0].impactScope}
                  </div>
                </div>
                <Button size="sm" onClick={() => handleFixBlocker(readinessData.blockers[0].id)}>
                  {t('dashboard.readiness.page.fixNow')}
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
                  {isReady ? t('dashboard.readiness.page.watchlist') : t('dashboard.readiness.page.blockers')}
                </h2>
                {!isReady && readinessData.blockers.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllBlockers(!showAllBlockers)}
                  >
                    {showAllBlockers ? t('dashboard.readiness.page.showTop3') : t('dashboard.readiness.page.viewAll', { count: readinessData.blockers.length })}
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
                        <p className="text-sm text-muted-foreground">{t('dashboard.readiness.page.noPotentialRisks')}</p>
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
                        <p className="text-sm text-muted-foreground">{t('dashboard.readiness.page.noBlockersFound')}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>

            {/* 右列：Repair Preview (桌面端) */}
            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold mb-4">{t('dashboard.readiness.page.repairPreview')}</h2>
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
                    <p className="text-sm text-muted-foreground mb-2">{t('dashboard.readiness.page.noFixesNeeded')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('dashboard.readiness.page.clickFixToSeeOptions')}
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
                <TabsTrigger value="breakdown">{t('dashboard.readiness.page.tabs.readinessBreakdown')}</TabsTrigger>
                <TabsTrigger value="capability">{t('dashboard.readiness.page.tabs.capabilityPacks')}</TabsTrigger>
                <TabsTrigger value="evidence">{t('dashboard.readiness.page.tabs.evidenceChain')}</TabsTrigger>
                <TabsTrigger value="coverage">{t('dashboard.readiness.page.tabs.coverageMap')}</TabsTrigger>
              </TabsList>

              <TabsContent value="breakdown" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('dashboard.readiness.page.scoreBreakdown.title')}</CardTitle>
                    <CardDescription>
                      {t('dashboard.readiness.page.scoreBreakdown.description')}
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
                    <CardTitle>{t('dashboard.readiness.page.tabs.capabilityPacks')}</CardTitle>
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
                          {t('dashboard.readiness.page.packsTriggered', {
                            triggered: evaluatedPacks.filter((p) => p.triggered).length,
                            total: evaluatedPacks.length,
                          })}
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
                                            {t('dashboard.readiness.page.triggered')}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mb-2">
                                        {pack.description}
                                      </p>
                                      {isTriggered && result.reason && (
                                        <p className="text-xs text-muted-foreground italic">
                                          {t('dashboard.readiness.page.reason', { reason: result.reason })}
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
                            <h4 className="text-sm font-medium mb-3">{t('dashboard.readiness.page.allAvailablePacks')}</h4>
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
                        <p className="text-sm">{t('dashboard.readiness.page.noCapabilityPacksAvailable')}</p>
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
                        <CardTitle>{t('dashboard.readiness.page.tabs.evidenceChain')}</CardTitle>
                        <CardDescription>
                          {t('dashboard.readiness.page.evidenceChainDescription')}
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
                    <div className="space-y-6">
                      {/* Risks Section */}
                      {rawReadinessResult && rawReadinessResult.risks && rawReadinessResult.risks.length > 0 && (
                    <div className="space-y-3">
                          <h3 className="text-sm font-semibold">{t('dashboard.readiness.page.risks')}</h3>
                          <div className="space-y-3">
                            {rawReadinessResult.risks.map((risk, index) => (
                              <RiskCard key={index} risk={risk} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Checklists Section */}
                      {rawReadinessResult && rawReadinessResult.findings && rawReadinessResult.findings.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold">{t('dashboard.readiness.page.checklists')}</h3>
                          {rawReadinessResult.findings.map((finding, findingIndex) => {
                            // 收集所有 blockers/must/should/optional 项目
                            const allBlockers: any[] = finding.blockers || [];
                            const allMust: any[] = finding.must || [];
                            const allShould: any[] = finding.should || [];
                            const allOptional: any[] = finding.optional || [];

                            if (allBlockers.length === 0 && allMust.length === 0 && allShould.length === 0 && allOptional.length === 0) {
                              return null;
                            }

                            // 获取行程开始日期用于计算截止日期
                            const tripStartDate = trip?.startDate;

                            // 使用 destinationId 或 packId 作为标题
                            const findingTitle = finding.destinationId || finding.packId;

                            return (
                              <div key={findingIndex} className="space-y-3">
                                {findingTitle && (
                                  <h4 className="text-xs font-medium text-muted-foreground uppercase">{findingTitle}</h4>
                                )}
                                <div className="space-y-3">
                                  {allBlockers.length > 0 && (
                                    <ChecklistSection
                                      title={t('dashboard.readiness.page.blockers')}
                                      items={allBlockers}
                                      level="must"
                                      tripStartDate={tripStartDate}
                                    />
                                  )}
                                  {allMust.length > 0 && (
                                    <ChecklistSection
                                      title={t('dashboard.readiness.page.must')}
                                      items={allMust}
                                      level="must"
                                      tripStartDate={tripStartDate}
                                    />
                                  )}
                                  {allShould.length > 0 && (
                                    <ChecklistSection
                                      title={t('dashboard.readiness.page.should')}
                                      items={allShould}
                                      level="should"
                                      tripStartDate={tripStartDate}
                                    />
                                  )}
                                  {allOptional.length > 0 && (
                                    <ChecklistSection
                                      title={t('dashboard.readiness.page.optional')}
                                      items={allOptional}
                                      level="optional"
                                      tripStartDate={tripStartDate}
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Evidence Section */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold">证据链</h3>
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

