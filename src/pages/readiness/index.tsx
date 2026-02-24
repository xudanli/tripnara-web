import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { tripsApi } from '@/api/trips';
import { readinessApi } from '@/api/readiness';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { LogoLoading } from '@/components/common/LogoLoading';
import { ReadinessPageSkeleton } from '@/components/readiness/ReadinessPageSkeleton';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  ListChecks,
  ExternalLink,
  Cloud,
  Shield,
  Route,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { TripDetail, EvidenceItem as TripEvidenceItem, EvidenceType } from '@/types/trip';
import type { FetchEvidenceResponse } from '@/api/planning-workbench';
import type { ReadinessData, Blocker } from '@/types/readiness';
import type { 
  ReadinessCheckResult, 
  PersonalizedChecklistResponse, 
  RiskWarningsResponse, 
  CheckReadinessDto,
  CapabilityPack,
  CapabilityPackEvaluateDto,
  CapabilityPackEvaluateResultItem,
  CoverageMapResponse,
  ScoreBreakdownResponse,
  EnhancedRisk,
} from '@/api/readiness';
import { inferSeason, inferRouteType, extractActivitiesFromTrip } from '@/utils/packing-list-inference';
import { adaptTripEvidenceListToReadiness } from '@/utils/evidence-adapter'; // 🆕 证据类型适配器
import { useTripPermissions, useAuth } from '@/hooks'; // 🆕 权限 Hook 和用户认证
import ReadinessStatusBadge from '@/components/readiness/ReadinessStatusBadge';
import ScoreGauge from '@/components/readiness/ScoreGauge';
import BlockerCard from '@/components/readiness/BlockerCard';
import RepairOptionCard from '@/components/readiness/RepairOptionCard';
import BreakdownBarList from '@/components/readiness/BreakdownBarList';
import EvidenceListItem from '@/components/readiness/EvidenceListItem'; // 🆕 启用证据列表项组件
import EvidenceBatchActions from '@/components/readiness/EvidenceBatchActions'; // 🆕 批量操作组件
import EvidenceCompletenessCard from '@/components/readiness/EvidenceCompletenessCard'; // 🆕 证据完整性检查组件
import EvidenceSuggestionsCard from '@/components/readiness/EvidenceSuggestionsCard'; // 🆕 证据获取建议组件
import TaskProgressDialog from '@/components/readiness/TaskProgressDialog'; // 🆕 异步任务进度对话框
import EvidenceFilters, { type EvidenceFiltersState } from '@/components/readiness/EvidenceFilters'; // 🆕 证据过滤和排序组件
import CoverageMiniMap from '@/components/readiness/CoverageMiniMap';
import RiskCard from '@/components/readiness/RiskCard';
import ChecklistSection from '@/components/readiness/ChecklistSection';
import PackingListTab from '@/components/readiness/PackingListTab';
import ReadinessDisclaimerComponent from '@/components/readiness/ReadinessDisclaimer'; // 🆕 免责声明组件
import { planningWorkbenchApi } from '@/api/planning-workbench'; // 🆕 规划工作台 API
import { useIcelandInfo, useIsIcelandTrip } from '@/hooks'; // 🆕 冰岛信息源 Hook
import { inferIcelandInfoParams } from '@/utils/iceland-info-inference'; // 🆕 冰岛信息源参数推断
// import CapabilityPackPersonaInsights from '@/components/readiness/CapabilityPackPersonaInsights'; // 暂时移除：信息重复

export default function ReadinessPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth(); // 🆕 获取当前用户信息
  
  // 获取当前语言代码（'zh' 或 'en'）
  const getLangCode = () => {
    const lang = i18n.language || 'en';
    return lang.startsWith('zh') ? 'zh' : 'en';
  };
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tripId = searchParams.get('tripId');
  const tabParam = searchParams.get('tab'); // 🆕 从 URL 参数读取标签页
  
  // 🆕 获取用户权限
  const { role: userRole } = useTripPermissions({ tripId });
  
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [readinessData, setReadinessData] = useState<ReadinessData | null>(null);
  const [rawReadinessResult, setRawReadinessResult] = useState<ReadinessCheckResult | null>(null);
  const [riskWarnings, setRiskWarnings] = useState<RiskWarningsResponse | null>(null); // 🆕 增强版风险预警数据
  const [selectedBlockerId, setSelectedBlockerId] = useState<string | null>(null);
  const [selectedRepairOptionId, setSelectedRepairOptionId] = useState<string | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [showAllBlockers, setShowAllBlockers] = useState(false);
  const [refreshingEvidence, setRefreshingEvidence] = useState(false);
  const [capabilityPacks, setCapabilityPacks] = useState<CapabilityPack[]>([]);
  const [evaluatedPacks, setEvaluatedPacks] = useState<CapabilityPackEvaluateResultItem[]>([]);
  const [loadingCapabilityPacks, setLoadingCapabilityPacks] = useState(false);
  const [capabilityPacksError, setCapabilityPacksError] = useState<string | null>(null);
  const [addingToChecklist, setAddingToChecklist] = useState<string | null>(null);  // 正在添加的 packType
  const [activeTab, setActiveTab] = useState<string>(tabParam || 'breakdown');  // 🆕 从 URL 参数读取，默认 breakdown
  const [evidenceData, setEvidenceData] = useState<TripEvidenceItem[]>([]);  // 证据列表
  const [loadingEvidence, setLoadingEvidence] = useState(false);  // 证据加载状态
  // 🆕 证据完整性检查状态
  const [completenessData, setCompletenessData] = useState<{
    completenessScore: number;
    missingEvidence: Array<{
      poiId: number;
      poiName: string;
      missingTypes: EvidenceType[];
      impact: 'LOW' | 'MEDIUM' | 'HIGH';
      reason: string;
    }>;
    recommendations: Array<{
      action: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      estimatedTime: number;
      evidenceTypes: EvidenceType[];
      affectedPois: number[];
    }>;
  } | null>(null);
  const [loadingCompleteness, setLoadingCompleteness] = useState(false);
  // 🆕 证据获取建议状态
  const [suggestionsData, setSuggestionsData] = useState<{
    hasMissingEvidence: boolean;
    completenessScore: number;
    suggestions: Array<{
      id: string;
      description: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      evidenceTypes: EvidenceType[];
      affectedPoiIds: number[];
      estimatedTime: number;
      reason: string;
      canBatchFetch: boolean;
    }>;
    bulkFetchSuggestion?: {
      evidenceTypes: EvidenceType[];
      affectedPoiIds: number[];
      estimatedTime: number;
      description: string;
    };
  } | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  // 🆕 证据过滤和排序状态
  const [evidenceFilters, setEvidenceFilters] = useState<EvidenceFiltersState>({});
  // 🆕 异步任务进度状态
  const [taskProgress, setTaskProgress] = useState<{
    taskId: string | null;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | null;
    progress: {
      total: number;
      processed: number;
      current?: string;
      estimatedRemainingTime?: number;
    } | null;
    result?: FetchEvidenceResponse;
    error?: string;
  }>({
    taskId: null,
    status: null,
    progress: null,
  });
  const [taskProgressDialogOpen, setTaskProgressDialogOpen] = useState(false);
  const taskProgressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 🆕 冰岛信息源集成
  const isIceland = useIsIcelandTrip(trip?.destination);
  const icelandInfoParams = inferIcelandInfoParams(trip);
  const icelandInfo = useIcelandInfo({
    autoFetch: false, // 不自动获取，手动触发
    refreshInterval: 0,
  });
  
  // 🆕 自动获取冰岛信息（延迟执行）
  useEffect(() => {
    if (isIceland && trip && icelandInfoParams) {
      const timer = setTimeout(() => {
        icelandInfo.fetchAll(icelandInfoParams);
      }, 2000); // 延迟2秒，让行程数据先加载
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIceland, trip?.id]);
  const [capabilityPackChecklistItems, setCapabilityPackChecklistItems] = useState<Array<{
    id: string;
    ruleId: string;
    message: string;
    level: 'blocker' | 'must' | 'should' | 'optional';
    sourcePackType: string;
    checked: boolean;
    tasks?: string[];
  }>>([]);  // 能力包清单项
  const [loadingChecklistItems, setLoadingChecklistItems] = useState(false);  // 清单项加载状态
  const [coverageMapData, setCoverageMapData] = useState<CoverageMapResponse | null>(null);  // 覆盖地图数据
  const [loadingCoverageMap, setLoadingCoverageMap] = useState(false);  // 覆盖地图加载状态
  const [coverageMapError, setCoverageMapError] = useState<string | null>(null);  // 覆盖地图错误
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdownResponse | null>(null);  // 准备度分数分解
  const [loadingScoreBreakdown, setLoadingScoreBreakdown] = useState(false);  // 分数加载状态
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);  // 当前选中的维度（用于显示 findings）
  const [selectedBlockerMessage, setSelectedBlockerMessage] = useState<string | null>(null);  // 当前选中的阻塞项描述

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
    // 自动推断参数
    const season = inferSeason(trip.startDate, trip.destination);
    const route = inferRouteType(trip);
    const activities = extractActivitiesFromTrip(trip);
    
    return {
      destinationId: trip.destination || '',
      trip: {
        startDate: trip.startDate,
        endDate: trip.endDate,
      },
      itinerary: {
        countries: [trip.destination].filter(Boolean) as string[],
        season,           // 推断的季节
        activities,       // 推断的活动列表
        region: route,    // 推断的路线类型（作为 region）
      },
    };
  };

  // 从行程地点数据中提取 geo 信息
  const extractGeoFromTrip = (trip: TripDetail) => {
    const places: Array<{ lat?: number; lng?: number; elevation?: number }> = [];
    
    // 遍历所有行程日，收集地点信息
    trip.TripDay?.forEach(day => {
      day.ItineraryItem?.forEach(item => {
        const place = item.Place as any;
        if (place) {
          places.push({
            lat: place.lat,
            lng: place.lng,
            elevation: place.physicalMetadata?.elevation || place.metadata?.elevation,
          });
        }
      });
    });
    
    if (places.length === 0) {
      return null;
    }
    
    // 计算平均坐标和海拔
    const validLats = places.filter(p => p.lat != null).map(p => p.lat!);
    const validLngs = places.filter(p => p.lng != null).map(p => p.lng!);
    const validElevations = places.filter(p => p.elevation != null).map(p => p.elevation!);
    
    const avgLat = validLats.length > 0 ? validLats.reduce((a, b) => a + b, 0) / validLats.length : undefined;
    const avgLng = validLngs.length > 0 ? validLngs.reduce((a, b) => a + b, 0) / validLngs.length : undefined;
    const avgElevation = validElevations.length > 0 ? validElevations.reduce((a, b) => a + b, 0) / validElevations.length : undefined;
    const maxElevation = validElevations.length > 0 ? Math.max(...validElevations) : undefined;
    
    // 判断是否在山区（海拔 > 1500m 或最高点 > 2000m）
    const inMountain = (avgElevation && avgElevation > 1500) || (maxElevation && maxElevation > 2000);
    
    // 判断是否有山口（最高点比平均高度高 500m 以上）
    const hasMountainPass = avgElevation && maxElevation && (maxElevation - avgElevation > 500);
    
    return {
      lat: avgLat,
      lng: avgLng,
      mountains: {
        inMountain: inMountain || false,
        mountainElevationAvg: avgElevation ? Math.round(avgElevation) : undefined,
        hasMountainPass: hasMountainPass || false,
      },
    };
  };

  // 从 trip 数据构建能力包评估请求 DTO
  const buildCapabilityPackEvaluateDto = (trip: TripDetail): CapabilityPackEvaluateDto => {
    // 自动推断参数
    const season = inferSeason(trip.startDate, trip.destination);
    const activities = extractActivitiesFromTrip(trip);
    
    // 计算路线长度（如果有行程日数据）
    let routeLength: number | undefined;
    if (trip.TripDay && trip.TripDay.length > 0) {
      // 简单估算：假设每天平均行驶 200km（可以根据实际数据调整）
      routeLength = trip.TripDay.length * 200;
    }
    
    // 从行程地点提取 geo 信息
    const geoInfo = extractGeoFromTrip(trip);
    
    // 根据目的地推断一些 geo 参数（冰岛特定）
    const isIceland = trip.destination?.toUpperCase() === 'IS' || 
                      trip.destination?.toLowerCase().includes('iceland') ||
                      trip.destination?.includes('冰岛');
    
    // 冰岛特定的 geo 参数推断
    // 根据 API 文档触发条件：
    // - sparse_supply: roadDensityScore < 0.3 + supplyDensity < 0.2 + routeLength > 100
    // - seasonal_road: inMountain == true + season == "winter"
    // - emergency: roadDensityScore < 0.2 + (no hospital OR route > 300km OR elevation >= 3000m)
    const icelandGeoDefaults = isIceland ? {
      mountains: {
        inMountain: true,  // 冰岛大部分路线都在山区/高地
        mountainElevationAvg: 800,  // 冰岛平均海拔约 500-1000m
        hasMountainPass: season === 'winter',  // 冬季山口可能封闭
      },
      roads: {
        roadDensityScore: 0.25,  // 冰岛道路密度很低（< 0.3 触发 sparse_supply）
        hasMountainPass: season === 'winter',
      },
      pois: {
        supplyDensity: 0.15,  // 冰岛补给点密度很低（< 0.2 触发 sparse_supply）
        hasCheckpoint: false,
        safety: {
          hasHospital: false,  // 偏远地区无医院（触发 emergency）
          hasPolice: true,
        },
        supply: {
          hasFuel: true,  // 主要道路有加油站
          hasSupermarket: false,  // 偏远地区无超市
        },
      },
    } : {};
    
    // 合并 geo 信息：优先使用 icelandGeoDefaults，其次是从行程提取的 geoInfo
    const mergedMountains = {
      ...geoInfo?.mountains,
      ...icelandGeoDefaults.mountains,
    };
    
    return {
      destinationId: trip.destination || '',
      trip: {
        startDate: trip.startDate,
        endDate: trip.endDate,
      },
      itinerary: {
        countries: [trip.destination].filter(Boolean) as string[],
        season: season as 'winter' | 'summer' | 'spring' | 'fall',
        activities,
        routeLength,
      },
      geo: {
        lat: geoInfo?.lat,
        lng: geoInfo?.lng,
        mountains: Object.keys(mergedMountains).length > 0 ? mergedMountains : undefined,
        roads: icelandGeoDefaults.roads,
        pois: icelandGeoDefaults.pois,
      },
    };
  };

  // 加载能力包信息
  const loadCapabilityPacks = async (trip: TripDetail) => {
    try {
      setLoadingCapabilityPacks(true);
      setCapabilityPacksError(null);
      console.log('🔄 [Readiness] 开始加载能力包，trip:', trip?.destination, trip?.id);
      
      // 构建能力包评估请求 DTO
      const evaluateDto = buildCapabilityPackEvaluateDto(trip);
      console.log('📤 [Readiness] 能力包评估请求 DTO:', JSON.stringify(evaluateDto, null, 2));
      
      // 并行加载能力包列表和评估结果
      let packsError = false;
      let evaluateError = false;
      
      const [packsResponse, evaluateResponse] = await Promise.all([
        readinessApi.getCapabilityPacks().catch((err) => {
          packsError = true;
          console.error('❌ [Readiness] getCapabilityPacks API 调用失败:', {
            error: err?.message || err,
            response: err?.response?.data,
            status: err?.response?.status,
          });
          return null;
        }),
        // 使用 autoEnhanceGeo 选项，让后端自动增强地理参数
        readinessApi.evaluateCapabilityPacks(evaluateDto, { autoEnhanceGeo: true }).catch((err) => {
          evaluateError = true;
          console.error('❌ [Readiness] evaluateCapabilityPacks API 调用失败:', {
            error: err?.message || err,
            response: err?.response?.data,
            status: err?.response?.status,
            dto: evaluateDto,
          });
          return null;
        }),
      ]);

      if (packsResponse) {
        console.log('✅ [Readiness] 能力包列表加载成功:', packsResponse.packs?.length || 0, '个');
        setCapabilityPacks(packsResponse.packs || []);
      } else if (packsError) {
        console.warn('⚠️ [Readiness] 能力包列表 API 调用失败');
        setCapabilityPacksError('能力包列表 API 调用失败，请检查后端服务');
      }

      if (evaluateResponse) {
        console.log('✅ [Readiness] 能力包评估结果加载成功:', {
          total: evaluateResponse.total,
          triggered: evaluateResponse.triggered,
          resultsCount: evaluateResponse.results?.length || 0,
        });
        console.log('📊 [Readiness] 能力包评估详情:', JSON.stringify(evaluateResponse.results, null, 2));
        setEvaluatedPacks(evaluateResponse.results || []);
      } else if (evaluateError) {
        console.warn('⚠️ [Readiness] 能力包评估 API 调用失败');
        if (!capabilityPacksError) {
          setCapabilityPacksError('能力包评估 API 调用失败，请检查后端服务');
        }
      }
    } catch (err) {
      console.error('❌ [Readiness] 加载能力包时发生异常:', err);
      setCapabilityPacksError('加载能力包时发生错误');
    } finally {
      setLoadingCapabilityPacks(false);
    }
  };

  /**
   * 加载能力包清单项
   * GET /readiness/trip/:tripId/checklist/capability-pack-items
   */
  const loadCapabilityPackChecklistItems = async (tripId: string) => {
    try {
      setLoadingChecklistItems(true);
      console.log('🔄 [Readiness] 开始加载能力包清单项，tripId:', tripId);
      
      const response = await readinessApi.getCapabilityPackChecklistItems(tripId);
      
      console.log('✅ [Readiness] 能力包清单项加载成功:', {
        total: response.summary?.total || 0,
        checked: response.summary?.checked || 0,
        itemsCount: response.items?.length || 0,
      });
      
      setCapabilityPackChecklistItems(response.items || []);
    } catch (err: any) {
      console.error('❌ [Readiness] 加载能力包清单项失败:', {
        error: err?.message || err,
        response: err?.response?.data,
        status: err?.response?.status,
      });
      // 不设置错误状态，静默失败（API 可能尚未实现）
      setCapabilityPackChecklistItems([]);
    } finally {
      setLoadingChecklistItems(false);
    }
  };

  /**
   * 加载覆盖地图数据
   * GET /readiness/trip/:tripId/coverage-map
   */
  const loadCoverageMapData = async (tripId: string) => {
    try {
      setLoadingCoverageMap(true);
      setCoverageMapError(null);
      console.log('🔄 [Readiness] 开始加载覆盖地图数据，tripId:', tripId);
      
      const response = await readinessApi.getCoverageMapData(tripId);
      
      console.log('✅ [Readiness] 覆盖地图数据加载成功:', {
        totalPois: response.summary?.totalPois || 0,
        totalSegments: response.summary?.totalSegments || 0,
        totalGaps: response.summary?.totalGaps || 0,
        coverageRate: response.summary?.coverageRate || 0,
        // 优化后的新字段
        deduplicatedWarnings: response.deduplicatedWarnings?.length || 0,
        warningsBySeverity: response.warningsBySeverity ? {
          high: response.warningsBySeverity.high?.length || 0,
          medium: response.warningsBySeverity.medium?.length || 0,
          low: response.warningsBySeverity.low?.length || 0,
        } : null,
        evidenceStatusSummary: response.evidenceStatusSummary,
        dataFreshness: response.dataFreshness,
        calculatedAt: response.calculatedAt,
      });
      
      setCoverageMapData(response);
    } catch (err: any) {
      // 忽略 AbortError（组件卸载时的正常行为）
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        console.log('⏹️ [Readiness] 覆盖地图数据请求被取消（正常）');
        return;
      }
      
      console.error('❌ [Readiness] 加载覆盖地图数据失败:', {
        error: err?.message || err,
        response: err?.response?.data,
        status: err?.response?.status,
      });
      
      // 根据错误类型设置友好的错误信息
      let errorMessage = '加载覆盖地图数据失败';
      if (err?.response?.status === 404) {
        errorMessage = '覆盖地图接口尚未实现';
      } else if (err?.response?.status === 500) {
        errorMessage = '服务器错误，请稍后重试';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setCoverageMapError(errorMessage);
      setCoverageMapData(null);
    } finally {
      setLoadingCoverageMap(false);
    }
  };

  /**
   * 加载准备度分数分解
   * GET /readiness/trip/:tripId/score
   */
  const loadScoreBreakdown = async (tripId: string) => {
    try {
      setLoadingScoreBreakdown(true);
      console.log('🔄 [Readiness] 开始加载准备度分数分解，tripId:', tripId);
      
      const response = await readinessApi.getScoreBreakdown(tripId);
      
      console.log('✅ [Readiness] 准备度分数加载成功:', {
        overall: response.score?.overall,
        evidenceCoverage: response.score?.evidenceCoverage,
        scheduleFeasibility: response.score?.scheduleFeasibility,
        transportCertainty: response.score?.transportCertainty,
        safetyRisk: response.score?.safetyRisk,
        buffers: response.score?.buffers,
        totalFindings: response.summary?.totalFindings,
      });
      
      setScoreBreakdown(response);
      
      // 如果获取到分数数据，更新 readinessData 中的分数
      if (response.score) {
        setReadinessData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            score: {
              ...prev.score,
              overall: response.score.overall,
              evidenceCoverage: response.score.evidenceCoverage,
              scheduleFeasibility: response.score.scheduleFeasibility,
              transportCertainty: response.score.transportCertainty,
              safetyRisk: response.score.safetyRisk,
              buffers: response.score.buffers,
            },
          };
        });
      }
    } catch (err: any) {
      // 忽略 AbortError
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        console.log('⏹️ [Readiness] 准备度分数请求被取消（正常）');
        return;
      }
      
      console.error('❌ [Readiness] 加载准备度分数失败:', {
        error: err?.message || err,
        response: err?.response?.data,
        status: err?.response?.status,
      });
      // 不设置错误状态，静默失败（使用默认值）
      setScoreBreakdown(null);
    } finally {
      setLoadingScoreBreakdown(false);
    }
  };

  /**
   * 加载证据列表
   * GET /trips/:id/evidence
   * 🆕 支持过滤和排序参数
   */
  const loadEvidenceData = async (tripId: string, filters?: typeof evidenceFilters) => {
    try {
      setLoadingEvidence(true);
      console.log('🔄 [Readiness] 开始加载证据列表，tripId:', tripId, 'filters:', filters);
      
      const response = await tripsApi.getEvidence(tripId, {
        limit: 100,
        ...filters,
      });
      
      console.log('✅ [Readiness] 证据列表加载成功:', {
        total: response.total,
        itemsCount: response.items?.length || 0,
      });
      console.log('📊 [Readiness] 证据详情:', JSON.stringify(response.items, null, 2));
      
      setEvidenceData(response.items || []);
    } catch (err: any) {
      console.error('❌ [Readiness] 加载证据列表失败:', {
        error: err?.message || err,
        response: err?.response?.data,
        status: err?.response?.status,
      });
      setEvidenceData([]);
    } finally {
      setLoadingEvidence(false);
    }
  };

  /**
   * 🆕 加载证据完整性检查
   * GET /trips/:id/evidence/completeness
   */
  const loadEvidenceCompleteness = async (tripId: string) => {
    try {
      setLoadingCompleteness(true);
      const data = await tripsApi.getEvidenceCompleteness(tripId);
      setCompletenessData(data);
    } catch (err: any) {
      console.error('❌ [Readiness] 加载证据完整性检查失败:', err);
      setCompletenessData(null);
    } finally {
      setLoadingCompleteness(false);
    }
  };

  /**
   * 🆕 加载证据获取建议
   * GET /trips/:id/evidence/suggestions
   */
  const loadEvidenceSuggestions = async (tripId: string) => {
    try {
      setLoadingSuggestions(true);
      const data = await tripsApi.getEvidenceSuggestions(tripId);
      setSuggestionsData(data);
    } catch (err: any) {
      console.error('❌ [Readiness] 加载证据获取建议失败:', err);
      setSuggestionsData(null);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  /**
   * 🆕 获取证据（支持异步模式）
   */
  const handleFetchEvidence = async (
    evidenceTypes: EvidenceType[],
    affectedPoiIds: number[],
    useAsync: boolean = false
  ) => {
    if (!tripId) return;

    try {
      if (useAsync) {
        // 异步模式：创建任务并开始轮询
        // 过滤掉 planning-workbench API 不支持的证据类型
        const supportedTypes = evidenceTypes.filter(
          (type) => ['weather', 'road_closure', 'opening_hours'].includes(type)
        ) as Array<'weather' | 'road_closure' | 'opening_hours'>;
        
        if (supportedTypes.length === 0) {
          toast.error('没有可获取的证据类型');
          return;
        }
        
        const result = await planningWorkbenchApi.fetchEvidence(tripId, {
          evidenceTypes: supportedTypes,
          placeIds: affectedPoiIds,
          async: true,
        });

        if ('taskId' in result) {
          setTaskProgress({
            taskId: result.taskId,
            status: 'PENDING',
            progress: { total: 0, processed: 0 },
          });
          setTaskProgressDialogOpen(true);
          startTaskProgressPolling(result.taskId);
        }
      } else {
        // 同步模式：直接获取
        // 过滤掉 planning-workbench API 不支持的证据类型
        const supportedTypes = evidenceTypes.filter(
          (type) => ['weather', 'road_closure', 'opening_hours'].includes(type)
        ) as Array<'weather' | 'road_closure' | 'opening_hours'>;
        
        if (supportedTypes.length === 0) {
          toast.error('没有可获取的证据类型');
          return;
        }
        
        await planningWorkbenchApi.fetchEvidence(tripId, {
          evidenceTypes: supportedTypes,
          placeIds: affectedPoiIds,
          async: false,
        });
        // 刷新证据列表和完整性检查
        loadEvidenceData(tripId, evidenceFilters);
        loadEvidenceCompleteness(tripId);
        loadEvidenceSuggestions(tripId);
      }
    } catch (err: any) {
      console.error('❌ [Readiness] 获取证据失败:', err);
      toast.error(err?.message || '获取证据失败');
    }
  };

  /**
   * 🆕 开始轮询任务进度
   */
  const startTaskProgressPolling = (taskId: string) => {
    // 清除之前的轮询
    if (taskProgressIntervalRef.current) {
      clearInterval(taskProgressIntervalRef.current);
    }

    // 开始轮询
    taskProgressIntervalRef.current = setInterval(async () => {
      try {
        const progress = await planningWorkbenchApi.getTaskProgress(taskId);
        setTaskProgress({
          taskId: progress.taskId,
          status: progress.status,
          progress: progress.progress,
          result: progress.result,
          error: progress.error,
        } as any); // 类型兼容性处理

        // 如果任务完成或失败，停止轮询
        if (progress.status === 'COMPLETED' || progress.status === 'FAILED' || progress.status === 'CANCELLED') {
          if (taskProgressIntervalRef.current) {
            clearInterval(taskProgressIntervalRef.current);
            taskProgressIntervalRef.current = null;
          }
          // 刷新证据列表和完整性检查
          if (progress.status === 'COMPLETED' && tripId) {
            loadEvidenceData(tripId, evidenceFilters);
            loadEvidenceCompleteness(tripId);
            loadEvidenceSuggestions(tripId);
          }
        }
      } catch (err: any) {
        console.error('❌ [Readiness] 查询任务进度失败:', err);
        // 停止轮询
        if (taskProgressIntervalRef.current) {
          clearInterval(taskProgressIntervalRef.current);
          taskProgressIntervalRef.current = null;
        }
      }
    }, 2000); // 每2秒查询一次
  };

  /**
   * 🆕 取消任务
   */
  const handleCancelTask = async (taskId: string) => {
    try {
      await planningWorkbenchApi.cancelTask(taskId);
      // 停止轮询
      if (taskProgressIntervalRef.current) {
        clearInterval(taskProgressIntervalRef.current);
        taskProgressIntervalRef.current = null;
      }
      // 更新任务状态
      if (taskProgress) {
        setTaskProgress({
          ...taskProgress,
          status: 'CANCELLED',
        });
      }
    } catch (err: any) {
      console.error('❌ [Readiness] 取消任务失败:', err);
      toast.error(err?.message || '取消任务失败');
    }
  };

  // 🆕 清理轮询
  useEffect(() => {
    return () => {
      if (taskProgressIntervalRef.current) {
        clearInterval(taskProgressIntervalRef.current);
      }
    };
  }, []);

  const loadData = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      console.log('🔄 [Readiness] 开始加载数据，tripId:', tripId);
      
      // 并行加载 trip 和 readiness 数据
      const [tripData, readinessData] = await Promise.all([
        tripsApi.getById(tripId),
        readinessApi.getTripReadiness(tripId, getLangCode()).catch((err) => {
          // 如果后端还没有实现 /readiness/trip/:tripId，则使用备用方案
          console.error('❌ [Readiness] getTripReadiness API 调用失败:', {
            tripId,
            error: err,
            message: err?.message,
            response: err?.response?.data,
            status: err?.response?.status,
            url: err?.config?.url,
          });
          return null;
        }),
      ]);
      
      setTrip(tripData);
      console.log('✅ [Readiness] Trip 数据加载成功:', tripData?.id, tripData?.destination);
      
      // 加载能力包信息（不阻塞主流程）
      loadCapabilityPacks(tripData);
      
      // 加载证据列表（不阻塞主流程）
      loadEvidenceData(tripId, evidenceFilters);
      // 🆕 加载证据完整性检查和获取建议
      loadEvidenceCompleteness(tripId);
      loadEvidenceSuggestions(tripId);
      
      // 加载能力包清单项（不阻塞主流程）
      loadCapabilityPackChecklistItems(tripId);
      
      // 加载覆盖地图数据（不阻塞主流程）
      loadCoverageMapData(tripId);
      
      // 加载准备度分数分解（不阻塞主流程）
      loadScoreBreakdown(tripId);
      
      let finalReadinessData: ReadinessData | null = null;
      
      if (readinessData) {
        // getTripReadiness 返回 ReadinessCheckResult，需要转换为 ReadinessData
        console.log('✅ [Readiness] 使用 getTripReadiness API 数据');
        console.log('📊 [Readiness] 原始 API 响应:', JSON.stringify(readinessData, null, 2));
        setRawReadinessResult(readinessData); // 保存原始数据用于展示详细信息和清单
        const convertedData = convertCheckResultToReadinessData(readinessData, tripData);
        console.log('🔄 [Readiness] 转换后的数据:', JSON.stringify(convertedData, null, 2));
        if (validateReadinessData(convertedData)) {
          finalReadinessData = convertedData;
          console.log('✅ [Readiness] 数据验证通过，使用 API 数据');
        } else {
          console.warn('⚠️ [Readiness] 数据验证失败，尝试备用方案');
        }
      } else {
        console.warn('⚠️ [Readiness] getTripReadiness 返回 null，尝试备用方案');
      }
      
      // 如果 getTripReadiness 失败或转换失败，使用备用方案
      if (!finalReadinessData) {
        console.log('🔄 [Readiness] 尝试备用方案 1: check API');
        // 备用方案1：尝试使用 check 接口
        try {
          const checkDto = buildCheckReadinessDto(tripData);
          console.log('📤 [Readiness] 调用 check API，DTO:', JSON.stringify(checkDto, null, 2));
          const checkResult = await readinessApi.check(checkDto);
          console.log('✅ [Readiness] check API 调用成功');
          console.log('📊 [Readiness] check API 响应:', JSON.stringify(checkResult, null, 2));
          setRawReadinessResult(checkResult); // 保存原始数据用于展示详细信息和清单
          // 将 check 结果转换为 ReadinessData
          finalReadinessData = convertCheckResultToReadinessData(checkResult, tripData);
          console.log('✅ [Readiness] 使用 check API 数据');
        } catch (checkErr: any) {
          console.error('❌ [Readiness] check API 调用失败:', {
            error: checkErr,
            message: checkErr?.message,
            response: checkErr?.response?.data,
            status: checkErr?.response?.status,
            url: checkErr?.config?.url,
          });
          
          console.log('🔄 [Readiness] 尝试备用方案 2: checklist + riskWarnings API');
          // 备用方案2：使用个性化清单和风险预警构建 ReadinessData
          const [checklist, riskWarnings] = await Promise.all([
            readinessApi.getPersonalizedChecklist(tripId, getLangCode()).catch((err) => {
              console.error('❌ [Readiness] getPersonalizedChecklist 失败:', err);
              return null;
            }),
            readinessApi.getRiskWarnings(tripId, { 
              lang: getLangCode(),
              userId: user?.id, // 🆕 传递用户ID用于个性化
              includeCapabilityPackHazards: true 
            }).catch((err) => {
              console.error('❌ [Readiness] getRiskWarnings 失败:', err);
              return null;
            }),
          ]);
          
          if (checklist && riskWarnings) {
            console.log('✅ [Readiness] 使用 checklist + riskWarnings API 数据');
            console.log('📊 [Readiness] checklist:', JSON.stringify(checklist, null, 2));
            console.log('📊 [Readiness] riskWarnings:', JSON.stringify(riskWarnings, null, 2));
            finalReadinessData = convertToReadinessData(checklist, riskWarnings, tripData);
          } else {
            // 如果所有 API 都失败，使用模拟数据
            console.error('❌ [Readiness] 所有 API 都失败，使用模拟数据（降级方案）');
            console.error('❌ [Readiness] checklist:', checklist ? '成功' : '失败');
            console.error('❌ [Readiness] riskWarnings:', riskWarnings ? '成功' : '失败');
            console.warn('⚠️ [Readiness] 这是降级方案，请检查后端 API 是否正常运行');
            finalReadinessData = generateMockReadinessData();
          }
        }
      }
      
      // 设置最终的数据
      if (finalReadinessData) {
        // 检查是否是模拟数据（通过检查特定的 mock 数据特征）
        const isMockData = finalReadinessData.status === 'nearly' && 
          finalReadinessData.blockers?.some(b => 
            b.id === 'blocker-1' && 
            b.title === 'Road closed on Segment 2' &&
            b.impactScope === 'Day 1 / Segment 2'
          );
        
        if (isMockData) {
          console.error('❌ [Readiness] ⚠️⚠️⚠️ 警告：当前显示的是模拟数据（Mock Data）⚠️⚠️⚠️');
          console.error('❌ [Readiness] 所有 API 调用都失败了，页面显示的是硬编码的模拟数据');
          console.error('❌ [Readiness] 请检查后端 API 是否正常运行');
          console.error('❌ [Readiness] 应该调用的 API:');
          console.error('❌ [Readiness]   1. GET /readiness/trip/:tripId');
          console.error('❌ [Readiness]   2. POST /readiness/check');
          console.error('❌ [Readiness]   3. GET /readiness/personalized-checklist?tripId=xxx');
          console.error('❌ [Readiness]   4. GET /readiness/risk-warnings?tripId=xxx');
          console.error('❌ [Readiness] 请在浏览器控制台查看详细的 API 调用日志');
          
          // 在页面上显示警告（可选）
          setTimeout(() => {
            const warningEl = document.createElement('div');
            warningEl.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #fef3c7; border: 2px solid #f59e0b; padding: 16px; border-radius: 8px; z-index: 9999; max-width: 400px;';
            warningEl.innerHTML = `
              <div style="font-weight: bold; color: #92400e; margin-bottom: 8px;">⚠️ 警告：显示的是模拟数据</div>
              <div style="font-size: 12px; color: #78350f;">所有 API 调用都失败了，页面显示的是硬编码的模拟数据。请检查后端 API 是否正常运行。</div>
              <button onclick="this.parentElement.remove()" style="margin-top: 8px; padding: 4px 8px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer;">关闭</button>
            `;
            document.body.appendChild(warningEl);
          }, 1000);
        } else {
          console.log('✅ [Readiness] 使用真实 API 数据');
        }
        
        setReadinessData(finalReadinessData);
      } else {
        // 如果所有方案都失败，使用模拟数据（降级方案）
        console.error('❌ [Readiness] 所有数据加载方法都失败，使用模拟数据（降级方案）');
        console.warn('⚠️ [Readiness] 这是降级方案，请检查 API 可用性并修复问题');
        setReadinessData(generateMockReadinessData());
      }
    } catch (err: any) {
      console.error('❌ [Readiness] 加载准备度数据失败:', err);
      console.error('❌ [Readiness] 错误详情:', {
        message: err?.message,
        stack: err?.stack,
        response: err?.response?.data,
        status: err?.response?.status,
      });
      // 出错时使用模拟数据作为降级方案
      console.warn('⚠️ [Readiness] 使用模拟数据作为降级方案。这是临时解决方案');
      setReadinessData(generateMockReadinessData());
    } finally {
      setLoading(false);
      console.log('✅ [Readiness] 数据加载流程完成');
    }
  };

  // ==================== 分数计算配置 ====================
  // 分数计算公式的权重（如果后端不返回分数，使用这些权重计算）
  const SCORE_WEIGHTS = {
    BLOCKER_PENALTY: 20,      // 每个 blocker 扣 20 分
    HIGH_RISK_PENALTY: 10,    // 每个高风险扣 10 分
    RISK_PENALTY: 5,          // 每个风险扣 5 分
    HIGH_RISK_SAFETY_PENALTY: 20,  // 安全风险计算中，每个高风险扣 20 分
  } as const;

  // ⚠️ 默认分数值（降级方案 - 仅当无法从 API 获取或基于实际数据计算时使用）
  // 注意：这些值应该从后端 API 返回，如果后端不返回，应该基于实际数据计算
  // TODO: 当后端 API 支持返回这些分数时，移除这些硬编码值
  const DEFAULT_SCORES = {
    EVIDENCE_COVERAGE: 85,      // 证据覆盖率（应该基于 evidence 数量计算）
    SCHEDULE_FEASIBILITY: 70,   // 行程可行性（应该基于行程项数量和质量计算）
    TRANSPORT_CERTAINTY: 65,    // 交通确定性（应该基于交通方式计算）
    BUFFERS: 60,                // 缓冲时间（应该基于行程密度计算）
  } as const;

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
      // 根据后端文档，finding 有 category 字段
      const findingId = finding.destinationId || finding.packId || finding.category || `finding-${findingIndex}`;
      finding.blockers?.forEach((item, index: number) => {
        // 从 finding 的 category 推断类别
        const category = finding.category === 'entry' ? 'ticket' : 
                        finding.category === 'safety' ? 'road' : 
                        finding.category === 'health' ? 'lodging' :
                        'other' as const;
        
        // 处理 evidence：根据后端文档，evidence 是字符串
        // 兼容旧格式（可能是对象数组）
        let evidenceSource = 'system';
        if (typeof item.evidence === 'string') {
          evidenceSource = item.evidence;
        } else if (item.evidence && typeof item.evidence === 'object' && 'length' in item.evidence) {
          // 兼容旧格式：evidence 可能是数组
          const evidenceArray = item.evidence as any[];
          if (evidenceArray.length > 0) {
            const firstEvidence = evidenceArray[0] as any;
            evidenceSource = firstEvidence?.sourceId || 'system';
          }
        }
        
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
        // 根据后端文档，finding 有 category 字段
        const findingId = finding.destinationId || finding.packId || finding.category || `finding-${findingIndex}`;
        // 处理 evidence：根据后端文档，evidence 是字符串
        // 兼容旧格式（可能是对象数组）
        let evidenceSource = 'system';
        if (typeof item.evidence === 'string') {
          evidenceSource = item.evidence;
        } else if (item.evidence && typeof item.evidence === 'object' && 'length' in item.evidence) {
          // 兼容旧格式：evidence 可能是数组
          const evidenceArray = item.evidence as any[];
          if (evidenceArray.length > 0) {
            const firstEvidence = evidenceArray[0] as any;
            evidenceSource = firstEvidence?.sourceId || 'system';
          }
        }
        
        // 从 finding 的 category 推断类别
        const category = finding.category === 'entry' ? 'ticket' : 
                        finding.category === 'safety' ? 'road' : 
                        finding.category === 'health' ? 'lodging' :
                        'other' as const;
        
        watchlist.push({
          id: `watch-${findingId}-${index}`,
          title: item.message,
          severity: 'medium' as const,
          impactScope: trip.destination || t('dashboard.readiness.page.unknown'),
          evidenceSummary: {
            source: evidenceSource,
            timestamp: new Date().toISOString(),
          },
          category,
        });
      });
    });

    // 计算分数
    const riskCount = checkResult?.risks?.length || 0;
    const highRiskCount = checkResult?.risks?.filter((r) => r.severity === 'high').length || 0;
    
    // 使用配置的权重计算总分
    const overallScore = Math.max(0, 
      100 - 
      (totalBlockers * SCORE_WEIGHTS.BLOCKER_PENALTY) - 
      (highRiskCount * SCORE_WEIGHTS.HIGH_RISK_PENALTY) - 
      (riskCount * SCORE_WEIGHTS.RISK_PENALTY)
    );
    
    // 计算安全风险分数
    const safetyRisk = Math.max(0, 100 - (highRiskCount * SCORE_WEIGHTS.HIGH_RISK_SAFETY_PENALTY));
    
    // TODO: 以下分数应该从后端 API 返回，或基于实际数据计算
    // 当前使用默认值，但应该：
    // - evidenceCoverage: 基于 evidence 数量/覆盖率计算
    // - scheduleFeasibility: 基于行程项数量、时间冲突等计算
    // - transportCertainty: 基于交通方式、预订状态等计算
    // - buffers: 基于行程密度、休息时间等计算
    const evidenceCount = checkResult?.findings?.reduce((sum, f) => 
      sum + (f.blockers?.length || 0) + (f.must?.length || 0) + (f.should?.length || 0), 0
    ) || 0;
    const hasEvidence = evidenceCount > 0;
    
    // 基于实际数据计算 evidenceCoverage（如果有 evidence 则使用默认值，否则为 0）
    const evidenceCoverage = hasEvidence ? DEFAULT_SCORES.EVIDENCE_COVERAGE : 0;
    
    // 基于行程数据计算 scheduleFeasibility
    const tripDays = trip?.TripDay?.length || 0;
    const hasSchedule = tripDays > 0;
    const scheduleFeasibility = hasSchedule ? DEFAULT_SCORES.SCHEDULE_FEASIBILITY : 0;

    return {
      status,
      score: {
        overall: overallScore,
        evidenceCoverage,
        scheduleFeasibility,
        transportCertainty: DEFAULT_SCORES.TRANSPORT_CERTAINTY,  // TODO: 基于实际数据计算
        safetyRisk,
        buffers: DEFAULT_SCORES.BUFFERS,  // TODO: 基于实际数据计算
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
      // 处理 evidence：根据后端文档，evidence 是字符串
      // 兼容旧格式（可能是对象数组）
      let evidenceSource = 'system';
      if (typeof item.evidence === 'string') {
        evidenceSource = item.evidence;
      } else if (item.evidence && typeof item.evidence === 'object' && 'length' in item.evidence) {
        // 兼容旧格式：evidence 可能是数组
        const evidenceArray = item.evidence as any[];
        if (evidenceArray.length > 0) {
          const firstEvidence = evidenceArray[0] as any;
          evidenceSource = firstEvidence?.sourceId || 'system';
        }
      }
      
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
    
    // 使用配置的权重计算总分
    const overallScore = Math.max(0, 
      100 - 
      (totalBlockers * SCORE_WEIGHTS.BLOCKER_PENALTY) - 
      (highRiskCount * SCORE_WEIGHTS.HIGH_RISK_PENALTY) - 
      (riskCount * SCORE_WEIGHTS.RISK_PENALTY)
    );
    
    // 计算安全风险分数
    const safetyRisk = Math.max(0, 100 - (highRiskCount * SCORE_WEIGHTS.HIGH_RISK_SAFETY_PENALTY));
    
    // TODO: 以下分数应该从后端 API 返回，或基于实际数据计算
    const evidenceCoverage = checklist ? DEFAULT_SCORES.EVIDENCE_COVERAGE : 0;
    const scheduleFeasibility = trip?.TripDay?.length > 0 ? DEFAULT_SCORES.SCHEDULE_FEASIBILITY : 0;

    return {
      status,
      score: {
        overall: overallScore,
        evidenceCoverage,
        scheduleFeasibility,
        transportCertainty: DEFAULT_SCORES.TRANSPORT_CERTAINTY,  // TODO: 基于实际数据计算
        safetyRisk,
        buffers: DEFAULT_SCORES.BUFFERS,  // TODO: 基于实际数据计算
      },
      blockers,
      watchlist: status === 'ready' ? watchlist : undefined,
    };
  };

  /**
   * 生成模拟数据（降级方案）
   * 
   * ⚠️ 警告：这是降级方案，仅在所有 API 都失败时使用
   * 应该尽快修复 API 问题，而不是依赖模拟数据
   * 
   * TODO: 考虑移除此函数，改为显示友好的错误提示
   */
  const generateMockReadinessData = (): ReadinessData => {
    const status = 'nearly' as ReadinessData['status'];
    const isReady = (status as string) === 'ready';
    
    // 使用配置的默认分数，而不是硬编码
    return {
      status,
      score: {
        overall: 72,  // 基于默认值计算的示例分数
        evidenceCoverage: DEFAULT_SCORES.EVIDENCE_COVERAGE,
        scheduleFeasibility: DEFAULT_SCORES.SCHEDULE_FEASIBILITY,
        transportCertainty: DEFAULT_SCORES.TRANSPORT_CERTAINTY,
        safetyRisk: 80,  // 示例值
        buffers: DEFAULT_SCORES.BUFFERS,
      },
      executableWindow: {
        start: '08:30',  // 示例时间窗口
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
      
      // 保存阻塞项描述
      setSelectedBlockerMessage(response.blockerMessage || null);
      
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
      
      // 显示错误信息，而不是使用模拟数据
      console.error('Failed to load repair options, showing error instead of mock data');
      
      // 清除之前选中的 blocker，避免显示不相关的数据
      setReadinessData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          repairOptions: undefined,
          selectedBlockerId: undefined,  // 使用 undefined 而不是 null，匹配类型定义
        };
      });
      
      // 不打开 sheet，因为获取失败
      return;
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

  // 刷新单条证据（暂时保留以供将来使用）
  const _handleRefreshSingleEvidence = async (evidenceId: string) => {
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
  void _handleRefreshSingleEvidence; // 抑制未使用警告

  /**
   * 将能力包规则添加到准备清单
   * POST /readiness/trip/:tripId/checklist/add-from-capability-pack
   */
  const handleAddCapabilityPackRulesToChecklist = async (
    packType: string,
    rules: Array<{ id: string; level: string; message: string }>
  ) => {
    if (!tripId) return;
    
    try {
      setAddingToChecklist(packType);
      console.log('📤 [Readiness] 添加能力包规则到清单:', { packType, rulesCount: rules.length });
      
      const response = await readinessApi.addCapabilityPackRulesToChecklist(tripId, {
        packType,
        rules: rules.map(r => ({
          id: r.id,
          level: r.level as 'blocker' | 'must' | 'should' | 'optional',
          message: r.message,
        })),
      });
      
      console.log('✅ [Readiness] 添加成功:', response);
      
      // 重新加载清单项
      if (tripId) {
        loadCapabilityPackChecklistItems(tripId);
      }
      
      // 显示成功提示
      alert(t('dashboard.readiness.page.addToChecklistSuccess', {
        defaultValue: `已成功添加 ${response.addedCount} 条规则到准备清单`,
        count: response.addedCount,
      }));
      
    } catch (err: any) {
      console.error('❌ [Readiness] 添加能力包规则失败:', err);
      
      // 显示错误提示
      alert(t('dashboard.readiness.page.addToChecklistFailed', {
        defaultValue: '添加失败，请稍后重试',
      }));
    } finally {
      setAddingToChecklist(null);
    }
  };

  const displayedBlockers = showAllBlockers 
    ? readinessData?.blockers || []
    : (readinessData?.blockers || []).slice(0, 3);

  if (loading) {
    return <ReadinessPageSkeleton />;
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

              {isReady ? (
                <div className="space-y-3">
                  {/* 优先使用 scoreBreakdown 的 findings 和 risks */}
                  {scoreBreakdown && (scoreBreakdown.findings?.length > 0 || scoreBreakdown.risks?.length > 0) ? (
                    <>
                      {/* 显示 must, should, optional（兼容 warning, suggestion） */}
                      {scoreBreakdown.findings?.filter(f => f.type !== 'blocker').map((finding) => {
                        // ✅ 统一类型映射：warning → must, suggestion → should
                        const normalizedType = finding.type === 'warning' ? 'must' : 
                                              finding.type === 'suggestion' ? 'should' : 
                                              finding.type;
                        return (
                          <Card key={finding.id} className="border-l-4 border-l-yellow-500">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant={normalizedType === 'must' ? 'secondary' : 'outline'} className="text-xs">
                                      {t(`dashboard.readiness.page.findingType.${normalizedType}`, normalizedType)}
                                    </Badge>
                                    {finding.severity && (
                                      <Badge variant="outline" className="text-xs">
                                        {t(`dashboard.readiness.page.severity.${finding.severity}`, finding.severity)}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium">{finding.message}</p>
                                  {finding.actionRequired && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {t('dashboard.readiness.page.actionRequired', { defaultValue: '建议操作' })}: {finding.actionRequired}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleFixBlocker(finding.id)}
                                >
                                  {t('dashboard.readiness.page.fix', { defaultValue: '修复' })}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      {/* 显示风险 - 🆕 使用 RiskCard 组件以支持增强字段 */}
                      {(() => {
                        // 🆕 优先使用增强版风险预警数据
                        const risksToDisplay = riskWarnings?.risks && riskWarnings.risks.length > 0
                          ? riskWarnings.risks
                          : (scoreBreakdown?.risks || []).map(risk => ({
                              ...risk,
                              // 将 ScoreRisk 转换为 EnhancedRisk 格式
                              affectedPois: Array.isArray(risk.affectedPois) && typeof risk.affectedPois[0] === 'string'
                                ? risk.affectedPois.map((id, idx) => ({ id, name: id }))
                                : risk.affectedPois,
                            })) as EnhancedRisk[];
                        
                        if (risksToDisplay.length === 0) return null;
                        
                        return (
                          <>
                            {risksToDisplay.map((risk) => (
                              <RiskCard key={risk.id || risk.type} risk={risk} />
                            ))}
                            {/* 🆕 显示所有官方来源汇总 */}
                            {riskWarnings?.packSources && riskWarnings.packSources.length > 0 && (
                              <Card className="border-blue-200 bg-blue-50/50">
                                <CardContent className="p-4">
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                      <span>📚</span>
                                      <span>{t('dashboard.readiness.page.allOfficialSources', { defaultValue: '所有官方来源' })}</span>
                                    </h4>
                                    <ul className="space-y-2">
                                      {riskWarnings.packSources.map((source, index) => (
                                        <li key={source.sourceId || index} className="text-xs text-muted-foreground">
                                          <div className="flex items-start gap-2">
                                            <span className="text-muted-foreground/50 mt-1">•</span>
                                            <div className="flex-1">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-medium text-foreground">
                                                  {source.authority}
                                                </span>
                                                {source.title && (
                                                  <span className="text-muted-foreground">
                                                    - {source.title}
                                                  </span>
                                                )}
                                              </div>
                                              {source.canonicalUrl && (
                                                <a
                                                  href={source.canonicalUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline mt-0.5"
                                                >
                                                  <ExternalLink className="w-3 h-3" />
                                                  <span className="truncate max-w-[200px]">{source.canonicalUrl}</span>
                                                </a>
                                              )}
                                            </div>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </>
                        );
                      })()}
                    </>
                  ) : readinessData.watchlist && readinessData.watchlist.length > 0 ? (
                    // 回退到旧的 watchlist 数据
                    readinessData.watchlist.map((blocker) => (
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
                  {/* 显示阻塞项描述 */}
                  {selectedBlockerMessage && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                        {t('dashboard.readiness.page.blockerToFix', { defaultValue: '待解决问题' })}:
                      </p>
                      <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                        {selectedBlockerMessage}
                      </p>
                    </div>
                  )}
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
            <Tabs 
              value={activeTab} 
              onValueChange={(value) => {
                setActiveTab(value);
                // 🆕 更新 URL 参数
                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.set('tab', value);
                navigate(`?${newSearchParams.toString()}`, { replace: true });
              }} 
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="breakdown">{t('dashboard.readiness.page.tabs.readinessBreakdown')}</TabsTrigger>
                <TabsTrigger value="capability">{t('dashboard.readiness.page.tabs.capabilityPacks')}</TabsTrigger>
                <TabsTrigger value="evidence">{t('dashboard.readiness.page.tabs.evidenceChain')}</TabsTrigger>
                <TabsTrigger value="coverage">{t('dashboard.readiness.page.tabs.coverageMap')}</TabsTrigger>
                <TabsTrigger value="packing">{t('dashboard.readiness.page.tabs.packingList')}</TabsTrigger>
              </TabsList>

              <TabsContent value="breakdown" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{t('dashboard.readiness.page.scoreBreakdown.title')}</CardTitle>
                        <CardDescription>
                          {t('dashboard.readiness.page.scoreBreakdown.description')}
                        </CardDescription>
                      </div>
                      {loadingScoreBreakdown && (
                        <Spinner className="w-4 h-4" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <BreakdownBarList
                      score={readinessData.score}
                      onShowBlockers={(dimension) => {
                        setSelectedDimension(dimension);
                      }}
                    />
                    
                    {/* 来自 API 的发现项 */}
                    {scoreBreakdown?.findings && scoreBreakdown.findings.length > 0 && (
                      <div className="mt-6 pt-6 border-t">
                        <h4 className="text-sm font-medium mb-3">
                          {t('dashboard.readiness.page.findingsTitle', { defaultValue: '发现项' })}
                          <span className="text-muted-foreground font-normal ml-2">
                            ({scoreBreakdown.findings.length})
                          </span>
                        </h4>
                        <div className="space-y-2">
                          {scoreBreakdown.findings.slice(0, 5).map((finding) => {
                            // ✅ 统一类型映射：warning → must, suggestion → should
                            const findingType = finding.type === 'warning' ? 'must' : 
                                               finding.type === 'suggestion' ? 'should' : 
                                               finding.type;
                            return (
                            <div
                              key={finding.id}
                              className={`p-3 rounded-lg border ${
                                findingType === 'blocker' ? 'bg-red-50 border-red-200' :
                                findingType === 'must' ? 'bg-amber-50 border-amber-200' :
                                (findingType === 'should' || findingType === 'optional') ? 'bg-gray-50 border-gray-200' :
                                'bg-blue-50 border-blue-200'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    finding.severity === 'high' ? 'border-red-400 text-red-600' :
                                    finding.severity === 'medium' ? 'border-yellow-400 text-yellow-600' :
                                    'border-blue-400 text-blue-600'
                                  }`}
                                >
                                  {t(`dashboard.readiness.page.findingType.${findingType}`, findingType)}
                                </Badge>
                                <div className="flex-1">
                                  <p className="text-sm">{finding.message}</p>
                                  {finding.actionRequired && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {t('dashboard.readiness.page.actionRequired', { defaultValue: '建议操作' })}: {finding.actionRequired}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            );
                          })}
                          {scoreBreakdown.findings.length > 5 && (
                            <p className="text-xs text-muted-foreground text-center">
                              {t('dashboard.readiness.page.moreFindings', { 
                                count: scoreBreakdown.findings.length - 5,
                                defaultValue: `还有 ${scoreBreakdown.findings.length - 5} 项...`
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* 计算时间 */}
                    {scoreBreakdown?.calculatedAt && (
                      <p className="text-xs text-muted-foreground mt-4 text-right">
                        {t('dashboard.readiness.page.calculatedAt', { defaultValue: '计算时间' })}: {new Date(scoreBreakdown.calculatedAt).toLocaleString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="capability" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('dashboard.readiness.page.tabs.capabilityPacks')}</CardTitle>
                    <CardDescription>
                      {t('dashboard.readiness.page.capabilityPacksDescription', {
                        defaultValue: '根据行程特征自动触发的系统能力包，帮助您为特殊旅行场景做好准备'
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingCapabilityPacks ? (
                      <div className="flex items-center justify-center py-8">
                        <LogoLoading size={32} />
                      </div>
                    ) : (evaluatedPacks.length > 0 || capabilityPacks.length > 0) ? (
                      <div className="space-y-4">
                        {/* 触发统计 */}
                        <div className="text-sm text-muted-foreground mb-4">
                          {evaluatedPacks.length > 0 ? (
                            t('dashboard.readiness.page.packsTriggered', {
                              triggered: evaluatedPacks.filter((p) => p.triggered).length,
                              total: evaluatedPacks.length,
                            })
                          ) : (
                            t('dashboard.readiness.page.noPacksTriggered', {
                              defaultValue: '当前行程未触发任何能力包',
                            })
                          )}
                        </div>
                        
                        {/* 触发的能力包详情 */}
                        {evaluatedPacks.filter(p => p.triggered).length > 0 && (
                          <div className="space-y-4">
                            <h4 className="text-sm font-medium">
                              {t('dashboard.readiness.page.triggeredPacksTitle', { defaultValue: '已触发的能力包' })}
                            </h4>
                            {evaluatedPacks.filter(p => p.triggered).map((result, index) => {
                              // 从能力包列表中查找详细信息
                              const packInfo = capabilityPacks.find(p => p.type === result.packType);
                              // 优先使用翻译，其次使用 API 返回的 displayName
                              const displayName = t(`dashboard.readiness.page.capabilityPackName.${result.packType}`, { 
                                defaultValue: packInfo?.displayName || result.packType 
                              });
                              const description = packInfo?.description || '';
                              
                              return (
                                <Card key={index} className="border-primary">
                                  <CardContent className="p-4">
                                    <div className="space-y-3">
                                      {/* 能力包标题和状态 */}
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-sm">{displayName}</h3>
                                            <Badge className="bg-primary text-primary-foreground text-xs">
                                              {t('dashboard.readiness.page.triggered')}
                                            </Badge>
                                          </div>
                                          {description && (
                                            <p className="text-xs text-muted-foreground">
                                              {description}
                                            </p>
                                          )}
                                          {/* 触发原因（新增） */}
                                          {result.triggerReason && (
                                            <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                              <span className="font-medium">
                                                {t('dashboard.readiness.page.triggerReason', { defaultValue: '触发原因' })}:
                                              </span>
                                              <span>{result.triggerReason}</span>
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* 触发的规则 */}
                                      {result.rules && result.rules.length > 0 && (
                                        <div className="space-y-2">
                                          <h4 className="text-xs font-medium text-muted-foreground">
                                            {t('dashboard.readiness.page.triggeredRules', { defaultValue: '触发的规则' })}
                                          </h4>
                                          <div className="space-y-1">
                                            {result.rules.filter(r => r.triggered).map((rule, ruleIndex) => (
                                              <div
                                                key={ruleIndex}
                                                className={`p-2 rounded text-xs ${
                                                  rule.level === 'blocker' ? 'bg-red-50 border border-red-200' :
                                                  rule.level === 'must' ? 'bg-orange-50 border border-orange-200' :
                                                  rule.level === 'should' ? 'bg-yellow-50 border border-yellow-200' :
                                                  'bg-gray-50 border border-gray-200'
                                                }`}
                                              >
                                                <div className="flex items-start gap-2">
                                                  <Badge
                                                    variant="outline"
                                                    className={`text-[10px] shrink-0 ${
                                                      rule.level === 'blocker' ? 'border-red-500 text-red-700' :
                                                      rule.level === 'must' ? 'border-orange-500 text-orange-700' :
                                                      rule.level === 'should' ? 'border-yellow-600 text-yellow-700' :
                                                      'border-gray-500 text-gray-700'
                                                    }`}
                                                  >
                                                    {t(`dashboard.readiness.page.ruleLevel.${rule.level}`, { defaultValue: rule.level })}
                                                  </Badge>
                                                  <span className="flex-1">{rule.message}</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* 危险/风险警告 */}
                                      {result.hazards && result.hazards.length > 0 && (
                                        <div className="space-y-2">
                                          <h4 className="text-xs font-medium text-muted-foreground">
                                            {t('dashboard.readiness.page.hazards', { defaultValue: '风险警告' })}
                                          </h4>
                                          <div className="space-y-1">
                                            {result.hazards.map((hazard, hazardIndex) => (
                                              <div
                                                key={hazardIndex}
                                                className={`p-2 rounded text-xs flex items-start gap-2 ${
                                                  hazard.severity === 'high' ? 'bg-red-50 border border-red-200' :
                                                  hazard.severity === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                                                  'bg-blue-50 border border-blue-200'
                                                }`}
                                              >
                                                <AlertTriangle className={`h-3 w-3 shrink-0 mt-0.5 ${
                                                  hazard.severity === 'high' ? 'text-red-600' :
                                                  hazard.severity === 'medium' ? 'text-yellow-600' :
                                                  'text-blue-600'
                                                }`} />
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-1 mb-0.5">
                                                    <span className="font-medium">
                                                      {t(`dashboard.readiness.page.hazardType.${hazard.type}`, { defaultValue: hazard.type })}
                                                    </span>
                                                    <Badge
                                                      variant="outline"
                                                      className={`text-[10px] ${
                                                        hazard.severity === 'high' ? 'border-red-500 text-red-700' :
                                                        hazard.severity === 'medium' ? 'border-yellow-600 text-yellow-700' :
                                                        'border-blue-500 text-blue-700'
                                                      }`}
                                                    >
                                                      {t(`dashboard.readiness.page.hazardSeverity.${hazard.severity}`, { defaultValue: hazard.severity })}
                                                    </Badge>
                                                  </div>
                                                  <p className="text-muted-foreground">{hazard.summary}</p>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* 操作按钮 */}
                                      <div className="flex items-center gap-2 pt-2 border-t">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-xs"
                                          disabled={addingToChecklist === result.packType || !result.rules?.length}
                                          onClick={() => {
                                            if (result.rules && result.rules.length > 0) {
                                              handleAddCapabilityPackRulesToChecklist(
                                                result.packType,
                                                result.rules.filter(r => r.triggered)
                                              );
                                            }
                                          }}
                                        >
                                          {addingToChecklist === result.packType ? (
                                            <Spinner className="h-3 w-3 mr-1" />
                                          ) : (
                                            <ListChecks className="h-3 w-3 mr-1" />
                                          )}
                                          {addingToChecklist === result.packType
                                            ? t('dashboard.readiness.page.adding', { defaultValue: '添加中...' })
                                            : t('dashboard.readiness.page.addRulesToChecklist', { defaultValue: '添加到清单' })
                                          }
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-xs"
                                          onClick={() => setActiveTab('evidence')}
                                        >
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          {t('dashboard.readiness.page.viewInEvidenceChain', { defaultValue: '查看证据' })}
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* 未触发任何能力包时的友好提示 */}
                        {evaluatedPacks.filter(p => p.triggered).length === 0 && (
                          <div className="text-center py-6 bg-green-50 rounded-lg border border-green-100">
                            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                            <p className="text-sm font-medium text-green-700">
                              {t('dashboard.readiness.page.noSpecialPreparation', { 
                                defaultValue: '您的行程无需特殊准备' 
                              })}
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              {t('dashboard.readiness.page.noSpecialPreparationHint', { 
                                defaultValue: '当前行程不涉及高海拔、偏远地区、季节性道路等特殊场景' 
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        {capabilityPacksError ? (
                          <>
                            <p className="text-sm text-red-600 mb-2">⚠️ {capabilityPacksError}</p>
                            <p className="text-xs">请检查浏览器控制台查看详细错误信息</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm">{t('dashboard.readiness.page.noCapabilityPacksAvailable')}</p>
                            <p className="text-xs mt-2">
                              对于目的地 {trip?.destination || '未知'}，如果应该有能力包数据，请检查：
                            </p>
                            <ul className="text-xs mt-2 text-left max-w-md mx-auto space-y-1">
                              <li>• 后端 API 是否正常运行</li>
                              <li>• GET /readiness/capability-packs 接口是否实现</li>
                              <li>• POST /readiness/capability-packs/evaluate 接口是否实现</li>
                              <li>• 浏览器控制台的 API 调用日志</li>
                            </ul>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* 
                      三人格分析 - 已移除
                      
                      产品评估结论：
                      1. 能力包卡片已经清晰展示了规则和风险
                      2. 三人格分析在此场景下造成信息重复
                      3. 三人格更适合在规划工作台中作为路线级决策辅助
                      
                      如需恢复，取消以下注释：
                      {evaluatedPacks.filter(p => p.triggered).length > 0 && (
                        <CapabilityPackPersonaInsights
                          evaluatedPacks={evaluatedPacks}
                          capabilityPacks={capabilityPacks}
                          className="mt-6 pt-6 border-t"
                        />
                      )}
                    */}
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
                      {/* 🆕 免责声明（必须显示） */}
                      {rawReadinessResult && rawReadinessResult.disclaimer && (
                        <ReadinessDisclaimerComponent disclaimer={rawReadinessResult.disclaimer} />
                      )}

                      {/* Risks Section */}
                      {rawReadinessResult && rawReadinessResult.risks && rawReadinessResult.risks.length > 0 && (
                    <div className="space-y-3">
                          <h3 className="text-sm font-semibold">{t('dashboard.readiness.page.risks')}</h3>
                          <div className="space-y-3">
                            {rawReadinessResult.risks.map((risk, index) => (
                              <RiskCard key={index} risk={risk} />
                            ))}
                          </div>
                          {/* 🆕 显示所有官方来源汇总 */}
                          {riskWarnings?.packSources && riskWarnings.packSources.length > 0 && (
                            <Card className="border-blue-200 bg-blue-50/50 mt-4">
                              <CardContent className="p-4">
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <span>📚</span>
                                    <span>{t('dashboard.readiness.page.allOfficialSources', { defaultValue: '所有官方来源' })}</span>
                                  </h4>
                                  <ul className="space-y-2">
                                    {riskWarnings.packSources.map((source, index) => (
                                      <li key={source.sourceId || index} className="text-xs text-muted-foreground">
                                        <div className="flex items-start gap-2">
                                          <span className="text-muted-foreground/50 mt-1">•</span>
                                          <div className="flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="font-medium text-foreground">
                                                {source.authority}
                                              </span>
                                              {source.title && (
                                                <span className="text-muted-foreground">
                                                  - {source.title}
                                                </span>
                                              )}
                                            </div>
                                            {source.canonicalUrl && (
                                              <a
                                                href={source.canonicalUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline mt-0.5"
                                              >
                                                <ExternalLink className="w-3 h-3" />
                                                <span className="truncate max-w-[200px]">{source.canonicalUrl}</span>
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}

                      {/* Capability Pack Checklist Items Section */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold">
                          {t('dashboard.readiness.page.capabilityPackChecklist', { defaultValue: '能力包准备清单' })}
                        </h3>
                        {loadingChecklistItems ? (
                          <div className="flex items-center justify-center py-4">
                            <Spinner className="w-5 h-5" />
                          </div>
                        ) : capabilityPackChecklistItems.length > 0 ? (
                          <div className="space-y-2">
                            {capabilityPackChecklistItems.map((item) => (
                              <div 
                                key={item.id}
                                className={`p-3 border rounded-lg text-sm ${
                                  item.checked ? 'bg-green-50 border-green-200' :
                                  item.level === 'blocker' ? 'bg-red-50 border-red-200' :
                                  item.level === 'must' ? 'bg-orange-50 border-orange-200' :
                                  item.level === 'should' ? 'bg-yellow-50 border-yellow-200' :
                                  'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={item.checked}
                                    onChange={async (e) => {
                                      if (!tripId) return;
                                      try {
                                        await readinessApi.updateCapabilityPackChecklistItemStatus(
                                          tripId,
                                          item.id,
                                          e.target.checked
                                        );
                                        // 重新加载清单项
                                        loadCapabilityPackChecklistItems(tripId);
                                      } catch (err) {
                                        console.error('更新清单项状态失败:', err);
                                      }
                                    }}
                                    className="mt-0.5 h-4 w-4 rounded border-gray-300"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] ${
                                          item.level === 'blocker' ? 'border-red-500 text-red-700' :
                                          item.level === 'must' ? 'border-orange-500 text-orange-700' :
                                          item.level === 'should' ? 'border-yellow-600 text-yellow-700' :
                                          'border-gray-500 text-gray-700'
                                        }`}
                                      >
                                        {t(`dashboard.readiness.page.ruleLevel.${item.level}`, { defaultValue: item.level })}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {t(`dashboard.readiness.page.capabilityPackName.${item.sourcePackType}`, { 
                                          defaultValue: item.sourcePackType 
                                        })}
                                      </span>
                                    </div>
                                    <p className={item.checked ? 'line-through text-muted-foreground' : ''}>
                                      {item.message}
                                    </p>
                                    {item.tasks && item.tasks.length > 0 && (
                                      <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                                        {item.tasks.map((task, taskIndex) => (
                                          <li key={taskIndex} className="flex items-start gap-1">
                                            <span>•</span>
                                            <span>{task}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg bg-muted/30">
                            {t('dashboard.readiness.page.noCapabilityPackChecklist', { 
                              defaultValue: '暂无能力包清单项，可在"能力包"标签页中添加' 
                            })}
                          </div>
                        )}
                      </div>

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
                                      tripId={tripId || undefined}
                                      onFindingUpdated={async (findingId, updatedFinding) => {
                                        // 重新加载数据以反映更新
                                        await loadData();
                                      }}
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
                                      tripId={tripId || undefined}
                                      onFindingUpdated={async (findingId, updatedFinding) => {
                                        // 重新加载数据以反映更新
                                        await loadData();
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 🆕 证据完整性检查卡片 */}
                      {completenessData && (
                        <EvidenceCompletenessCard
                          completenessScore={completenessData.completenessScore}
                          missingEvidence={completenessData.missingEvidence}
                          recommendations={completenessData.recommendations}
                          onFetchEvidence={(evidenceTypes, affectedPois) =>
                            handleFetchEvidence(evidenceTypes, affectedPois, false)
                          }
                          loading={loadingCompleteness}
                        />
                      )}

                      {/* 🆕 证据获取建议卡片 */}
                      {suggestionsData && (
                        <EvidenceSuggestionsCard
                          hasMissingEvidence={suggestionsData.hasMissingEvidence}
                          completenessScore={suggestionsData.completenessScore}
                          suggestions={suggestionsData.suggestions}
                          bulkFetchSuggestion={suggestionsData.bulkFetchSuggestion}
                          onFetchEvidence={(evidenceTypes, affectedPoiIds) =>
                            handleFetchEvidence(evidenceTypes, affectedPoiIds, false)
                          }
                          onBulkFetch={(evidenceTypes, affectedPoiIds) =>
                            handleFetchEvidence(evidenceTypes, affectedPoiIds, true)
                          }
                          loading={loadingSuggestions}
                        />
                      )}

                      {/* 🆕 冰岛官方信息源（仅冰岛行程） */}
                      {isIceland && trip && (
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">冰岛官方信息源</CardTitle>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const params = inferIcelandInfoParams(trip);
                                  icelandInfo.fetchAll(params);
                                }}
                                disabled={
                                  icelandInfo.weather.loading ||
                                  icelandInfo.safety.loading ||
                                  icelandInfo.roadConditions.loading
                                }
                                className="h-8 text-xs"
                              >
                                {(icelandInfo.weather.loading ||
                                  icelandInfo.safety.loading ||
                                  icelandInfo.roadConditions.loading) ? (
                                  <>
                                    <Spinner className="mr-2 h-3 w-3" />
                                    刷新中...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="mr-2 h-3 w-3" />
                                    刷新
                                  </>
                                )}
                              </Button>
                            </div>
                            <CardDescription className="text-xs">
                              实时获取冰岛官方天气、安全和路况信息
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* 天气信息 */}
                            {icelandInfo.weather.loading && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Spinner className="h-4 w-4" />
                                <span>加载天气数据...</span>
                              </div>
                            )}
                            {icelandInfo.weather.error && (
                              <div className="text-sm text-red-500">
                                天气数据加载失败: {icelandInfo.weather.error}
                              </div>
                            )}
                            {icelandInfo.weather.data && (
                              <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                                <Cloud className="h-4 w-4 text-blue-600 mt-0.5" />
                                <div className="flex-1">
                                  <div className="text-xs font-semibold text-gray-700 mb-1">高地天气预报</div>
                                  <div className="text-xs text-gray-600">
                                    {icelandInfo.weather.data.station.name}: {Math.round(icelandInfo.weather.data.current.temperature)}°C
                                    {icelandInfo.weather.data.current.windSpeedKmh && (
                                      <span className="ml-2">
                                        ，风速 {Math.round(icelandInfo.weather.data.current.windSpeedKmh)} km/h
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 安全警报 */}
                            {icelandInfo.safety.loading && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Spinner className="h-4 w-4" />
                                <span>加载安全信息...</span>
                              </div>
                            )}
                            {icelandInfo.safety.error && (
                              <div className="text-sm text-red-500">
                                安全信息加载失败: {icelandInfo.safety.error}
                              </div>
                            )}
                            {icelandInfo.safety.data && icelandInfo.safety.data.alerts.length > 0 && (
                              <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded-lg">
                                <Shield className="h-4 w-4 text-yellow-600 mt-0.5" />
                                <div className="flex-1">
                                  <div className="text-xs font-semibold text-gray-700 mb-1">安全警报</div>
                                  <div className="space-y-1">
                                    {icelandInfo.safety.data.alerts.slice(0, 3).map((alert) => (
                                      <div key={alert.id} className="text-xs">
                                        <Badge
                                          variant={
                                            alert.severity === 'critical' || alert.severity === 'high'
                                              ? 'destructive'
                                              : 'secondary'
                                          }
                                          className="text-xs mr-1"
                                        >
                                          {alert.severity === 'critical'
                                            ? '严重'
                                            : alert.severity === 'high'
                                            ? '高'
                                            : '中'}
                                        </Badge>
                                        {alert.title}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* F路路况 */}
                            {icelandInfo.roadConditions.loading && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Spinner className="h-4 w-4" />
                                <span>加载路况信息...</span>
                              </div>
                            )}
                            {icelandInfo.roadConditions.error && (
                              <div className="text-sm text-red-500">
                                路况信息加载失败: {icelandInfo.roadConditions.error}
                              </div>
                            )}
                            {icelandInfo.roadConditions.data && icelandInfo.roadConditions.data.fRoads && icelandInfo.roadConditions.data.fRoads.length > 0 && (
                              <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                                <Route className="h-4 w-4 text-amber-600 mt-0.5" />
                                <div className="flex-1">
                                  <div className="text-xs font-semibold text-gray-700 mb-1">F路路况</div>
                                  <div className="space-y-1">
                                    {icelandInfo.roadConditions.data.fRoads.slice(0, 3).map((road) => (
                                      <div key={road.fRoadNumber} className="text-xs">
                                        <Badge
                                          variant={
                                            road.status === 'closed' || road.status === 'impassable'
                                              ? 'destructive'
                                              : road.status === 'caution'
                                              ? 'secondary'
                                              : 'outline'
                                          }
                                          className="text-xs mr-1"
                                        >
                                          {road.status === 'closed'
                                            ? '封闭'
                                            : road.status === 'impassable'
                                            ? '不可通行'
                                            : road.status === 'caution'
                                            ? '谨慎'
                                            : '开放'}
                                        </Badge>
                                        {road.fRoadNumber}: {road.name}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* 🆕 证据完整性检查卡片 */}
                      {completenessData && (
                        <EvidenceCompletenessCard
                          completenessScore={completenessData.completenessScore}
                          missingEvidence={completenessData.missingEvidence}
                          recommendations={completenessData.recommendations}
                          onFetchEvidence={(evidenceTypes, affectedPois) => {
                            if (tripId) {
                              handleFetchEvidence(evidenceTypes, affectedPois, false);
                            }
                          }}
                          loading={loadingCompleteness}
                        />
                      )}

                      {/* 🆕 证据获取建议卡片 */}
                      {suggestionsData && (
                        <EvidenceSuggestionsCard
                          hasMissingEvidence={suggestionsData.hasMissingEvidence}
                          completenessScore={suggestionsData.completenessScore}
                          suggestions={suggestionsData.suggestions}
                          bulkFetchSuggestion={suggestionsData.bulkFetchSuggestion}
                          onFetchEvidence={(evidenceTypes, affectedPoiIds) => {
                            if (tripId) {
                              handleFetchEvidence(evidenceTypes, affectedPoiIds, false);
                            }
                          }}
                          onBulkFetch={(evidenceTypes, affectedPoiIds) => {
                            if (tripId) {
                              handleFetchEvidence(evidenceTypes, affectedPoiIds, true); // 使用异步模式
                            }
                          }}
                          loading={loadingSuggestions}
                        />
                      )}

                      {/* Evidence Section - 使用真实 API 数据 */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">
                            {t('dashboard.readiness.page.evidenceList', { defaultValue: '证据列表' })}
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {t('dashboard.readiness.page.totalEvidence', { 
                              count: evidenceData.length,
                              defaultValue: '共 {{count}} 条证据' 
                            })}
                          </span>
                        </div>

                        {/* 🆕 证据过滤和排序控件 */}
                        {tripId && (
                          <EvidenceFilters
                            filters={evidenceFilters}
                            onFiltersChange={(newFilters) => {
                              setEvidenceFilters(newFilters);
                              loadEvidenceData(tripId, newFilters);
                            }}
                            availableDays={Array.from(new Set(evidenceData.map((item) => item.day).filter((d): d is number => d !== undefined)))}
                          />
                        )}
                        
                        {loadingEvidence ? (
                          <div className="flex items-center justify-center py-8">
                            <LogoLoading size={32} />
                          </div>
                        ) : evidenceData.length > 0 ? (
                          <div className="space-y-3">
                            {/* 🆕 批量操作组件 */}
                            {tripId && (
                              <EvidenceBatchActions
                                evidenceList={adaptTripEvidenceListToReadiness(evidenceData)}
                                tripId={tripId}
                                userRole={userRole}
                                onUpdate={() => {
                                  // 刷新证据列表
                                  if (tripId) {
                                    loadEvidenceData(tripId, evidenceFilters);
                                  }
                                }}
                              />
                            )}
                            
                            {/* 🆕 使用 EvidenceListItem 组件显示证据 */}
                            <div className="space-y-2">
                              {tripId && evidenceData.map((item) => {
                                // 转换为 ReadinessEvidenceItem 格式
                                const readinessEvidence = adaptTripEvidenceListToReadiness([item])[0];
                                return (
                                  <EvidenceListItem
                                    key={item.id}
                                    evidence={readinessEvidence}
                                    tripId={tripId}
                                    userRole={userRole || undefined}
                                    onStatusChange={(evidenceId, status, userNote) => {
                                      // 状态更新后的回调
                                      console.log('证据状态已更新:', evidenceId, status, userNote);
                                      // 刷新证据列表
                                      if (tripId) {
                                        loadEvidenceData(tripId, evidenceFilters);
                                      }
                                    }}
                                    onOpen={() => {
                                      // 打开证据详情（可选）
                                      if (item.link) {
                                        window.open(item.link, '_blank');
                                      }
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <p className="text-sm">{t('dashboard.readiness.page.noEvidenceAvailable', { defaultValue: '暂无可用证据' })}</p>
                            <p className="text-xs mt-2">
                              {t('dashboard.readiness.page.evidenceChainDescription', { defaultValue: '所有证据来源及其覆盖情况' })}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 🆕 异步任务进度对话框 */}
                      <TaskProgressDialog
                        open={taskProgressDialogOpen}
                        onOpenChange={setTaskProgressDialogOpen}
                        taskId={taskProgress.taskId}
                        status={taskProgress.status}
                        progress={taskProgress.progress}
                        result={taskProgress.result}
                        error={taskProgress.error}
                        onCancel={handleCancelTask}
                        onClose={() => {
                          setTaskProgressDialogOpen(false);
                          setTaskProgress({
                            taskId: null,
                            status: null,
                            progress: null,
                          });
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="coverage" className="mt-6 space-y-4">
                {/* 按严重程度分组的警告 */}
                {coverageMapData?.warningsBySeverity && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">警告列表（按严重程度）</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* 高严重程度警告 */}
                      {coverageMapData.warningsBySeverity.high && coverageMapData.warningsBySeverity.high.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="destructive">高</Badge>
                            <span className="text-sm text-muted-foreground">
                              {coverageMapData.warningsBySeverity.high.length} 个警告
                            </span>
                          </div>
                          <div className="space-y-1">
                            {coverageMapData.warningsBySeverity.high.slice(0, 5).map((gap) => (
                              <div key={gap.id} className="text-sm p-2 bg-red-50 rounded">
                                <div className="font-medium">{gap.message}</div>
                                {gap.affectedDays && gap.affectedDays.length > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    受影响天数: {gap.affectedDays.join(', ')}
                                  </div>
                                )}
                              </div>
                            ))}
                            {coverageMapData.warningsBySeverity.high.length > 5 && (
                              <div className="text-xs text-muted-foreground">
                                还有 {coverageMapData.warningsBySeverity.high.length - 5} 个警告...
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 中等严重程度警告 */}
                      {coverageMapData.warningsBySeverity.medium && coverageMapData.warningsBySeverity.medium.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="default" className="bg-yellow-500">中</Badge>
                            <span className="text-sm text-muted-foreground">
                              {coverageMapData.warningsBySeverity.medium.length} 个警告
                            </span>
                          </div>
                          <div className="space-y-1">
                            {coverageMapData.warningsBySeverity.medium.slice(0, 3).map((gap) => (
                              <div key={gap.id} className="text-sm p-2 bg-yellow-50 rounded">
                                <div className="font-medium">{gap.message}</div>
                                {gap.affectedDays && gap.affectedDays.length > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    受影响天数: {gap.affectedDays.join(', ')}
                                  </div>
                                )}
                              </div>
                            ))}
                            {coverageMapData.warningsBySeverity.medium.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                还有 {coverageMapData.warningsBySeverity.medium.length - 3} 个警告...
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 低严重程度警告 */}
                      {coverageMapData.warningsBySeverity.low && coverageMapData.warningsBySeverity.low.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">低</Badge>
                            <span className="text-sm text-muted-foreground">
                              {coverageMapData.warningsBySeverity.low.length} 个警告
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            共 {coverageMapData.warningsBySeverity.low.length} 个低优先级警告（已折叠）
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <CoverageMiniMap
                  data={coverageMapData}
                  loading={loadingCoverageMap}
                  error={coverageMapError}
                  height={450}
                  onPoiClick={(poi) => {
                    console.log('POI clicked:', poi);
                    // 可以跳转到对应的 POI 详情或高亮显示
                  }}
                  onSegmentClick={(segment) => {
                    console.log('Segment clicked:', segment);
                    // 可以显示路段详情
                  }}
                  onGapClick={(gap) => {
                    console.log('Gap clicked:', gap);
                    // 可以导航到相关的 blocker 或建议修复
                    if (gap.type === 'poi' && gap.relatedId) {
                      // 如果是 POI 缺口，可以提示用户添加证据
                    } else if (gap.type === 'segment' && gap.relatedId) {
                      // 如果是路段缺口，可以显示风险详情
                    }
                  }}
                />
              </TabsContent>

              <TabsContent value="packing" className="mt-6">
                <PackingListTab tripId={tripId || ''} trip={trip} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* 维度 Findings 对话框 */}
      <Dialog open={!!selectedDimension} onOpenChange={(open) => !open && setSelectedDimension(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDimension && t(`dashboard.readiness.page.dimensions.${selectedDimension}.label`)}
            </DialogTitle>
            <DialogDescription>
              {selectedDimension && t(`dashboard.readiness.page.dimensions.${selectedDimension}.description`)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {(() => {
              const categoryMap: Record<string, string> = {
                evidenceCoverage: 'evidence',
                scheduleFeasibility: 'schedule',
                transportCertainty: 'transport',
                safetyRisk: 'safety',
                buffers: 'buffer',
              };
              const category = selectedDimension ? categoryMap[selectedDimension] : '';
              const dimensionFindings = scoreBreakdown?.findings?.filter(f => f.category === category) || [];
              const dimensionRisks = selectedDimension === 'safetyRisk' ? (scoreBreakdown?.risks || []) : [];
              const dimensionScore = selectedDimension ? readinessData?.score?.[selectedDimension as keyof typeof readinessData.score] : 0;
              
              // 显示当前分数
              const scoreDisplay = (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                  <span className="text-sm">{t('dashboard.readiness.page.currentScore', { defaultValue: '当前分数' })}</span>
                  <span className={`text-lg font-bold ${
                    (dimensionScore || 0) >= 80 ? 'text-green-600' : 
                    (dimensionScore || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {dimensionScore || 0}%
                  </span>
                </div>
              );
              
              if (dimensionFindings.length === 0 && dimensionRisks.length === 0) {
                const isFullScore = (dimensionScore || 0) >= 100;
                return (
                  <>
                    {scoreDisplay}
                    <div className="text-center py-6">
                      {isFullScore ? (
                        <>
                          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            {t('dashboard.readiness.page.dimensionPerfect', { defaultValue: '该维度表现完美！' })}
                          </p>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            {t('dashboard.readiness.page.noDetailedFindings', { 
                              defaultValue: '暂无详细发现项。分数基于行程整体情况计算。' 
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {t('dashboard.readiness.page.scoreExplanation', {
                              defaultValue: '分数反映了该维度的整体健康程度，可能受多种因素影响。'
                            })}
                          </p>
                        </>
                      )}
                    </div>
                  </>
                );
              }
              
              return (
                <>
                  {scoreDisplay}
                  {dimensionFindings.map((finding) => {
                    // ✅ 统一类型映射：warning → must, suggestion → should
                    const findingType = finding.type === 'warning' ? 'must' : 
                                       finding.type === 'suggestion' ? 'should' : 
                                       finding.type;
                    return (
                      <div
                      key={finding.id}
                      className={`p-3 rounded-lg border ${
                        findingType === 'blocker' ? 'bg-red-50 border-red-200' :
                        findingType === 'must' ? 'bg-amber-50 border-amber-200' :
                        (findingType === 'should' || findingType === 'optional') ? 'bg-gray-50 border-gray-200' :
                        'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs shrink-0 ${
                            finding.severity === 'high' ? 'border-red-400 text-red-600' :
                            finding.severity === 'medium' ? 'border-yellow-400 text-yellow-600' :
                            'border-blue-400 text-blue-600'
                          }`}
                        >
                          {t(`dashboard.readiness.page.findingType.${findingType}`, findingType)}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{finding.message}</p>
                          {finding.actionRequired && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('dashboard.readiness.page.actionRequired')}: {finding.actionRequired}
                            </p>
                          )}
                          {finding.affectedDays && finding.affectedDays.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('dashboard.readiness.page.affectedDays', { defaultValue: '影响天数' })}: Day {finding.affectedDays.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                  {dimensionRisks.map((risk) => (
                    <div
                      key={risk.id}
                      className={`p-3 rounded-lg border ${
                        risk.severity === 'high' ? 'bg-red-50 border-red-200' :
                        risk.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${
                          risk.severity === 'high' ? 'text-red-500' :
                          risk.severity === 'medium' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{risk.message}</p>
                          {risk.mitigation && risk.mitigation.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground">
                                {t('dashboard.readiness.page.mitigation', { defaultValue: '应对措施' })}:
                              </p>
                              <ul className="text-xs text-muted-foreground list-disc list-inside mt-1">
                                {risk.mitigation.map((m, i) => (
                                  <li key={i}>{m}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* 移动端 Repair Preview Sheet */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>{t('dashboard.readiness.page.repairOptions', { defaultValue: '修复选项' })}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 overflow-y-auto">
            {readinessData.repairOptions && readinessData.repairOptions.length > 0 ? (
              <>
                {/* 显示阻塞项描述 */}
                {selectedBlockerMessage && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                      {t('dashboard.readiness.page.blockerToFix', { defaultValue: '待解决问题' })}:
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      {selectedBlockerMessage}
                    </p>
                  </div>
                )}
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
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t('dashboard.readiness.page.noRepairOptions', { defaultValue: '暂无修复选项' })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

