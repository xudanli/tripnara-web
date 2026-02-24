import { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DrawerContext } from '@/components/layout/DashboardLayout';
import { toast } from 'sonner';
import { tripsApi } from '@/api/trips';
import { countriesApi } from '@/api/countries';
import { tripDetailApi } from '@/api/trip-detail';
import type { Health } from '@/api/trip-detail';
import type { 
  TripDetail, 
  ItineraryItem, 
  TripRecapReport,
  PersonaAlert,
  DayMetricsResponse,
  TripMetricsResponse,
  ConflictsResponse
} from '@/types/trip';
import type { Suggestion, SuggestionStats } from '@/types/suggestion';
import { AssistantCenter } from '@/components/trips/AssistantCenter';
import DayItineraryCard from '@/components/trips/DayItineraryCard';
import { AdjustTimeDialog } from '@/components/trips/AdjustTimeDialog';
import { SuggestionPreviewDialog } from '@/components/trips/SuggestionPreviewDialog';
import type { Country } from '@/types/country';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TripFeedbackDialog, TripTerrainSummary } from '@/components/fitness';
import type { TerrainType } from '@/types/fitness';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { LogoLoading } from '@/components/common/LogoLoading';
import { TripDetailSkeleton } from '@/components/trips/TripDetailSkeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Calendar, Edit, Share2, Users, MapPin, MoreVertical, Trash2, TrendingUp, Shield, Activity, RefreshCw, History, Play, Compass, BarChart3, Eye, Info, AlertTriangle, Plus, Wallet } from 'lucide-react';
import TripBudgetPage from './budget';
import BudgetOverviewCard from '@/components/trips/BudgetOverviewCard';
import BudgetMonitorCard from '@/components/trips/BudgetMonitorCard';
import TripCostSummaryCard from '@/components/trips/TripCostSummaryCard';
import UnpaidItemsList from '@/components/trips/UnpaidItemsList';
import HealthBarWithGuidance from '@/components/trips/HealthBarWithGuidance';
import { MetricExplanationDialog } from '@/components/trips/MetricExplanationDialog';
import { AutoOptimizeDialog } from '@/components/trips/AutoOptimizeDialog';
import { format } from 'date-fns';
import { EditTripDialog } from '@/components/trips/EditTripDialog';
import { ShareTripDialog } from '@/components/trips/ShareTripDialog';
import { CollaboratorsDialog } from '@/components/trips/CollaboratorsDialog';
import { EditItineraryItemDialog } from '@/components/trips/EditItineraryItemDialog';
import { CreateItineraryItemDialog } from '@/components/trips/CreateItineraryItemDialog';
import { ReplaceItineraryItemDialog } from '@/components/trips/ReplaceItineraryItemDialog';
import { itineraryItemsApi } from '@/api/trips';
import { cn } from '@/lib/utils';
import ComplianceRulesCard from '@/components/trips/ComplianceRulesCard';
import type { DecisionLogEntry, ReplaceItineraryItemResponse } from '@/types/trip';
import { zhCN } from 'date-fns/locale';
import AbuView from '@/components/trips/views/AbuView';
import DrDreView from '@/components/trips/views/DrDreView';
import NeptuneView from '@/components/trips/views/NeptuneView';
import { 
  extractAbuData, 
  extractDrDreData, 
  extractNeptuneData, 
  calculateOverallMetrics,
  type AbuViewData,
  type DrDreViewData,
  type NeptuneViewData,
  type OverallMetrics,
} from '@/utils/trip-data-extractors';
import { tripDetailToRoutePlanDraft } from '@/utils/plan-converters';
import { buildWorldModelContext } from '@/utils/world-context-builder';
import { useFitnessContext } from '@/contexts/FitnessContext';
import { useMemo } from 'react';
import { getPersonaColorClasses, getPersonaIconColorClasses } from '@/lib/persona-colors';
import { getTripStatusClasses, getTripStatusLabel } from '@/lib/trip-status';
import { WeatherCard, WeatherAlertBanner } from '@/components/weather/WeatherCard';
import { formatCurrency } from '@/utils/format';
// V2 优化组件
import { OptimizationDashboard, FeedbackForm } from '@/components/optimization';
import { useSubmitFeedback } from '@/hooks/useOptimizationV2';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MessageSquare, Zap } from 'lucide-react';

// V2 优化标签页组件
function OptimizeTabContent({
  tripId,
  trip,
  onTripRefetch,
}: {
  tripId: string;
  trip: TripDetail;
  onTripRefetch?: () => void | Promise<void>;
}) {
  const { profile: fitnessProfile } = useFitnessContext();

  const planDraft = useMemo(
    () => tripDetailToRoutePlanDraft(trip),
    [trip]
  );
  const worldContext = useMemo(
    () => buildWorldModelContext(trip, { fitnessProfile }),
    [trip, fitnessProfile]
  );

  const teamId = (trip as { metadata?: { teamId?: string } })?.metadata?.teamId;
  const tripMetadata = (trip as { metadata?: Record<string, unknown> })?.metadata;

  return (
    <OptimizationDashboard
      plan={planDraft}
      world={worldContext}
      tripId={tripId}
      teamId={teamId}
      tripMetadata={tripMetadata}
      onTripUpdated={onTripRefetch}
    />
  );
}

// 决策记录标签页组件
function DecisionLogTab({ tripId }: { tripId: string }) {
  const [logs, setLogs] = useState<DecisionLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDecisionLogs();
  }, [tripId]);

  const loadDecisionLogs = async () => {
    try {
      setLoading(true);
      const response = await tripsApi.getDecisionLog(tripId, 50, 0);
      setLogs(response.items || []);
    } catch (err: any) {
      console.error('Failed to load decision log:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getPersonaName = (persona?: string): string => {
    if (!persona) return '';
    switch (persona) {
      case 'ABU':
        return 'Abu';
      case 'DR_DRE':
        return 'Dr.Dre';
      case 'NEPTUNE':
        return 'Neptune';
      default:
        return '';
    }
  };

  // 使用三人格颜色工具函数
  const getPersonaIcon = (persona?: string) => {
    const iconColorClasses = getPersonaIconColorClasses(persona || '');
    switch (persona) {
      case 'ABU':
        return <Shield className={cn('w-4 h-4', iconColorClasses)} />;
      case 'DR_DRE':
        return <Activity className={cn('w-4 h-4', iconColorClasses)} />;
      case 'NEPTUNE':
        return <RefreshCw className={cn('w-4 h-4', iconColorClasses)} />;
      default:
        return null;
    }
  };

  const getPersonaColor = (persona?: string) => {
    return getPersonaColorClasses(persona || '');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <LogoLoading size={40} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          System 2 思考日志
        </CardTitle>
        <CardDescription>
          可追溯、可解释的决策轨迹 - 信任来自「决策透明」
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无决策记录</p>
            <p className="text-sm mt-2">当三人格系统做出决策时，记录会显示在这里</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => {
              const personaName = getPersonaName(log.persona);
              return (
                <div
                  key={log.id}
                  className={`p-4 rounded-lg border ${getPersonaColor(log.persona)}`}
                >
                  <div className="flex items-start gap-3">
                    {getPersonaIcon(log.persona)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {personaName && (
                          <span className="font-semibold text-sm">
                            [{personaName}]
                          </span>
                        )}
                        <span className="text-sm">
                          {log.description}
                        </span>
                        <span className="text-xs opacity-70 ml-auto">
                          {format(new Date(log.date), 'yyyy年M月d日 HH:mm', { locale: zhCN })}
                        </span>
                      </div>
                      {log.source && (
                        <div className="text-xs opacity-70 mt-1">
                          来源：{log.source}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// const getStatusColor = (status: string) => {
//   switch (status) {
//     case 'PLANNING':
//       return 'bg-blue-100 text-blue-800 border-blue-200';
//     case 'IN_PROGRESS':
//       return 'bg-green-100 text-green-800 border-green-200';
//     case 'COMPLETED':
//       return 'bg-gray-100 text-gray-800 border-gray-200';
//     case 'CANCELLED':
//       return 'bg-red-100 text-red-800 border-red-200';
//     default:
//       return 'bg-gray-100 text-gray-800 border-gray-200';
//   }
// };

// 使用统一的工具函数
// 使用统一的工具函数 getTripStatusLabel，此函数已移除

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const submitFeedbackMutation = useSubmitFeedback();
  
  console.log('[TripDetail] 组件渲染:', { id, hasId: !!id, pathname: location.pathname });

  // 提取国家代码的辅助函数
  const extractCountryCodes = (destination: string | undefined): string[] => {
    if (!destination) return [];
    const parts = destination.split(',');
    const countryCode = parts[0]?.trim().toUpperCase();
    return countryCode ? [countryCode] : [];
  };
  // 安全地使用 DrawerContext，如果不在 DashboardLayout 中则使用空函数
  const drawerContext = useContext(DrawerContext);
  const setDrawerOpen = drawerContext?.setDrawerOpen || (() => {});
  const setDrawerTab = drawerContext?.setDrawerTab || (() => {});
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [collaboratorsDialogOpen, setCollaboratorsDialogOpen] = useState(false);
  const [tripState, setTripState] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [createItemDialogOpen, setCreateItemDialogOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [replacingItem, setReplacingItem] = useState<ItineraryItem | null>(null);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [recapReport, setRecapReport] = useState<TripRecapReport | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | null>(null);
  const [statusConfirmText, setStatusConfirmText] = useState(''); // ✅ 状态修改确认输入
  const [statusConfirmCode, setStatusConfirmCode] = useState<string>(''); // ✅ 随机验证码
  const [country, setCountry] = useState<Country | null>(null);
  const [planViewTab, setPlanViewTab] = useState<'abu' | 'dre' | 'neptune'>('abu'); // 问题与改进内的子视角（安全/节奏/修复）
  const [planDetailTab, setPlanDetailTab] = useState<'issues' | 'optimize'>('issues'); // 方案A二段式：问题与改进 | 智能优化
  const [adjustTimeDialogOpen, setAdjustTimeDialogOpen] = useState(false);
  const [adjustingSuggestion, setAdjustingSuggestion] = useState<Suggestion | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewSuggestion, setPreviewSuggestion] = useState<Suggestion | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview'); // ✅ Tab 状态控制
  const [metricExplanationDialogOpen, setMetricExplanationDialogOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'schedule' | 'budget' | 'pace' | 'feasibility' | null>(null);
  const [autoOptimizeDialogOpen, setAutoOptimizeDialogOpen] = useState(false);
  // 体能反馈弹窗状态
  const [fitnessFeedbackDialogOpen, setFitnessFeedbackDialogOpen] = useState(false);
  const [fitnessFeedbackShown, setFitnessFeedbackShown] = useState(false);
  const [optimizationFeedbackDialogOpen, setOptimizationFeedbackDialogOpen] = useState(false);
  
  // 新增：风险、指标相关状态
  const [personaAlerts, setPersonaAlerts] = useState<PersonaAlert[]>([]);
  const [personaAlertsLoading, setPersonaAlertsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionStats, setSuggestionStats] = useState<SuggestionStats | null>(null);
  const [dayMetricsMap, setDayMetricsMap] = useState<Map<string, DayMetricsResponse>>(new Map());
  const [tripMetrics, setTripMetrics] = useState<TripMetricsResponse | null>(null);
  const [tripMetricsLoading, setTripMetricsLoading] = useState(false); // 🆕 跟踪tripMetrics加载状态
  const [conflicts, setConflicts] = useState<ConflictsResponse | null>(null);
  
  // 新增：决策日志相关状态
  const [decisionLogs, setDecisionLogs] = useState<DecisionLogEntry[]>([]);
  const [decisionLogsLoading, setDecisionLogsLoading] = useState(false); // 🆕 跟踪decisionLogs加载状态
  
  // 新增：行程详情页 Agent 相关状态
  const [tripHealth, setTripHealth] = useState<Health | null>(null);
  
  // 🆕 货币状态：用于格式化费用显示
  const [currency, setCurrency] = useState<string>('CNY');
  
  // 新增：提取的数据状态（通过 useMemo 计算）
  // ✅ 即使数据为空，也返回空数据结构，让视图组件自己处理空状态
  const abuData = useMemo<AbuViewData | null>(() => {
    // 如果有行程项，即使没有决策日志和提醒，也应该显示视图（显示空状态）
    const hasTripItems = trip?.TripDay?.some(day => day.ItineraryItem && day.ItineraryItem.length > 0) || false;
    if (!hasTripItems) return null; // 没有行程项时返回null
    return extractAbuData(decisionLogs, personaAlerts);
  }, [decisionLogs, personaAlerts, trip]);
  
  const drDreData = useMemo<DrDreViewData | null>(() => {
    // 如果有行程项，即使没有决策日志和指标，也应该显示视图（显示空状态）
    const hasTripItems = trip?.TripDay?.some(day => day.ItineraryItem && day.ItineraryItem.length > 0) || false;
    if (!hasTripItems) return null; // 没有行程项时返回null
    
    // 🐛 调试：记录依赖项的变化
    const decisionLogsRef = decisionLogs; // 保存引用用于比较
    const tripMetricsRef = tripMetrics; // 保存引用用于比较
    
    console.log('[TripDetail] drDreData useMemo 重新计算:', {
      decisionLogsCount: decisionLogs.length,
      decisionLogsRef: decisionLogsRef, // 完整数组引用
      hasTripMetrics: !!tripMetrics,
      tripMetricsRef: tripMetricsRef, // 完整对象引用
      tripMetricsSummary: tripMetrics?.summary,
      tripMetricsSummaryTotalFatigue: tripMetrics?.summary?.totalFatigue,
      tripMetricsSummaryTotalBuffer: tripMetrics?.summary?.totalBuffer,
      tripMetricsSummaryTotalWalk: tripMetrics?.summary?.totalWalk,
      tripMetricsSummaryTotalDrive: tripMetrics?.summary?.totalDrive,
      tripId: trip?.id,
      recalculateTime: new Date().toISOString(),
    });
    
    const result = extractDrDreData(decisionLogs, tripMetrics);
    
    console.log('[TripDetail] drDreData useMemo 计算结果:', {
      metrics: result.metrics,
      adjustmentsCount: result.adjustments?.length || 0,
      logsCount: result.logs?.length || 0,
    });
    
    return result;
  }, [decisionLogs, tripMetrics, trip]);
  
  const neptuneData = useMemo<NeptuneViewData>(() => {
    // 始终返回数据结构，让 NeptuneView 展示空状态；仅在加载中时由 UI 显示加载态
    return extractNeptuneData(decisionLogs, suggestions);
  }, [decisionLogs, suggestions]);
  
  const overallMetrics = useMemo<OverallMetrics | null>(() => {
    // ✅ 如果行程项为空，不计算综合指标（避免显示误导性的100/100）
    const hasTripItems = trip?.TripDay?.some(day => day.ItineraryItem && day.ItineraryItem.length > 0) || false;
    if (!hasTripItems) {
      return null; // 行程项为空时，不显示综合指标
    }
    
    if (decisionLogs.length === 0 && personaAlerts.length === 0 && !suggestionStats) return null;
    return calculateOverallMetrics(decisionLogs, personaAlerts, suggestionStats, suggestions);
  }, [decisionLogs, personaAlerts, suggestionStats, suggestions, trip]);

  const hasPlanIssues = useMemo(() => {
    if (!overallMetrics) return true; // 数据未就绪时默认展示问题与改进
    const h = Math.min(overallMetrics.safetyScore, overallMetrics.rhythmScore, overallMetrics.readinessScore);
    return h < 90;
  }, [overallMetrics]);

  // 方案A：智能优化已并入规划Tab内，非PLANNING时若在优化子Tab则切回问题与改进
  useEffect(() => {
    if (trip?.status !== 'PLANNING' && planDetailTab === 'optimize') {
      setPlanDetailTab('issues');
    }
  }, [trip?.status, planDetailTab]);

  // ⚠️ 重要：所有 hooks（包括 useMemo）必须在任何条件返回之前调用
  // 获取天气位置：优先使用行程项坐标，否则使用目的地国家默认坐标
  const weatherLocation = useMemo(() => {
    if (!trip) {
      return null;
    }

    // 常见国家首都坐标
    const COORDS: Record<string, { lat: number; lng: number; name: string }> = {
      'IS': { lat: 64.1466, lng: -21.9426, name: '冰岛·雷克雅未克' },
      'JP': { lat: 35.6762, lng: 139.6503, name: '日本·东京' },
      'TH': { lat: 13.7563, lng: 100.5018, name: '泰国·曼谷' },
      'KR': { lat: 37.5665, lng: 126.9780, name: '韩国·首尔' },
      'US': { lat: 40.7128, lng: -74.0060, name: '美国·纽约' },
      'GB': { lat: 51.5074, lng: -0.1278, name: '英国·伦敦' },
      'FR': { lat: 48.8566, lng: 2.3522, name: '法国·巴黎' },
      'CN': { lat: 39.9042, lng: 116.4074, name: '中国·北京' },
      'SG': { lat: 1.3521, lng: 103.8198, name: '新加坡' },
      'AU': { lat: -33.8688, lng: 151.2093, name: '澳大利亚·悉尼' },
    };

    // 1. 尝试从行程项中获取坐标
    const places: Array<{ lat: number; lng: number }> = [];
    if (trip.TripDay && trip.TripDay.length > 0) {
      for (const day of trip.TripDay) {
        for (const item of day.ItineraryItem || []) {
          if (item.Place) {
            const place = item.Place as any;
            const lat = place.latitude || place.metadata?.location?.lat || place.lat;
            const lng = place.longitude || place.metadata?.location?.lng || place.lng;
            if (lat && lng && typeof lat === 'number' && typeof lng === 'number') {
              places.push({ lat, lng });
            }
          }
        }
      }
    }

    if (places.length > 0) {
      const avgLat = places.reduce((sum, p) => sum + p.lat, 0) / places.length;
      const avgLng = places.reduce((sum, p) => sum + p.lng, 0) / places.length;
      return { 
        location: { lat: avgLat, lng: avgLng }, 
        name: trip.destination || '目的地' 
      };
    }

    // 2. 如果没有行程项坐标，使用目的地国家的默认坐标
    if (trip.destination) {
      const code = extractCountryCodes(trip.destination)[0];
      if (code && COORDS[code]) {
        return { location: { lat: COORDS[code].lat, lng: COORDS[code].lng }, name: COORDS[code].name };
      }
    }

    return null;
  }, [trip]);

  // 判断是否是冰岛（用于显示详细风速信息）
  const isIceland = useMemo(() => {
    if (!trip?.destination) return false;
    const countryCodes = extractCountryCodes(trip.destination);
    return countryCodes.includes('IS');
  }, [trip?.destination]);

  useEffect(() => {
    console.log('[TripDetail] useEffect 执行:', { id, hasId: !!id, idType: typeof id });
    if (id) {
      console.log('[TripDetail] useEffect: id存在，准备调用loadTrip');
      loadTrip();
    } else {
      console.warn('[TripDetail] useEffect: id为空，不调用loadTrip');
    }
  }, [id]);

  // 处理从其他页面传递过来的状态（如侧边栏的操作）
  useEffect(() => {
    const state = location.state as {
      openEditDialog?: boolean;
      openShareDialog?: boolean;
      openCollaboratorsDialog?: boolean;
      changeStatus?: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    } | null;

    if (state) {
      if (state.openEditDialog) {
        setEditDialogOpen(true);
      }
      if (state.openShareDialog) {
        setShareDialogOpen(true);
      }
      if (state.openCollaboratorsDialog) {
        setCollaboratorsDialogOpen(true);
      }
      if (state.changeStatus) {
        setPendingStatus(state.changeStatus);
        setStatusChangeDialogOpen(true);
      }
      
      // 清除 state，避免刷新页面时重复打开
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // ✅ 当行程状态变化时，自动调整 Tab（仅在状态变化时，不覆盖用户手动选择）
  useEffect(() => {
    if (!trip) return;
    
    // 如果当前在"执行"tab，但状态不是进行中或已完成，切换回"规划"tab
    if (activeTab === 'execute' && trip?.status !== 'IN_PROGRESS' && trip?.status !== 'COMPLETED') {
      setActiveTab('plan');
    }
    
    // 如果当前在"复盘"tab，但状态不是已完成，切换回"规划"tab
    if (activeTab === 'insights' && trip?.status !== 'COMPLETED') {
      setActiveTab('plan');
    }
  }, [trip?.status, activeTab]);

  // ✅ 当行程状态变为已完成时，延迟显示体能反馈弹窗
  useEffect(() => {
    if (!trip || !id) return;
    
    // 如果行程已完成且尚未显示过反馈弹窗，则显示
    if (trip?.status === 'COMPLETED' && !fitnessFeedbackShown) {
      // 检查是否已提交过该行程的反馈（使用 localStorage 缓存）
      const feedbackKey = `fitness_feedback_submitted_${id}`;
      const alreadySubmitted = localStorage.getItem(feedbackKey);
      
      if (!alreadySubmitted) {
        // 延迟3秒后显示反馈弹窗，给用户时间查看复盘结果
        const timer = setTimeout(() => {
          setFitnessFeedbackDialogOpen(true);
          setFitnessFeedbackShown(true);
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [trip?.status, id, fitnessFeedbackShown]);

  const loadTrip = async () => {
    console.log('[TripDetail] loadTrip 开始执行:', { id, hasId: !!id });
    if (!id) {
      console.warn('[TripDetail] loadTrip: id为空，提前返回');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      console.log('[TripDetail] 开始调用 tripsApi.getById:', { id });
      let data;
      try {
        data = await tripsApi.getById(id);
        console.log('[TripDetail] tripsApi.getById 成功:', { tripId: data?.id, hasData: !!data, dataType: typeof data });
      } catch (apiErr: any) {
        console.error('[TripDetail] tripsApi.getById 抛出异常:', {
          error: apiErr,
          message: apiErr.message,
          stack: apiErr.stack,
        });
        throw apiErr; // 重新抛出，让外层catch处理
      }
      
      // 🔍 详细检查行程数据中的POI信息
      console.log('📋 [TripDetailPage] 加载的行程数据:', {
        tripId: data.id,
        destination: data.destination,
        totalDays: data.TripDay?.length || 0,
        daysWithItems: data.TripDay?.filter((day: any) => day.ItineraryItem && day.ItineraryItem.length > 0).length || 0,
        totalItems: data.TripDay?.reduce((sum: number, day: any) => sum + (day.ItineraryItem?.length || 0), 0) || 0,
        days: data.TripDay?.map((day: any) => ({
          day: day.date,
          theme: day.theme,
          itemsCount: day.ItineraryItem?.length || 0,
          items: day.ItineraryItem?.map((item: any) => ({
            id: item.id,
            type: item.type,
            placeId: item.placeId,
            placeName: item.Place?.nameCN || item.Place?.nameEN || '未知地点',
            hasPlace: !!item.Place,
            isRequired: item.isRequired,
            note: item.note,
          })) || [],
        })) || [],
      });
      
      // ⚠️ 检查是否有行程项缺少Place信息
      const itemsWithoutPlace = data.TripDay?.flatMap((day: any) => 
        (day.ItineraryItem || [])
          .filter((item: any) => item.placeId && !item.Place)
          .map((item: any) => ({
            day: day.date,
            itemId: item.id,
            placeId: item.placeId,
            note: item.note,
          }))
      ) || [];
      
      if (itemsWithoutPlace.length > 0) {
        console.warn('⚠️ [TripDetailPage] 发现缺少Place信息的行程项:', {
          count: itemsWithoutPlace.length,
          items: itemsWithoutPlace,
        });
      }
      
      if (data) {
        // 确保所有数值字段都有默认值
        setTrip({
          ...data,
          totalBudget: data.totalBudget ?? 0,
          statistics: data.statistics ? {
            ...data.statistics,
            budgetUsed: data.statistics.budgetUsed ?? 0,
            budgetRemaining: data.statistics.budgetRemaining ?? 0,
            totalDays: data.statistics.totalDays ?? 0,
            totalItems: data.statistics.totalItems ?? 0,
            totalActivities: data.statistics.totalActivities ?? 0,
            totalMeals: data.statistics.totalMeals ?? 0,
            totalRest: data.statistics.totalRest ?? 0,
            totalTransit: data.statistics.totalTransit ?? 0,
          } : {
            totalDays: 0,
            totalItems: 0,
            totalActivities: 0,
            totalMeals: 0,
            totalRest: 0,
            totalTransit: 0,
            progress: 'PLANNING',
            budgetUsed: 0,
            budgetRemaining: 0,
          },
        });
        
        // 根据目的地加载国家信息以获取货币代码
        if (data.destination) {
          loadCountryInfo(data.destination);
        }
        
        // 🆕 加载货币信息：优先使用预算约束中的货币，其次使用目的地货币
        await loadCurrency(data.destination);
        
        // 在 trip 设置后加载依赖 trip 的数据
        // 🆕 直接传入id，不依赖trip state
        console.log('[TripDetail] 准备调用 loadTripMetrics:', { id, hasId: !!id });
        // 🆕 不await，让它在后台执行，避免阻塞其他数据加载
        loadTripMetrics(id).catch(err => {
          console.error('[TripDetail] loadTripMetrics 调用失败:', err);
        });
        
        // 检查收藏和点赞状态
        // 注意：如果后端在 GET /trips/:id 响应中包含 isCollected、isLiked、likeCount 字段，
        // 可以直接从 data 中获取，无需单独调用接口
        // 加载行程状态
        await loadTripState();
        // 加载相关数据（先加载不依赖 trip 的数据）
        await Promise.all([
          loadSuggestions(),
          loadConflicts(),
          loadPersonaAlerts(), // 新增：加载三人格提醒
          loadDecisionLogs(), // 新增：加载决策日志
          loadTripHealth(), // 新增：加载行程健康度
        ]);
      } else {
        setError('行程数据为空');
      }
    } catch (err: any) {
      console.error('❌ [TripDetail] 加载行程失败:', {
        tripId: id,
        error: err,
        message: err.message,
        code: err.code,
        status: err.response?.status,
        statusText: err.response?.statusText,
        response: err.response?.data,
        stack: err.stack,
      });
      
      // 提取更详细的错误信息
      let errorMessage = err.message || '加载行程详情失败';
      
      // 如果是权限错误
      if (err.code === 'UNAUTHORIZED' || err.response?.status === 401) {
        errorMessage = `行程 ID ${id} 不存在或您没有权限访问`;
      }
      // 如果是资源不存在
      else if (err.code === 'NOT_FOUND' || err.response?.status === 404) {
        errorMessage = `行程 ID ${id} 不存在或已被删除`;
      }
      // 如果是服务器错误
      else if (err.response?.status >= 500) {
        errorMessage = '服务器错误，请稍后重试';
      }
      // 如果是业务错误（从响应体中获取）
      else if (err.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadCountryInfo = async (countryCode: string) => {
    try {
      const response = await countriesApi.getAll();
      const countries = response.countries || [];
      const found = countries.find((c) => c.isoCode === countryCode);
      if (found) {
        setCountry(found);
      }
    } catch (err: any) {
      console.error('Failed to load country info:', err);
      // 加载失败不影响主流程
    }
  };
  
  // 🆕 检测URL参数，如果tab=budget，切换到预算标签页
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'budget') {
      setActiveTab('budget');
      // 不清除URL参数，因为openConstraintDialog参数需要保留给TripBudgetPage
    }
  }, [searchParams]);

  // 🆕 加载货币信息：优先使用预算约束中的货币，其次使用目的地货币，最后默认CNY
  const loadCurrency = async (destination?: string) => {
    if (!id) return;
    try {
      // 优先从预算约束获取货币
      const constraint = await tripsApi.getBudgetConstraint(id);
      if (constraint.budgetConstraint.currency) {
        setCurrency(constraint.budgetConstraint.currency);
        return;
      }
    } catch {
      // 如果获取预算约束失败，尝试从目的地获取
    }
    
    // 其次从目的地获取货币策略
    if (destination) {
      try {
        const currencyStrategy = await countriesApi.getCurrencyStrategy(destination);
        if (currencyStrategy?.currencyCode) {
          setCurrency(currencyStrategy.currencyCode);
          return;
        }
      } catch {
        // 如果获取失败，保持默认值 CNY
      }
    }
    
    // 默认使用 CNY
    setCurrency('CNY');
  };



  // const handleCollect = async () => {
  //   if (!id || actionLoading) return;
  //   try {
  //     setActionLoading('collect');
  //     if (isCollected) {
  //       await tripsApi.uncollect(id);
  //       setIsCollected(false);
  //     } else {
  //       await tripsApi.collect(id);
  //       setIsCollected(true);
  //     }
  //   } catch (err: any) {
  //     console.error('Failed to toggle collection:', err);
  //     // 可以在这里添加错误提示
  //   } finally {
  //     setActionLoading(null);
  //   }
  // };

  // const handleLike = async () => {
  //   if (!id || actionLoading) return;
  //   try {
  //     setActionLoading('like');
  //     if (isLiked) {
  //       await tripsApi.unlike(id);
  //       setIsLiked(false);
  //       // setLikeCount((prev) => Math.max(0, prev - 1));
  //     } else {
  //       await tripsApi.like(id);
  //       setIsLiked(true);
  //       // setLikeCount((prev) => prev + 1);
  //     }
  //   } catch (err: any) {
  //     console.error('Failed to toggle like:', err);
  //     // 可以在这里添加错误提示
  //   } finally {
  //     setActionLoading(null);
  //   }
  // };

  const loadTripState = async () => {
    if (!id) return;
    try {
      const state = await tripsApi.getState(id);
      setTripState(state);
    } catch (err) {
      // 状态加载失败不影响主流程
      console.error('Failed to load trip state:', err);
    }
  };


  // 检查是否是"未发现问题"类型的建议
  const isNoIssueSuggestion = (suggestion: Suggestion): boolean => {
    const summary = suggestion.summary || '';
    const title = suggestion.title || '';
    const description = suggestion.description || '';
    const text = `${title} ${summary} ${description}`.toLowerCase();
    
    // 检查是否包含"未发现"、"未检测到"、"无"、"通过"等关键词
    const noIssuePatterns = [
      '未发现',
      '未检测到',
      '未发现.*问题',
      '无.*问题',
      '均通过',
      '允许继续',
      '检查通过',
      '没有问题',
      '一切正常',
    ];
    
    return noIssuePatterns.some(pattern => {
      const regex = new RegExp(pattern);
      return regex.test(text);
    });
  };

  // 修正建议的人格归属（根据内容判断）
  const correctSuggestionPersona = (suggestion: Suggestion): Suggestion => {
    const title = suggestion.title || '';
    const summary = suggestion.summary || '';
    const text = `${title} ${summary}`.toLowerCase();
    
    // 时间冲突应该归属到 Dr.Dre（节奏）
    if (text.includes('时间冲突') || text.includes('时间重叠') || text.includes('time conflict')) {
      return {
        ...suggestion,
        persona: 'drdre',
      };
    }
    
    // 安全相关的冲突应该归属到 Abu（风险）
    if (text.includes('安全') || text.includes('风险') || text.includes('危险') || 
        text.includes('封路') || text.includes('道路封闭') || text.includes('road closure')) {
      return {
        ...suggestion,
        persona: 'abu',
      };
    }
    
    return suggestion;
  };

  // 加载建议列表（使用新的统一接口）
  const loadSuggestions = async () => {
    if (!id) return;
    try {
      setPersonaAlertsLoading(true);
      // 使用新的统一接口获取建议列表
      const result = await tripsApi.getSuggestions(id, { status: 'new' });
      
      // 确保建议 ID 唯一，去重处理
      const uniqueSuggestions = result.items.reduce((acc, suggestion) => {
        const existingIndex = acc.findIndex((s) => s.id === suggestion.id);
        if (existingIndex === -1) {
          acc.push(suggestion);
        } else {
          // 如果 ID 重复，使用更新的数据（或添加索引后缀）
          const existing = acc[existingIndex];
          if (suggestion.updatedAt && existing.updatedAt && 
              new Date(suggestion.updatedAt) > new Date(existing.updatedAt)) {
            acc[existingIndex] = suggestion;
          }
        }
        return acc;
      }, [] as typeof result.items);
      
      // 修正建议的人格归属（根据内容判断）
      const correctedSuggestions = uniqueSuggestions.map(correctSuggestionPersona);
      
      // 过滤掉"未发现问题"类型的建议
      const filteredSuggestions = correctedSuggestions.filter(
        suggestion => !isNoIssueSuggestion(suggestion)
      );
      
      setSuggestions(filteredSuggestions);
      
      // 使用新的统一接口获取统计数据
      const stats = await tripsApi.getSuggestionStats(id);
      setSuggestionStats(stats);
    } catch (err: any) {
      console.error('Failed to load suggestions:', err);
      // 静默处理错误，不影响主流程
      setSuggestions([]);
      setSuggestionStats(null);
    } finally {
      setPersonaAlertsLoading(false);
    }
  };

  // 检查是否是"未发现问题"类型的提醒
  const isNoIssuePersonaAlert = (alert: PersonaAlert): boolean => {
    const message = alert.message || '';
    const title = alert.title || '';
    const text = `${title} ${message}`.toLowerCase();
    
    // 检查是否包含"未发现"、"未检测到"、"无"、"通过"等关键词
    const noIssuePatterns = [
      '未发现',
      '未检测到',
      '未发现.*问题',
      '无.*问题',
      '均通过',
      '允许继续',
      '检查通过',
      '没有问题',
      '一切正常',
    ];
    
    return noIssuePatterns.some(pattern => {
      const regex = new RegExp(pattern);
      return regex.test(text);
    });
  };

  // 新增：加载三人格提醒
  const loadPersonaAlerts = async () => {
    if (!id) return;
    try {
      setPersonaAlertsLoading(true);
      const data = await tripsApi.getPersonaAlerts(id);
      // 过滤掉"未发现问题"类型的提醒
      const filteredData = (data || []).filter(alert => !isNoIssuePersonaAlert(alert));
      setPersonaAlerts(filteredData);
    } catch (err: any) {
      console.error('Failed to load persona alerts:', err);
      // 静默处理错误，不影响主流程
      setPersonaAlerts([]);
    } finally {
      setPersonaAlertsLoading(false);
    }
  };

  // 新增：加载决策日志
  const loadDecisionLogs = async () => {
    if (!id) return;
    try {
      setDecisionLogsLoading(true);
      // 获取足够多的日志（100条）
      const response = await tripsApi.getDecisionLog(id, 100, 0);
      const newLogs = response.items || [];
      console.log('[TripDetail] loadDecisionLogs 完成:', {
        logsCount: newLogs.length,
        drDreLogsCount: newLogs.filter(log => log.persona === 'DR_DRE').length,
        tripId: id,
        // 🐛 调试：记录完整数组引用，用于检查是否变化
        logsRef: newLogs,
        loadTime: new Date().toISOString(),
      });
      // 🐛 确保设置新的数组引用，触发 useMemo 重新计算
      setDecisionLogs([...newLogs]); // 创建新数组引用
    } catch (err: any) {
      console.error('Failed to load decision logs:', err);
      // 静默处理错误，不影响主流程
      setDecisionLogs([]);
    } finally {
      setDecisionLogsLoading(false);
    }
  };

  // 新增：加载行程健康度
  const loadTripHealth = async () => {
    if (!id) return;
    try {
      const health = await tripDetailApi.getHealth(id);
      console.log('[Trip Detail Page] 健康度数据加载完成:', {
        overall: health.overall,
        overallScore: health.overallScore,
        dimensions: health.dimensions ? Object.keys(health.dimensions) : [],
        // 🆕 检查每个维度是否包含 weight
        scheduleWeight: (health.dimensions as any)?.schedule?.weight,
        budgetWeight: (health.dimensions as any)?.budget?.weight,
        paceWeight: (health.dimensions as any)?.pace?.weight,
        feasibilityWeight: (health.dimensions as any)?.feasibility?.weight,
      });
      setTripHealth(health);
    } catch (err: any) {
      console.error('Failed to load trip health:', err);
      // 静默处理错误，不影响主流程
      setTripHealth(null);
    }
  };


  // 加载行程指标（用于健康度计算）
  const loadTripMetrics = async (tripId?: string) => {
    // 🆕 支持传入tripId参数，避免依赖trip state
    console.log('[TripDetail] loadTripMetrics 被调用:', { tripId, id, hasTripId: !!tripId, hasId: !!id });
    const targetTripId = tripId || id;
    console.log('[TripDetail] loadTripMetrics targetTripId:', { targetTripId, hasTargetTripId: !!targetTripId });
    if (!targetTripId) {
      console.warn('[TripDetail] loadTripMetrics: tripId为空，跳过加载');
      return;
    }
    try {
      setTripMetricsLoading(true);
      console.log('[TripDetail] 开始加载行程指标:', { tripId: targetTripId });
      const data = await tripsApi.getMetrics(targetTripId);
      console.log('[TripDetail] 行程指标加载成功:', {
        tripId: targetTripId,
        hasDays: !!data.days,
        daysCount: data.days?.length || 0,
        summary: data.summary,
        totalFatigue: data.summary?.totalFatigue,
        totalBuffer: data.summary?.totalBuffer,
        totalWalk: data.summary?.totalWalk,
        totalDrive: data.summary?.totalDrive,
        // 🐛 调试：记录完整的数据对象引用，用于检查是否变化
        dataRef: data,
        loadTime: new Date().toISOString(),
      });
      // 🐛 确保设置新的对象引用，触发 useMemo 重新计算
      // 深度克隆所有嵌套对象，确保 React 能检测到变化
      setTripMetrics({
        ...data,
        summary: data.summary ? { ...data.summary } : undefined,
        days: data.days ? data.days.map(day => ({
          ...day,
          metrics: day.metrics ? { ...day.metrics } : undefined,
        })) : undefined,
      });
      
      // 建立每日指标映射
      if (data.days) {
        const metricsMap = new Map<string, DayMetricsResponse>();
        for (const day of data.days) {
          metricsMap.set(day.date, day);
        }
        setDayMetricsMap(metricsMap);
      }
    } catch (err: any) {
      console.error('[TripDetail] 加载行程指标失败:', {
        tripId: targetTripId,
        error: err,
        message: err.message,
        code: err.code,
        status: err.response?.status,
        statusText: err.response?.statusText,
        responseData: err.response?.data,
        url: err.config?.url,
      });
      // 设置错误状态，让组件显示错误提示
      setTripMetrics(null);
    } finally {
      setTripMetricsLoading(false);
    }
  };

  // 加载冲突列表
  const loadConflicts = async () => {
    if (!id) return;
    try {
      const data = await tripsApi.getConflicts(id);
      console.log('[TripDetail] loadConflicts 完成:', {
        conflictsCount: data?.conflicts?.length || 0,
        tripId: id,
      });
      setConflicts(data);
    } catch (err: any) {
      console.error('Failed to load conflicts:', err);
      // 静默处理错误，不影响主流程
    }
  };

  const handleReplaceSuccess = async (result: ReplaceItineraryItemResponse) => {
    // 替换成功后，更新行程项
    try {
      await itineraryItemsApi.update(replacingItem!.id, {
        placeId: result.newItem.placeId,
        startTime: result.newItem.startTime,
        endTime: result.newItem.endTime,
        note: result.newItem.reason,
      });
      await loadTrip();
      toast.success('行程项已替换');
      setReplaceDialogOpen(false);
      setReplacingItem(null);
    } catch (err: any) {
      console.error('Failed to update item:', err);
      toast.error(err.message || '更新行程项失败');
    }
  };


  const handleCreateItemSuccess = () => {
    loadTrip(); // 重新加载行程
    setCreateItemDialogOpen(false);
    setSelectedDayId(null);
  };

  // ✅ 处理状态修改（先显示确认对话框）
  // ✅ 生成随机验证码（4位数字）
  const generateConfirmCode = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleStatusChange = (newStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') => {
    setPendingStatus(newStatus);
    // ✅ 生成随机验证码
    const code = generateConfirmCode();
    setStatusConfirmCode(code);
    setStatusChangeDialogOpen(true);
  };

  // ✅ 验证状态转换是否合法（根据API文档规则）
  const validateStatusTransition = (
    currentStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    newStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  ): { valid: boolean; message?: string } => {
    // 1. 已取消的行程不能改回其他状态
    if (currentStatus === 'CANCELLED') {
      return {
        valid: false,
        message: '已取消的行程不能修改状态'
      };
    }

    // 2. 已完成的行程不能改回规划中或进行中
    if (currentStatus === 'COMPLETED' && 
        (newStatus === 'PLANNING' || newStatus === 'IN_PROGRESS')) {
      return {
        valid: false,
        message: '已完成的行程不能改回规划中或进行中状态'
      };
    }

    // 3. 规划中不能直接跳到已完成（必须先经过进行中）
    if (currentStatus === 'PLANNING' && newStatus === 'COMPLETED') {
      return {
        valid: false,
        message: '规划中的行程不能直接标记为已完成，请先改为"进行中"'
      };
    }

    // 4. ✅ 规划中改为进行中：必须至少有一个行程项
    if (currentStatus === 'PLANNING' && newStatus === 'IN_PROGRESS') {
      // 检查是否有任何一天有行程项
      const hasAnyItineraryItem = trip?.TripDay?.some(
        day => day.ItineraryItem && day.ItineraryItem.length > 0
      ) || false;

      if (!hasAnyItineraryItem) {
        return {
          valid: false,
          message: '无法开始执行行程：行程中没有任何行程项。请先添加至少一个行程项后再开始执行。'
        };
      }
    }

    // 5. 其他状态转换都是允许的
    return { valid: true };
  };

  // ✅ 获取状态转换对应的操作说明
  // ✅ 获取状态转换需要的确认词（支持多种确认方式）
  const getStatusConfirmWord = (
    currentStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    newStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  ): { word: string | null; alternatives: string[] } => {
    // 只有不可逆操作需要确认词
    if (newStatus === 'CANCELLED') {
      return {
        word: '取消',
        alternatives: [trip?.destination || '行程名称'] // 可以输入"取消"或行程名称
      };
    }
    if (currentStatus === 'PLANNING' && newStatus === 'IN_PROGRESS') {
      return {
        word: '开始',
        alternatives: [trip?.destination || '行程名称'] // 可以输入"开始"或行程名称
      };
    }
    if (currentStatus === 'IN_PROGRESS' && newStatus === 'COMPLETED') {
      return {
        word: '完成',
        alternatives: [trip?.destination || '行程名称'] // 可以输入"完成"或行程名称
      };
    }
    // 其他可逆操作不需要确认词
    return { word: null, alternatives: [] };
  };

  // ✅ 验证确认输入是否有效（支持确认词、验证码或行程名称）
  const validateConfirmInput = (
    input: string,
    confirmWord: string | null,
    confirmCode: string,
    alternatives: string[]
  ): boolean => {
    if (!input.trim()) return false;
    
    const trimmedInput = input.trim();
    
    // 1. 检查是否匹配确认词
    if (confirmWord && trimmedInput === confirmWord) {
      return true;
    }
    
    // 2. 检查是否匹配随机验证码
    if (confirmCode && trimmedInput === confirmCode) {
      return true;
    }
    
    // 3. 检查是否匹配行程名称（不区分大小写）
    if (alternatives.length > 0) {
      const tripName = alternatives[0];
      if (tripName && trimmedInput.toLowerCase() === tripName.toLowerCase()) {
        return true;
      }
    }
    
    return false;
  };

  // ✅ 获取状态转换的标题和说明
  const getStatusTransitionTitle = (
    currentStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    newStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  ): { title: string; description: string } => {
    if (currentStatus === 'PLANNING' && newStatus === 'CANCELLED') {
      return {
        title: '确认取消该行程？',
        description: `当前行程状态将从 "${getTripStatusLabel(currentStatus as any)}" 修改为 "${getTripStatusLabel(newStatus as any)}"。`
      };
    }
    if (currentStatus === 'PLANNING' && newStatus === 'IN_PROGRESS') {
      return {
        title: '确认开始执行行程？',
        description: `当前行程状态将从 "${getTripStatusLabel(currentStatus as any)}" 修改为 "${getTripStatusLabel(newStatus as any)}"，进入执行阶段。`
      };
    }
    if (currentStatus === 'IN_PROGRESS' && newStatus === 'COMPLETED') {
      return {
        title: '确认完成行程？',
        description: `当前行程状态将从 "${getTripStatusLabel(currentStatus as any)}" 修改为 "${getTripStatusLabel(newStatus as any)}"。`
      };
    }
    // 默认标题
    return {
      title: '确认修改行程状态？',
      description: `您即将将行程状态从 "${getTripStatusLabel(currentStatus as any)}" 修改为 "${getTripStatusLabel(newStatus as any)}"。`
    };
  };

  const getStatusTransitionAction = (
    currentStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    newStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  ): { action: string; description: string; consequences: string[] } => {
    const transitions: Record<string, { action: string; description: string; consequences: string[] }> = {
      'PLANNING->IN_PROGRESS': {
        action: '开始执行行程',
        description: '将行程状态改为"进行中"，开始实际执行阶段',
        consequences: [
          '将开启"执行"标签页，可查看实时行程状态',
          '可记录行程中实际的变更与调整',
          '此操作不可撤销，无法返回"规划中"状态'
        ]
      },
      'PLANNING->CANCELLED': {
        action: '取消行程',
        description: '将行程标记为"已取消"',
        consequences: [
          '行程将被永久标记为"已取消"',
          '已取消的行程将无法恢复或修改',
          '可在记录中保留以供参考'
        ]
      },
      'IN_PROGRESS->COMPLETED': {
        action: '完成行程',
        description: '将进行中的行程标记为"已完成"',
        consequences: [
          '将开启"复盘"标签页，可查看行程复盘报告',
          '行程将无法再编辑或执行',
          '此操作不可撤销，无法返回"进行中"状态'
        ]
      },
      'IN_PROGRESS->CANCELLED': {
        action: '取消进行中的行程',
        description: '将正在进行的行程标记为"已取消"',
        consequences: [
          '行程将被永久标记为"已取消"',
          '已取消的行程将无法恢复或修改',
          '可在记录中保留以供参考'
        ]
      },
      'IN_PROGRESS->PLANNING': {
        action: '重新规划行程',
        description: '将进行中的行程改回"规划中"状态，允许重新规划',
        consequences: [
          '可以重新编辑和调整行程安排',
          '将隐藏"执行"标签页',
          '此操作可逆，可以再次改为"进行中"'
        ]
      },
      'COMPLETED->CANCELLED': {
        action: '标记已完成行程为已取消',
        description: '将已完成的行程标记为"已取消"',
        consequences: [
          '行程将被永久标记为"已取消"',
          '已取消的行程将无法恢复或修改',
          '可在记录中保留以供参考'
        ]
      }
    };

    const key = `${currentStatus}->${newStatus}`;
    return transitions[key] || {
      action: `修改状态为"${getTripStatusLabel(newStatus as any)}"`,
      description: `将行程状态从"${getTripStatusLabel(currentStatus as any)}"改为"${getTripStatusLabel(newStatus as any)}"`,
      consequences: ['此操作可能不可逆，请谨慎操作']
    };
  };

  // ✅ 确认状态修改（不可逆操作）
  const confirmStatusChange = async () => {
    if (!id || !trip || !pendingStatus) return;
    
    // 前端验证状态转换合法性
    const validation = validateStatusTransition(trip.status, pendingStatus);
    if (!validation.valid) {
      toast.error(validation.message || '不允许的状态转换');
      setStatusChangeDialogOpen(false);
      setPendingStatus(null);
      setStatusConfirmText('');
      return;
    }

    // ✅ 验证确认输入（支持确认词、验证码或行程名称）
    const confirmInfo = getStatusConfirmWord(trip.status, pendingStatus);
    if (confirmInfo.word) {
      const isValid = validateConfirmInput(
        statusConfirmText,
        confirmInfo.word,
        statusConfirmCode,
        confirmInfo.alternatives
      );
      if (!isValid) {
        toast.error(`请输入"${confirmInfo.word}"、验证码"${statusConfirmCode}"或行程名称"${confirmInfo.alternatives[0]}"以确认操作`);
        return;
      }
    }
    
    try {
      // 通过更新API修改状态（后端已支持 status 字段）
      await tripsApi.update(id, { status: pendingStatus });
      toast.success(`行程状态已更新为：${getTripStatusLabel(pendingStatus as any)}`);
      setStatusChangeDialogOpen(false);
      setPendingStatus(null);
      setStatusConfirmText('');
      
      // ✅ 根据新状态自动切换到合适的 Tab
      if (pendingStatus === 'IN_PROGRESS') {
        // 规划中 → 进行中：切换到"执行"tab
        setActiveTab('execute');
      } else if (pendingStatus === 'COMPLETED') {
        // 进行中 → 已完成：切换到"复盘"tab
        setActiveTab('insights');
      } else if (pendingStatus === 'PLANNING') {
        // 改回规划中：切换到"规划"tab
        setActiveTab('plan');
      }
      // 已取消状态保持当前tab不变
      
      loadTrip(); // 重新加载行程
    } catch (err: any) {
      console.error('Failed to update trip status:', err);
      // 显示后端返回的具体错误信息
      const errorMessage = err.message || '更新行程状态失败';
      toast.error(errorMessage, {
        description: err.response?.data?.error?.message || '请检查网络连接或稍后重试'
      });
    }
  };

  const loadRecapReport = async () => {
    if (!id) return;
    try {
      setRecapLoading(true);
      const report = await tripsApi.getRecap(id);
      setRecapReport(report);
    } catch (err: any) {
      console.error('Failed to load recap report:', err);
    } finally {
      setRecapLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !trip) return;

    // 验证确认文字
    if (confirmText.trim().toUpperCase() !== trip.destination.toUpperCase()) {
      toast.error(`确认文字不匹配。请输入目的地国家代码"${trip.destination}"来确认删除。`);
      return;
    }

    try {
      setDeleting(true);
      await tripsApi.delete(id, confirmText.trim());
      // 删除成功后跳转到行程列表
      toast.success('行程已删除');
      navigate('/dashboard/trips');
    } catch (err: any) {
      console.error('Failed to delete trip:', err);
      const errorMessage = err.response?.data?.error?.message || err.message || '删除行程失败';
      toast.error(errorMessage);
      setDeleting(false);
    }
  };

  // ⚠️ 以下是早期返回，所有 hooks 必须在这之前调用
  if (loading) {
    return <TripDetailSkeleton />;
  }

  if (error || !trip) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800 font-semibold mb-2">{error || '行程不存在'}</p>
          {id && (
            <p className="text-sm text-red-600 mb-4">
              行程ID: <code className="bg-red-100 px-2 py-1 rounded">{id}</code>
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={() => navigate('/dashboard/trips')} variant="outline">
              返回列表
            </Button>
            {id && (
              <Button 
                onClick={async () => {
                  // 重试加载
                  try {
                    setLoading(true);
                    setError(null);
                    const data = await tripsApi.getById(id);
                    if (data) {
                      setTrip(data);
                      setLoading(false);
                    }
                  } catch (retryErr: any) {
                    console.error('重试加载失败:', retryErr);
                    setError(retryErr.message || '加载失败');
                    setLoading(false);
                  }
                }}
                variant="outline"
              >
                重试加载
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 计算健康度指标（优先使用 tripHealth API 数据）
  const healthMetrics = (() => {
    // ✅ 如果行程项为空，返回空值（不显示健康度）
    const hasTripItems = trip?.TripDay?.some(day => day.ItineraryItem && day.ItineraryItem.length > 0) || false;
    if (!hasTripItems) {
      return {
        executable: 0,
        buffer: 0,
        risk: 0,
        cost: 0,
      };
    }

    // ✅ 优先使用 tripHealth API 数据
    if (tripHealth && tripHealth.dimensions) {
      return {
        executable: tripHealth.dimensions.schedule?.score || 0,
        buffer: tripHealth.dimensions.budget?.score || 0,
        risk: 100 - (tripHealth.dimensions.pace?.score || 0), // 风险是节奏的反向（风险越低越好）
        cost: tripHealth.dimensions.feasibility?.score || 0,
      };
    }

    // 默认值（仅在数据加载中时使用）
    const defaultMetrics = {
      executable: 85,
      buffer: 70,
      risk: 25,
      cost: 80,
    };

    if (!tripMetrics) return defaultMetrics;

    // Fallback：基于行程指标计算健康度（如果 API 数据不可用）
    const summary = tripMetrics.summary;
    const totalDays = trip?.statistics?.totalDays || trip?.TripDay?.length || 1;
    
    // 可执行度：基于缓冲时间和疲劳指数
    // 缓冲时间充足且疲劳指数低 = 高可执行度
    const avgBufferPerDay = summary.totalBuffer / totalDays;
    const avgFatigue = summary.totalFatigue / totalDays;
    const executable = Math.min(100, Math.max(0, 
      (avgBufferPerDay / 60) * 20 + // 缓冲时间（小时）* 20，最多20分
      (100 - avgFatigue) * 0.65 // 疲劳指数越低越好，最多65分
    ));

    // 缓冲：基于总缓冲时间
    const buffer = Math.min(100, Math.max(0, (summary.totalBuffer / (totalDays * 120)) * 100)); // 假设每天理想缓冲2小时

    // 风险：基于冲突数量和高风险冲突
    const highRiskConflicts = conflicts?.conflicts?.filter(c => c.severity === 'HIGH').length || 0;
    const totalConflicts = conflicts?.total || 0;
    const risk = Math.min(100, Math.max(0, 
      (highRiskConflicts * 30) + // 高风险冲突每个30分
      (totalConflicts * 5) // 总冲突每个5分
    ));

    // 成本控制：基于预算使用情况
    const budgetUsed = trip?.statistics?.budgetUsed || 0;
    const totalBudget = trip?.totalBudget || 1;
    const budgetRatio = budgetUsed / totalBudget;
    const cost = Math.min(100, Math.max(0, (1 - budgetRatio) * 100)); // 预算使用越少越好

    return {
      executable: Math.round(executable),
      buffer: Math.round(buffer),
      risk: Math.round(risk),
      cost: Math.round(cost),
    };
  })();

  // 根据状态确定主 CTA
  const getMainCTA = () => {
    if (trip.status === 'PLANNING') {
      return {
        label: '进入规划工作台',
        action: () => navigate(`/dashboard/plan-studio?tripId=${id}`),
        icon: Compass,
      };
    } else if (trip.status === 'IN_PROGRESS') {
      return {
        label: '继续执行',
        action: () => navigate(`/dashboard/execute?tripId=${id}`),
        icon: Play,
      };
    } else if (trip.status === 'COMPLETED') {
      // 已完成状态不显示主CTA按钮
      return null;
    } else {
      // CANCELLED 或其他状态
      return null;
    }
  };

  const mainCTA = getMainCTA();
  const CTAIcon = mainCTA?.icon;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 顶部 Header（12/12）- 控制中枢版本 */}
      <div className="border-b bg-white px-4 sm:px-6 py-2.5 sm:py-3 shadow-sm">
        <div className="flex flex-col xl:flex-row items-start justify-between gap-3 xl:gap-4">
          {/* 左：Trip Title + 标签 - 稳定信息 */}
          <div className="flex-1 min-w-0 w-full xl:w-auto order-1">
            <div className="flex items-center gap-2 sm:gap-2.5 mb-1.5 flex-wrap">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/dashboard/trips')}
          className="h-7 w-7 hover:bg-gray-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </Button>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">{trip.name || trip.destination}</h1>
              <Badge 
                variant="outline" 
                className={cn(
                  'font-medium flex-shrink-0 text-xs',
                  getTripStatusClasses(trip.status as any)
                )}
              >
                {getTripStatusLabel(trip.status as any)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 sm:gap-2.5 text-xs text-gray-600 ml-8 sm:ml-9 flex-wrap">
              {/* 🆕 优化后的行程信息显示 */}
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span className="font-medium">
                  {format(new Date(trip.startDate), 'yyyy.MM.dd')}
                  {trip.startDate !== trip.endDate && (
                    <> - {format(new Date(trip.endDate), 'yyyy.MM.dd')}</>
                  )}
                </span>
              </div>
              {/* 计算天数 */}
              {(() => {
                const days = Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                return days > 0 ? (
                  <span className="text-gray-500">· {days} 天</span>
                ) : null;
              })()}
              <Badge variant="secondary" className="text-xs">标准节奏</Badge>
              <Badge variant="secondary" className="text-xs">自驾</Badge>
              {/* 天气卡片 */}
              {weatherLocation && (
                <WeatherCard
                  location={weatherLocation.location}
                  includeWindDetails={isIceland}
                  compact={true}
                  refreshInterval={10 * 60 * 1000} // 10分钟刷新一次（规划阶段不需要太频繁）
                  locationName={weatherLocation.name}
                />
              )}
            </div>
          </div>

          {/* 中：Health Bar - 控制中枢版本（只在有行程项时显示） */}
          <div className="w-full xl:w-auto xl:flex-1 xl:max-w-md flex-shrink-0 order-3 xl:order-2" data-tour="health-bar">
            {trip?.TripDay?.some(day => day.ItineraryItem && day.ItineraryItem.length > 0) ? (
              <HealthBarWithGuidance
                executable={healthMetrics.executable}
                buffer={healthMetrics.buffer}
                risk={healthMetrics.risk}
                cost={healthMetrics.cost}
                tripStatus={trip.status}
                overallScore={tripHealth?.overallScore} // 🆕 优先使用 API 返回的整体健康度分数
                onMetricClick={(metricName) => {
                  setSelectedMetric(metricName);
                  setMetricExplanationDialogOpen(true);
                }}
                onNavigateToPlanStudio={() => {
                  if (id) navigate(`/dashboard/plan-studio?tripId=${id}`);
                }}
                onNavigateToBudget={() => {
                  setActiveTab('budget');
                }}
                onExpandToPlanDetails={() => setActiveTab('plan')}
              />
            ) : (
              // ✅ 弱化上方提示，只显示简单的占位
              <div className="text-center text-xs text-muted-foreground/60 py-4">
                <Info className="w-3 h-3 mx-auto mb-1 opacity-40" />
                <p className="opacity-60">等待添加行程项</p>
              </div>
            )}
          </div>

          {/* 右：主 CTA + 辅助操作 */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap order-2 xl:order-3 w-full xl:w-auto justify-end xl:justify-start" data-tour="primary-cta">
            {/* 🆕 主 CTA - 突出显示，唯一主要行动 */}
            {mainCTA && CTAIcon && (
              <Button 
                onClick={mainCTA.action} 
                size="lg"
                className="bg-gray-900 hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all text-base font-medium px-6"
              >
                <CTAIcon className="w-4 h-4 mr-2" />
                {mainCTA.label}
              </Button>
            )}
            
            {/* 🆕 Auto 综合 - 弱化为图标按钮 */}
                  {trip?.status === 'PLANNING' && (() => {
              // 过滤出高优先级建议（severity === 'blocker'）
              const blockerSuggestions = suggestions.filter(s => s.severity === 'blocker');
              const hasBlockerSuggestions = blockerSuggestions.length > 0;
              
              return (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            if (!hasBlockerSuggestions) {
                              toast.info('当前没有高优先级建议需要优化');
                              return;
                            }
                            setAutoOptimizeDialogOpen(true);
                          }}
                          disabled={!hasBlockerSuggestions}
                          className="h-10 w-10"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        {hasBlockerSuggestions && (
                          <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 px-1.5 text-xs pointer-events-none">
                            {blockerSuggestions.length}
                          </Badge>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold mb-1">🤖 AI 自动优化</p>
                      <p className="text-xs text-muted-foreground">
                        系统正在自动平衡节奏、成本和风险
                        <br />
                        你也可以随时手动调整
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })()}
            
            {/* ✅ 视图模式已移至规划tab，Header不再显示 */}
            
            {/* 更多菜单 - 弱化为图标 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10">
                  <MoreVertical className="w-4 h-4" />
          </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* ✅ 已取消状态下隐藏编辑、修改状态、分享、协作者 */}
                {trip?.status !== 'CANCELLED' && (
                  <>
                    <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      编辑
                    </DropdownMenuItem>
                    {/* ✅ 快速修改状态 */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        修改状态
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {/* ✅ 根据当前状态和状态转换规则，只显示允许的状态选项 */}
                        {(() => {
                          const currentStatus = trip.status;
                          const allowedTransitions: Array<{
                            status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
                            label: string;
                            icon: string;
                            description?: string;
                          }> = [];

                          // 根据当前状态，添加允许的转换选项
                          if (currentStatus === 'PLANNING') {
                            // 规划中 → 进行中、已取消（不能直接跳到已完成）
                            allowedTransitions.push(
                              { status: 'IN_PROGRESS', label: '进行中', icon: '🚀', description: '开始执行行程' },
                              { status: 'CANCELLED', label: '已取消', icon: '❌', description: '取消行程' }
                            );
                          } else if (currentStatus === 'IN_PROGRESS') {
                            // 进行中 → 已完成、已取消（不允许改回规划中）
                            allowedTransitions.push(
                              { status: 'COMPLETED', label: '已完成', icon: '✅', description: '完成行程' },
                              { status: 'CANCELLED', label: '已取消', icon: '❌', description: '取消行程' }
                            );
                          } else if (currentStatus === 'COMPLETED') {
                            // 已完成 → 已取消（不能改回规划中或进行中）
                            allowedTransitions.push(
                              { status: 'CANCELLED', label: '已取消', icon: '❌', description: '标记为已取消' }
                            );
                          }

                          if (allowedTransitions.length === 0) {
                            return null;
                          }

                          return allowedTransitions.map((transition) => {
                            const validation = validateStatusTransition(currentStatus, transition.status);
                            return (
                              <DropdownMenuItem
                                key={transition.status}
                                onClick={() => handleStatusChange(transition.status)}
                                disabled={!validation.valid}
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="mr-2">{transition.icon}</span>
                                  <div className="flex-1">
                                    <div className="text-sm">{transition.label}</div>
                                    {transition.description && (
                                      <div className="text-xs text-muted-foreground">{transition.description}</div>
                                    )}
                                  </div>
                                </div>
                              </DropdownMenuItem>
                            );
                          });
                        })()}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
                      <Share2 className="w-4 h-4 mr-2" />
                      分享
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCollaboratorsDialogOpen(true)}>
                      <Users className="w-4 h-4 mr-2" />
                      协作者
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setOptimizationFeedbackDialogOpen(true)}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      行程反馈
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ✅ 状态修改确认对话框 - 根据状态转换显示对应操作说明 */}
      <AlertDialog 
        open={statusChangeDialogOpen} 
        onOpenChange={(open) => {
          setStatusChangeDialogOpen(open);
          if (!open) {
            setPendingStatus(null);
            setStatusConfirmText('');
            setStatusConfirmCode('');
          }
        }}
      >
        <AlertDialogContent className="max-w-2xl">
          {pendingStatus && (() => {
            const transitionInfo = getStatusTransitionAction(trip.status, pendingStatus);
            const isIrreversible = pendingStatus === 'COMPLETED' || pendingStatus === 'CANCELLED' || 
                                   (trip.status === 'COMPLETED' && (pendingStatus === 'PLANNING' || pendingStatus === 'IN_PROGRESS'));
            const confirmInfo = getStatusConfirmWord(trip.status, pendingStatus);
            const titleInfo = getStatusTransitionTitle(trip.status, pendingStatus);
            const validation = validateStatusTransition(trip.status, pendingStatus);
            const isConfirmValid = !confirmInfo.word || validateConfirmInput(
              statusConfirmText,
              confirmInfo.word,
              statusConfirmCode,
              confirmInfo.alternatives
            );
            const isButtonDisabled = !validation.valid || !isConfirmValid;

            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>{titleInfo.title}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {titleInfo.description}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4">
                  {/* 影响说明 */}
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="space-y-2 flex-1">
                        <p className="text-sm font-medium text-amber-900">
                          {isIrreversible ? '⚠️ 此操作不可撤销：' : '📌 修改后的影响：'}
                        </p>
                        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                          {transitionInfo.consequences.map((consequence, index) => (
                            <li key={index}>{consequence}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* 错误提示（如果转换不合法） */}
                  {!validation.valid && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-red-900">❌ 不允许的状态转换</p>
                          <p className="text-xs text-red-700">{validation.message}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 二次确认输入（仅不可逆操作） */}
                  {confirmInfo.word && validation.valid && (
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="status-confirm-text" className="text-sm font-medium">
                        为确认{transitionInfo.action}，请输入以下任一内容：
                      </Label>
                      <div className="text-xs text-muted-foreground mb-2 space-y-1">
                        <p>• 确认词：<strong>"{confirmInfo.word}"</strong></p>
                        <p>• 验证码：<strong>"{statusConfirmCode}"</strong></p>
                        {confirmInfo.alternatives[0] && (
                          <p>• 行程名称：<strong>"{confirmInfo.alternatives[0]}"</strong></p>
                        )}
                      </div>
                      <Input
                        id="status-confirm-text"
                        type="text"
                        value={statusConfirmText}
                        onChange={(e) => setStatusConfirmText(e.target.value)}
                        placeholder={`请输入"${confirmInfo.word}"、验证码"${statusConfirmCode}"或行程名称`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && isConfirmValid && !isButtonDisabled) {
                            e.preventDefault();
                            confirmStatusChange();
                          }
                        }}
                        autoFocus
                      />
                      {statusConfirmText && !isConfirmValid && (
                        <p className="text-sm text-destructive">
                          请输入确认词"{confirmInfo.word}"、验证码"{statusConfirmCode}"或行程名称"{confirmInfo.alternatives[0]}"以继续
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmStatusChange}
                    disabled={isButtonDisabled}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    确认修改
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除确认对话框 */}
      <AlertDialog 
        open={deleteDialogOpen} 
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            // 关闭对话框时重置确认文字
            setConfirmText('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除行程</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除行程 <strong>"{trip.destination}"</strong> 吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              此操作将永久删除以下内容：
            </div>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>{trip.statistics?.totalDays || trip.TripDay?.length || 0} 天的行程安排</li>
              <li>{trip.statistics?.totalItems || 0} 个行程项</li>
              <li>所有协作者、收藏、点赞、分享记录</li>
            </ul>
            <div className="text-sm font-medium text-destructive">
              ⚠️ 此操作不可恢复，请谨慎操作！
            </div>
            <div className="space-y-2 pt-2">
              <Label htmlFor="confirm-text" className="text-sm font-medium">
                请输入目的地国家代码 <strong>"{trip.destination}"</strong> 来确认删除：
              </Label>
              <Input
                id="confirm-text"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={trip.destination}
                className="uppercase"
                disabled={deleting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && confirmText.trim().toUpperCase() === trip.destination.toUpperCase() && !deleting) {
                    handleDelete();
                  }
                }}
              />
              {confirmText && confirmText.trim().toUpperCase() !== trip.destination.toUpperCase() && (
                <p className="text-sm text-destructive">
                  确认文字不匹配，请输入 "{trip.destination}"
                </p>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || confirmText.trim().toUpperCase() !== trip.destination.toUpperCase()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 天气预警横幅 - 当目的地有极端天气时显示 */}
      {weatherLocation && trip.startDate && (
        <div className="px-4 sm:px-6 py-2">
          <WeatherAlertBanner
            location={weatherLocation.location}
            locationName={weatherLocation.name}
            startDate={trip.startDate}
          />
        </div>
      )}

      {/* 主体分区（顶部 Tab 4 个） */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="relative z-10 border-b bg-white px-4 sm:px-6 shadow-sm flex-shrink-0">
        <TabsList className="h-11">
              <TabsTrigger value="overview" className="cursor-pointer">
                <Eye className="w-4 h-4 mr-2" />
                总览
              </TabsTrigger>
              <TabsTrigger value="plan">
                <Compass className="w-4 h-4 mr-2" />
                规划
              </TabsTrigger>
              {/* ✅ 根据行程状态显示"执行"tab：仅在 IN_PROGRESS 或 COMPLETED 时显示 */}
              {(trip?.status === 'IN_PROGRESS' || trip?.status === 'COMPLETED') && (
                <TabsTrigger value="execute">
                  <Play className="w-4 h-4 mr-2" />
                  执行
                </TabsTrigger>
              )}
              {/* ✅ 根据行程状态显示"复盘"tab：仅在 COMPLETED 时显示 */}
              {trip?.status === 'COMPLETED' && (
                <TabsTrigger value="insights">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  复盘
                </TabsTrigger>
              )}
              {/* 预算标签页 */}
              <TabsTrigger value="budget">
                <Wallet className="w-4 h-4 mr-2" />
                预算
              </TabsTrigger>
        </TabsList>
          </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50/50">
          <TabsContent value="overview" className="mt-0 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
              {/* 左（8/12）：Route Map / Skeleton + Day Summary */}
              <div className="lg:col-span-12 xl:col-span-8 space-y-3 sm:space-y-4">
                {/* Route Map / Skeleton */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="p-3 sm:p-4 pb-1">
                    <CardTitle className="text-sm sm:text-base font-semibold text-gray-900">路线骨架图</CardTitle>
                    <CardDescription className="text-xs text-gray-500 mt-0.5">Day1~DayN 路线概览</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-1">
                    <div className="space-y-3">
                      {(trip.TripDay || []).map((day, idx) => {
                        const dayMetrics = dayMetricsMap.get(day.date);
                        
                        return (
                          <DayItineraryCard
                            key={day.id}
                            day={day}
                            dayIndex={idx}
                            dayMetrics={dayMetrics}
                            suggestions={suggestions}
                            tripId={id}
                            onViewBudget={() => {
                              setActiveTab('budget');
                            }}
                            onViewItinerary={trip?.status === 'PLANNING' ? () => {
                              // ✅ 只有规划中状态才能跳转到规划工作台
                              navigate(`/dashboard/plan-studio?tripId=${id}&dayId=${day.id}`);
                            } : undefined}
                            onViewSuggestions={() => {
                              // 滚动到助手中心
                              const assistantCenterElement = document.querySelector('[data-assistant-center]');
                              if (assistantCenterElement) {
                                assistantCenterElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                              }
                            }}
                            onAddItem={trip?.status !== 'CANCELLED' ? () => {
                              // ✅ 已取消状态下不允许添加行程项
                              setSelectedDayId(day.id);
                              setCreateItemDialogOpen(true);
                            } : undefined}
                            onQuickPlan={trip?.status === 'PLANNING' ? () => {
                              // ✅ 只有规划中状态才能快速规划
                              navigate(`/dashboard/plan-studio?tripId=${id}&dayId=${day.id}&mode=quick`);
                            } : undefined}
                            onViewRecommendations={trip?.status === 'PLANNING' ? () => {
                              // ✅ 只有规划中状态才能查看推荐
                              navigate(`/dashboard/plan-studio?tripId=${id}&dayId=${day.id}&tab=recommendations`);
                            } : undefined}
                          />
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 右（4/12）：预算概览 + 助手中心 */}
              <div className="lg:col-span-12 xl:col-span-4 space-y-3 sm:space-y-4">
                {/* 地形难度汇总 - 基于行程天数模拟地形数据 */}
                {trip.TripDay && trip.TripDay.length > 0 && (
                  <TripTerrainSummary 
                    terrainTypes={
                      // 根据行程天数模拟地形类型（实际应从后端获取）
                      trip.TripDay.map((_, idx) => {
                        const terrains: TerrainType[] = ['easy', 'moderate', 'alpine', 'technical', 'scree'];
                        return terrains[idx % terrains.length];
                      })
                    }
                  />
                )}

                {/* 预算概览卡片 */}
                {id && (
                  <BudgetOverviewCard
                    tripId={id}
                    onViewDetails={() => {
                      setActiveTab('budget');
                    }}
                    onSetConstraint={() => {
                      // 跳转到预算标签页，并触发设置约束对话框
                      setActiveTab('budget');
                      // 注意：预算约束设置对话框在预算页面内部，这里只是跳转
                      // 如果需要直接打开对话框，可以通过 URL 参数或状态传递
                    }}
                  />
                )}


                {/* 助手中心 - 已取消状态下隐藏 */}
                {trip?.status !== 'CANCELLED' && (
                  <div data-assistant-center>
                    <AssistantCenter
                      suggestions={suggestions}
                      loading={personaAlertsLoading}
                      trip={trip}
                      onSuggestionClick={() => {
                        // 点击建议时打开对应的抽屉
                          setDrawerTab('risk');
                          setDrawerOpen(true);
                        }}
                      onActionClick={async (suggestion, actionId) => {
                      if (!id) return;
                      try {
                        // 查看证据操作
                        if (actionId === 'view_evidence') {
                          setDrawerTab('risk');
                          setDrawerOpen(true);
                          return;
                        }
                        
                        // 忽略建议操作
                        if (actionId === 'dismiss') {
                          await tripsApi.dismissSuggestion(id, suggestion.id);
                          toast.success('建议已忽略');
                          // 重新加载建议列表
                          await loadSuggestions();
                          return;
                        }
                        
                        // 应用建议操作
                        if (actionId === 'apply' || actionId.startsWith('apply_')) {
                          const result = await tripsApi.applySuggestion(id, suggestion.id, {
                            actionId: actionId,
                            preview: false,
                          });
                          
                          // 重新加载建议列表、健康度数据和冲突数据
                          await Promise.all([
                            loadSuggestions(),
                            loadTrip(), // 🆕 重新加载行程数据（确保行程项时间更新）
                            loadTripMetrics(), // 🆕 重新加载行程指标（DayItineraryCard 使用 dayMetrics.conflicts，DrDreView 使用 tripMetrics）
                            loadDecisionLogs(), // 🆕 重新加载决策日志（DrDreView 使用 decisionLogs 计算 drDreData）
                            loadPersonaAlerts(), // 🆕 重新加载人格提醒（用于计算综合指标）
                            loadTripHealth(), // ✅ 应用建议后自动刷新健康度数据
                            loadConflicts(), // 🆕 重新加载冲突数据（应用建议后可能已解决冲突）
                          ]);
                          
                          // 显示成功提示
                          toast.success('建议已成功应用');
                          
                          // 如果有触发的建议，提示用户
                          if (result.triggeredSuggestions && result.triggeredSuggestions.length > 0) {
                            toast.info(`应用建议后产生了 ${result.triggeredSuggestions.length} 个新建议`);
                          }
                          return;
                        }
                        
                        // 预览操作
                        if (actionId === 'preview') {
                          // 打开预览对话框
                          setPreviewSuggestion(suggestion);
                          setPreviewDialogOpen(true);
                          return;
                        }
                        
                        // 查找 action 对象
                        const action = suggestion.actions.find(a => a.id === actionId);
                        
                        // 调整时间/调整节奏操作（adjust_rhythm, adjust_time 等）
                        if (actionId === 'adjust_rhythm' || actionId === 'adjust_time' || actionId.includes('adjust') || action?.label?.includes('调整时间')) {
                          // 打开调整时间对话框
                          setAdjustingSuggestion(suggestion);
                          setAdjustTimeDialogOpen(true);
                          return;
                        }
                        
                        // 其他操作类型：尝试通过 applySuggestion API 处理
                        // 如果是 apply 类型，使用 applySuggestion
                        if (action && (action.type === 'apply' || action.type === 'adjust_rhythm' || action.type === 'view_alternatives')) {
                          const result = await tripsApi.applySuggestion(id, suggestion.id, {
                            actionId: actionId,
                            preview: false,
                          });
                          
                          // 重新加载建议列表、行程数据、健康度数据和冲突数据
                          await Promise.all([
                            loadSuggestions(),
                            loadTrip(),
                            loadTripMetrics(), // 🆕 重新加载行程指标（DayItineraryCard 使用 dayMetrics.conflicts，DrDreView 使用 tripMetrics）
                            loadDecisionLogs(), // 🆕 重新加载决策日志（DrDreView 使用 decisionLogs 计算 drDreData）
                            loadPersonaAlerts(), // 🆕 重新加载人格提醒（用于计算综合指标）
                            loadTripHealth(), // ✅ 应用建议后自动刷新健康度数据
                            loadConflicts(), // 🆕 重新加载冲突数据（应用建议后可能已解决冲突）
                          ]);
                          
                          // 显示成功提示
                          toast.success('建议已成功应用');
                          
                          // 如果有触发的建议，提示用户
                          if (result.triggeredSuggestions && result.triggeredSuggestions.length > 0) {
                            toast.info(`应用建议后产生了 ${result.triggeredSuggestions.length} 个新建议`);
                          }
                          return;
                        }
                        
                        // 其他操作类型
                        console.log('处理操作:', actionId, suggestion);
                        toast.info('该操作正在处理中...');
                      } catch (error: any) {
                        console.error('Failed to handle suggestion action:', error);
                        // 显示错误提示
                        const errorMessage = error.message || '操作失败，请稍后重试';
                        toast.error(errorMessage, {
                          description: error.response?.data?.error?.message || '请检查网络连接或稍后重试',
                        });
                      }
                    }}
                  />
                </div>
                )}


                    </div>
                      </div>
          </TabsContent>

          {/* Plan Tab */}
          <TabsContent value="plan" className="mt-0 space-y-4">
          {(!trip.TripDay || trip.TripDay.length === 0) ? (
            <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
              <CardContent className="py-24 px-8 min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center justify-center space-y-8 text-center max-w-2xl w-full">
                  {/* 图标 */}
                  <div className="p-6 rounded-full bg-primary/10">
                    <Compass className="w-16 h-16 text-primary" />
                  </div>
                  
                  {/* 主文案 - 简洁友好 */}
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-foreground">
                      你还没有添加任何行程项～
                    </h2>
                    <p className="text-base text-muted-foreground">
                      添加第一站，开启你的专属旅程吧！
                    </p>
                  </div>
                  
                  {/* 按钮组 - 已取消状态下不显示 */}
                  {trip?.status !== 'CANCELLED' && (
                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                      {/* 主按钮：创建第一个行程项 */}
                      <Button
                        size="lg"
                        onClick={() => {
                          const firstDay = trip.TripDay?.[0];
                          if (firstDay) {
                            setSelectedDayId(firstDay.id);
                            setCreateItemDialogOpen(true);
                          } else if (trip.status === 'PLANNING') {
                            // ✅ 只有规划中状态才能进入规划工作台
                            navigate(`/dashboard/plan-studio?tripId=${id}`);
                          }
                        }}
                        className="flex-1 text-base h-12 shadow-lg hover:shadow-xl transition-shadow"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        创建第一个行程项
                      </Button>
                      
                      {/* 次按钮：进入规划工作台 - 仅规划中状态显示 */}
                      {trip?.status === 'PLANNING' && (
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => navigate(`/dashboard/plan-studio?tripId=${id}`)}
                          className="flex-1 text-base h-12"
                        >
                          <Compass className="w-5 h-5 mr-2" />
                          进入规划工作台
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 方案A 二段式：问题与改进 + 智能优化（常驻展开） */}
              {/* {trip && trip.destination && (
                <ComplianceRulesCard
                  tripId={id!}
                  countryCodes={extractCountryCodes(trip.destination)}
                  ruleTypes={['VISA', 'TRANSPORT', 'ENTRY']}
                />
              )} */}

              {/* 方案A 二段式：无问题时仅显示智能优化；有问题时显示问题与改进 + 智能优化 */}
              {trip?.status !== 'CANCELLED' && (hasPlanIssues || trip?.status === 'PLANNING') && (
                <div className="space-y-4">
                {/* 无问题且 PLANNING：直接显示智能优化，不显示 Tab 栏 */}
                {!hasPlanIssues && trip?.status === 'PLANNING' ? (
                  <OptimizeTabContent tripId={id!} trip={trip} onTripRefetch={loadTrip} />
                ) : (
                <Tabs value={planDetailTab} onValueChange={(v) => {
                  setPlanDetailTab(v as 'issues' | 'optimize');
                }} className="w-full">
                  <TabsList className={cn(
                    "grid w-full h-11 bg-muted/50 rounded-lg p-1",
                    trip?.status === 'PLANNING' ? "grid-cols-2" : "grid-cols-1"
                  )}>
                    <TabsTrigger
                      value="issues"
                      className="flex items-center justify-center gap-2 rounded-md px-4 py-2 text-muted-foreground hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold"
                    >
                      <Shield className="w-4 h-4" />
                      问题与改进
                    </TabsTrigger>
                    {trip?.status === 'PLANNING' && (
                      <TabsTrigger
                        value="optimize"
                        className="flex items-center justify-center gap-2 rounded-md px-4 py-2 text-muted-foreground hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold"
                      >
                        <Zap className="w-4 h-4" />
                        智能优化
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {/* 问题与改进：安全 | 节奏 | 修复 */}
                  <TabsContent value="issues" className="mt-4">
                <Tabs value={planViewTab} onValueChange={(v) => {
                  setPlanViewTab(v as typeof planViewTab);
                }} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-11 bg-muted/30 rounded-lg p-1">
                    <TabsTrigger 
                      value="abu" 
                      className={cn(
                        'flex items-center justify-center gap-2 relative',
                        'transition-all duration-200 ease-in-out',
                        'rounded-md px-4 py-2',
                        // 未激活状态
                        'text-muted-foreground',
                        'hover:text-foreground hover:bg-muted/80',
                        // 激活状态
                        'data-[state=active]:bg-persona-abu/20',
                        'data-[state=active]:text-persona-abu-foreground',
                        'data-[state=active]:font-semibold',
                        'data-[state=active]:shadow-sm',
                        // 底部指示器
                        'data-[state=active]:after:absolute',
                        'data-[state=active]:after:bottom-0',
                        'data-[state=active]:after:left-1/2',
                        'data-[state=active]:after:-translate-x-1/2',
                        'data-[state=active]:after:w-8',
                        'data-[state=active]:after:h-0.5',
                        'data-[state=active]:after:bg-persona-abu-foreground',
                        'data-[state=active]:after:rounded-full'
                      )}
                    >
                      <Shield className="w-4 h-4" />
                      安全
                    </TabsTrigger>
                    <TabsTrigger 
                      value="dre" 
                      className={cn(
                        'flex items-center justify-center gap-2 relative',
                        'transition-all duration-200 ease-in-out',
                        'rounded-md px-4 py-2',
                        // 未激活状态
                        'text-muted-foreground',
                        'hover:text-foreground hover:bg-muted/80',
                        // 激活状态
                        'data-[state=active]:bg-persona-dre/20',
                        'data-[state=active]:text-persona-dre-foreground',
                        'data-[state=active]:font-semibold',
                        'data-[state=active]:shadow-sm',
                        // 底部指示器
                        'data-[state=active]:after:absolute',
                        'data-[state=active]:after:bottom-0',
                        'data-[state=active]:after:left-1/2',
                        'data-[state=active]:after:-translate-x-1/2',
                        'data-[state=active]:after:w-8',
                        'data-[state=active]:after:h-0.5',
                        'data-[state=active]:after:bg-persona-dre-foreground',
                        'data-[state=active]:after:rounded-full'
                      )}
                    >
                      <Activity className="w-4 h-4" />
                      节奏
                    </TabsTrigger>
                    <TabsTrigger 
                      value="neptune" 
                      className={cn(
                        'flex items-center justify-center gap-2 relative',
                        'transition-all duration-200 ease-in-out',
                        'rounded-md px-4 py-2',
                        // 未激活状态
                        'text-muted-foreground',
                        'hover:text-foreground hover:bg-muted/80',
                        // 激活状态
                        'data-[state=active]:bg-persona-neptune/20',
                        'data-[state=active]:text-persona-neptune-foreground',
                        'data-[state=active]:font-semibold',
                        'data-[state=active]:shadow-sm',
                        // 底部指示器
                        'data-[state=active]:after:absolute',
                        'data-[state=active]:after:bottom-0',
                        'data-[state=active]:after:left-1/2',
                        'data-[state=active]:after:-translate-x-1/2',
                        'data-[state=active]:after:w-8',
                        'data-[state=active]:after:h-0.5',
                        'data-[state=active]:after:bg-persona-neptune-foreground',
                        'data-[state=active]:after:rounded-full'
                      )}
                    >
                      <RefreshCw className="w-4 h-4" />
                      修复
                    </TabsTrigger>
                  </TabsList>

                  {/* 安全视角 */}
                  <TabsContent value="abu" className="mt-4">
                    {abuData ? (
                      <AbuView 
                        trip={trip} 
                        abuData={abuData}
                        onItemClick={() => {
                          setDrawerTab('risk');
                          setDrawerOpen(true);
                        }}
                      />
                    ) : (personaAlertsLoading || decisionLogsLoading) ? (
                      <div className="flex flex-col items-center justify-center p-8 gap-2">
                        <LogoLoading size={32} />
                        <span className="text-sm text-muted-foreground">加载安全数据...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-8">
                        <div className="text-center">
                          <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <div className="text-sm text-muted-foreground">暂无安全数据</div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* 节奏视角 */}
                  <TabsContent value="dre" className="mt-4">
                    {(() => {
                      // 🐛 调试：记录渲染时的数据状态和 tab 状态
                      console.log('[TripDetail] DrDreView 渲染检查:', {
                        planViewTab, // 🆕 当前选中的 tab
                        isDreTabActive: planViewTab === 'dre', // 🆕 是否在节奏 tab
                        hasDrDreData: !!drDreData,
                        drDreDataMetrics: drDreData?.metrics,
                        hasTripMetrics: !!tripMetrics,
                        tripMetricsSummary: tripMetrics?.summary,
                        tripMetricsLoading,
                        decisionLogsCount: decisionLogs.length,
                        tripId: trip?.id,
                        renderTime: new Date().toISOString(),
                      });
                      
                      // 🐛 如果不在 dre tab，提前返回（不渲染组件）
                      if (planViewTab !== 'dre') {
                        console.log('[TripDetail] ⚠️ 不在 "dre" tab，跳过渲染 DrDreView', { planViewTab });
                        return null;
                      }
                      
                      console.log('[TripDetail] ✅ 在 "dre" tab，准备渲染 DrDreView', {
                        hasDrDreData: !!drDreData,
                        drDreMetrics: drDreData?.metrics,
                        tripMetricsSummary: tripMetrics?.summary,
                      });
                      
                      return drDreData ? (
                        <DrDreView 
                          key={`drDre-${trip?.id}-${decisionLogs.length}-${tripMetrics?.summary?.totalFatigue || 0}-${tripMetrics?.summary?.totalBuffer || 0}-${tripMetrics?.summary?.totalWalk || 0}-${tripMetrics?.summary?.totalDrive || 0}`} // 🐛 使用稳定的 key，基于实际数据值
                          trip={trip} 
                          drDreData={drDreData}
                          tripMetrics={tripMetrics}
                          tripMetricsLoading={tripMetricsLoading}
                          onItemClick={() => {
                            setDrawerTab('evidence');
                            setDrawerOpen(true);
                          }}
                          onScheduleChanged={async () => {
                            // 🆕 重新排程后刷新数据（包括冲突数据）
                            await Promise.all([
                              loadTrip(),
                              loadSuggestions(),
                              loadTripMetrics(), // 🆕 重新加载行程指标（DayItineraryCard 使用 dayMetrics.conflicts，DrDreView 使用 tripMetrics）
                              loadDecisionLogs(), // 🆕 重新加载决策日志（DrDreView 使用 decisionLogs 计算 drDreData）
                              loadPersonaAlerts(), // 🆕 重新加载人格提醒（用于计算综合指标）
                              loadTripHealth(),
                              loadConflicts(), // 🆕 重新加载冲突数据（重新排程后可能已解决冲突）
                            ]);
                          }}
                        />
                      ) : tripMetricsLoading ? (
                      // tripMetrics 正在加载中
                      <div className="flex flex-col items-center justify-center p-8 gap-2">
                        <LogoLoading size={32} />
                        <span className="text-sm text-muted-foreground">加载节奏数据...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-8">
                        <div className="text-center">
                          <Activity className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <div className="text-sm text-muted-foreground">暂无节奏数据</div>
                        </div>
                      </div>
                    );
                    })()}
                  </TabsContent>

                  {/* 修复视角 */}
                  <TabsContent value="neptune" className="mt-4">
                    {decisionLogsLoading || personaAlertsLoading ? (
                      <div className="flex flex-col items-center justify-center p-8 gap-2">
                        <LogoLoading size={32} />
                        <span className="text-sm text-muted-foreground">加载修复数据...</span>
                      </div>
                    ) : (
                      <NeptuneView 
                        trip={trip} 
                        neptuneData={neptuneData}
                        onItemClick={() => {
                          setDrawerTab('evidence');
                          setDrawerOpen(true);
                        }}
                        onRepairApplied={async () => {
                          // 刷新数据
                          await Promise.all([
                            loadTrip(),
                            loadSuggestions(),
                            loadTripMetrics(), // 🆕 重新加载行程指标（DayItineraryCard 使用 dayMetrics.conflicts，DrDreView 使用 tripMetrics）
                            loadDecisionLogs(), // 🆕 重新加载决策日志（DrDreView 使用 decisionLogs 计算 drDreData）
                            loadPersonaAlerts(), // 🆕 重新加载人格提醒（用于计算综合指标）
                            loadTripHealth(),
                            loadConflicts(), // 🆕 重新加载冲突数据（应用修复后可能已解决冲突）
                          ]);
                        }}
                        onAlternativeApplied={async () => {
                          // 刷新数据
                          await Promise.all([
                            loadTrip(),
                            loadSuggestions(),
                            loadTripMetrics(), // 🆕 重新加载行程指标（DayItineraryCard 使用 dayMetrics.conflicts，DrDreView 使用 tripMetrics）
                            loadDecisionLogs(), // 🆕 重新加载决策日志（DrDreView 使用 decisionLogs 计算 drDreData）
                            loadPersonaAlerts(), // 🆕 重新加载人格提醒（用于计算综合指标）
                            loadTripHealth(),
                            loadConflicts(), // 🆕 重新加载冲突数据（应用替代方案后可能已解决冲突）
                          ]);
                        }}
                      />
                    )}
                  </TabsContent>
                </Tabs>
                  </TabsContent>

                  {/* 智能优化（仅 PLANNING 时显示） */}
                  {trip?.status === 'PLANNING' && (
                    <TabsContent value="optimize" className="mt-4">
                      <OptimizeTabContent tripId={id!} trip={trip} onTripRefetch={loadTrip} />
                    </TabsContent>
                  )}
                </Tabs>
                )}
                </div>
              )}
            </>
          )}
          </TabsContent>

          {/* Execute Tab */}
          <TabsContent value="execute" className="mt-0">
            <div className="p-6 space-y-6">
              {/* 实时预算监控卡片 */}
              {id && (
                <BudgetMonitorCard
                  tripId={id}
                  onViewDetails={() => {
                    setActiveTab('budget');
                  }}
                  onSetConstraint={() => {
                    setActiveTab('budget');
                  }}
                  autoRefresh={true}
                  refreshInterval={5000}
                />
              )}

              {/* 费用汇总卡片 */}
              {id && (
                <TripCostSummaryCard tripId={id} />
              )}

              {/* 未支付费用列表 */}
              {id && (
                <UnpaidItemsList 
                  tripId={id}
                  onItemClick={(itemId) => {
                    // TODO: 打开费用编辑对话框或跳转到对应行程项
                    console.log('Click unpaid item:', itemId);
                  }}
                />
              )}

            <Card>
              <CardHeader>
                  <CardTitle>执行模式</CardTitle>
                  <CardDescription>下一步操作和今日时间线</CardDescription>
              </CardHeader>
                <CardContent className="space-y-4">
                  {/* Next Step 卡片 */}
                  {tripState?.nextStop ? (
                    <Card className="border-primary">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-semibold">{tripState.nextStop.placeName}</h3>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          预计到达: {tripState.nextStop.startTime ? new Date(tripState.nextStop.startTime).toLocaleString('zh-CN') : 'N/A'}
                        </div>
              </CardContent>
            </Card>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>暂无下一步操作</p>
                    </div>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/dashboard/execute?tripId=${id}`)}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    进入现场模式
                  </Button>
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          {/* Budget Tab */}
          <TabsContent value="budget" className="mt-0">
            {id ? (
              <TripBudgetPage tripId={id} embedded={true} />
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <p>无法加载预算信息</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="insights" className="mt-0">
            <div className="p-6">
            <Card>
              <CardHeader>
                  <CardTitle>复盘报告</CardTitle>
                  <CardDescription>查看路线报告和保存为模板</CardDescription>
              </CardHeader>
                <CardContent className="space-y-4">
                  {recapReport ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">稳健度</div>
                          <div className="text-2xl font-bold">{(recapReport as any)?.robustness || 8.5}/10</div>
                </div>
                        <div className="p-4 border rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">节奏</div>
                          <div className="text-2xl font-bold">标准</div>
                </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/dashboard/insights?tripId=${id}`)}
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        查看完整报告
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>行程完成后可查看复盘报告</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={loadRecapReport}
                        disabled={recapLoading}
                      >
                        {recapLoading ? '加载中...' : '生成报告'}
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // TODO: 保存为模板
                      toast.info('保存为模板功能开发中');
                    }}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    保存为模板
                  </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 决策记录页 */}
        <TabsContent value="decision-log" className="space-y-4">
          <DecisionLogTab tripId={id!} />
        </TabsContent>

        </div>
        </Tabs>
      </div>

      {/* 旧的 Tab 内容（保留作为备用，可通过 URL 参数访问） */}
      {false && (
        <>
        <TabsContent value="recap" className="space-y-4">
          {recapLoading ? (
            <div className="flex items-center justify-center py-12">
              <LogoLoading size={40} />
            </div>
          ) : recapReport ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">行程复盘报告</h2>
                  <p className="text-muted-foreground mt-1">
                    {recapReport?.destination} • {recapReport?.totalDays} 天
                  </p>
                </div>
                <Button onClick={loadRecapReport} variant="outline">
                  刷新报告
                </Button>
              </div>

              {/* 统计概览 */}
              <Card>
                <CardHeader>
                  <CardTitle>统计概览</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">访问地点</div>
                      <div className="text-2xl font-bold">{recapReport?.statistics?.totalPlaces ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">徒步路线</div>
                      <div className="text-2xl font-bold">{recapReport?.statistics?.totalTrails ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">总里程 (km)</div>
                      <div className="text-2xl font-bold">
                        {recapReport?.statistics?.totalTrailDistanceKm?.toFixed(1) ?? '0.0'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">累计爬升 (m)</div>
                      <div className="text-2xl font-bold">
                        {recapReport?.statistics?.totalElevationGainM?.toFixed(0) ?? '0'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 时间线 */}
              <Card>
                <CardHeader>
                  <CardTitle>行程时间线</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recapReport?.timeline?.map((dayTimeline, index) => (
                      <div key={index} className="border-l-2 border-blue-200 pl-4">
                        <div className="font-medium mb-2">
                          {format(new Date(dayTimeline.date), 'yyyy年MM月dd日')}
                        </div>
                        <div className="space-y-2">
                          {dayTimeline.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="text-sm">
                              <span className="text-muted-foreground">
                                {format(new Date(item.time), 'HH:mm')}
                              </span>{' '}
                              <span className="font-medium">{item.name}</span>
                              {item.duration && (
                                <span className="text-muted-foreground ml-2">
                                  ({item.duration} 分钟)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 访问地点列表 */}
              {(() => {
                // 在这个块内，recapReport 已经在外层条件中检查过了（第1505行），所以是非 null 的
                const report = recapReport!;
                if (!report.places || report.places.length === 0) {
                  return null;
                }
                const places = report.places;
                return (
                  <Card>
                    <CardHeader>
                      <CardTitle>访问地点 ({places.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {places.map((place) => (
                          <div key={place.id} className="border rounded-lg p-3">
                            <div className="font-medium">{place.nameCN}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {format(new Date(place.visitDate), 'yyyy-MM-dd')} {place.visitTime}
                            </div>
                            {place.category && (
                              <Badge variant="outline" className="mt-2">
                                {place.category}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">尚未生成复盘报告</p>
                <Button onClick={loadRecapReport}>生成复盘报告</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        </>
      )}

      {/* 编辑对话框 */}
      {trip && (
        <EditTripDialog
          trip={trip}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={loadTrip}
        />
      )}

      {/* 分享对话框 */}
      {id && (
        <ShareTripDialog
          tripId={id}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
        />
      )}

      {/* 协作者对话框 */}
      {id && (
        <CollaboratorsDialog
          tripId={id}
          open={collaboratorsDialogOpen}
          onOpenChange={setCollaboratorsDialogOpen}
        />
      )}

      {/* 行程反馈对话框 (V2 优化) */}
      {id && (
        <Dialog open={optimizationFeedbackDialogOpen} onOpenChange={setOptimizationFeedbackDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>行程反馈</DialogTitle>
            </DialogHeader>
            {user?.id ? (
              <FeedbackForm
                userId={user.id}
                tripId={id}
                totalDays={trip?.TripDay?.length ?? 7}
                onSubmit={async (req) => {
                  await submitFeedbackMutation.mutateAsync(req);
                  setOptimizationFeedbackDialogOpen(false);
                }}
                onCancel={() => setOptimizationFeedbackDialogOpen(false)}
                isSubmitting={submitFeedbackMutation.isPending}
              />
            ) : (
              <p className="text-muted-foreground py-6 text-center">请先登录后再提交反馈</p>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* 创建行程项对话框 */}
      {selectedDayId && (
        <CreateItineraryItemDialog
          tripDayId={selectedDayId}
          trip={trip}
          open={createItemDialogOpen}
          onOpenChange={(open) => {
            setCreateItemDialogOpen(open);
            if (!open) {
              setSelectedDayId(null);
            }
          }}
          onSuccess={handleCreateItemSuccess}
        />
      )}

      {/* 编辑行程项对话框 */}
      {editingItem && (
        <EditItineraryItemDialog
          item={editingItem}
          open={editItemDialogOpen}
          onOpenChange={(open) => {
            setEditItemDialogOpen(open);
            if (!open) {
              setEditingItem(null);
            }
          }}
          onSuccess={loadTrip}
          tripDays={trip?.TripDay?.map(d => ({ id: d.id, date: d.date })) || []}
          currentTripDayId={editingItem?.tripDayId}
        />
      )}

      {/* 替换行程项对话框 */}
      {replacingItem && id && (
        <ReplaceItineraryItemDialog
          tripId={id}
          itemId={replacingItem.id}
          placeName={replacingItem.Place?.nameCN}
          open={replaceDialogOpen}
          onOpenChange={(open) => {
            setReplaceDialogOpen(open);
            if (!open) {
              setReplacingItem(null);
            }
          }}
          onSuccess={handleReplaceSuccess}
        />
      )}

      {/* 调整时间对话框 */}
      {id && adjustingSuggestion && (
        <AdjustTimeDialog
          tripId={id}
          suggestion={adjustingSuggestion}
          open={adjustTimeDialogOpen}
          onOpenChange={(open) => {
            setAdjustTimeDialogOpen(open);
            if (!open) {
              setAdjustingSuggestion(null);
            }
          }}
          onSuccess={async () => {
            // 🐛 修复：调整时间后也需要刷新所有相关数据
            await Promise.all([
              loadSuggestions(),
              loadTrip(),
              loadTripMetrics(), // 🆕 重新加载行程指标
              loadDecisionLogs(), // 🆕 重新加载决策日志
              loadPersonaAlerts(), // 🆕 重新加载人格提醒
              loadTripHealth(), // 🆕 重新加载健康度数据
              loadConflicts(), // 🆕 重新加载冲突数据
            ]);
          }}
        />
      )}

      {/* 预览对话框 */}
      {id && previewSuggestion && (
        <SuggestionPreviewDialog
          tripId={id}
          suggestion={previewSuggestion}
          open={previewDialogOpen}
          onOpenChange={(open) => {
            setPreviewDialogOpen(open);
            if (!open) {
              setPreviewSuggestion(null);
            }
          }}
          onConfirm={async () => {
            // 重新加载建议列表、行程数据、健康度数据和冲突数据
            await Promise.all([
              loadSuggestions(),
              loadTrip(),
              loadTripMetrics(), // 🆕 重新加载行程指标（DayItineraryCard 使用 dayMetrics.conflicts，DrDreView 使用 tripMetrics）
              loadDecisionLogs(), // 🆕 重新加载决策日志（DrDreView 使用 decisionLogs 计算 drDreData）
              loadPersonaAlerts(), // 🆕 重新加载人格提醒（用于计算综合指标）
              loadTripHealth(), // 🆕 应用建议后重新加载健康度数据
              loadConflicts(), // 🆕 重新加载冲突数据（应用建议后可能已解决冲突）
            ]);
          }}
        />
      )}

      {/* 指标详细说明弹窗 */}
      {id && (
        <MetricExplanationDialog
          tripId={id}
          metricName={selectedMetric}
          open={metricExplanationDialogOpen}
          onOpenChange={(open) => {
            setMetricExplanationDialogOpen(open);
            if (!open) {
              setSelectedMetric(null);
            }
          }}
        />
      )}

      {/* Auto 综合优化弹窗 */}
      {id && (() => {
        // 过滤出高优先级建议（severity === 'blocker'）
        const blockerSuggestions = suggestions.filter(s => s.severity === 'blocker');
        
        return (
          <AutoOptimizeDialog
            tripId={id}
            suggestions={blockerSuggestions}
            open={autoOptimizeDialogOpen}
            onOpenChange={(open) => {
              setAutoOptimizeDialogOpen(open);
            }}
            onSuccess={async (result) => {
              // 优化成功后刷新数据
              await Promise.all([
                loadTrip(), // 重新加载行程数据
                loadSuggestions(), // 重新加载建议列表
                loadTripMetrics(), // 🆕 重新加载行程指标（DayItineraryCard 使用 dayMetrics.conflicts，DrDreView 使用 tripMetrics）
                loadDecisionLogs(), // 🆕 重新加载决策日志（DrDreView 使用 decisionLogs 计算 drDreData）
                loadPersonaAlerts(), // 🆕 重新加载人格提醒（用于计算综合指标）
                loadTripHealth(), // 重新加载健康度数据
                loadConflicts(), // 🆕 重新加载冲突数据（优化后可能已解决冲突）
              ]);
              
              // 显示成功提示
              if (result.success && result.appliedCount > 0) {
                toast.success(`成功应用 ${result.appliedCount} 条高优先级建议`);
                
                // 如果有影响数据，显示影响信息
                if (result.impact?.metrics) {
                  const metrics = result.impact.metrics;
                  const impactMessages: string[] = [];
                  
                  if (metrics.fatigue !== undefined && metrics.fatigue !== 0) {
                    impactMessages.push(`疲劳指数${metrics.fatigue > 0 ? '+' : ''}${metrics.fatigue}`);
                  }
                  if (metrics.buffer !== undefined && metrics.buffer !== 0) {
                    impactMessages.push(`缓冲时间${metrics.buffer > 0 ? '+' : ''}${metrics.buffer}分钟`);
                  }
                  if (metrics.cost !== undefined && metrics.cost !== 0) {
                    // 🐛 修复：使用 formatCurrency 而不是硬编码 ¥ 符号
                    const costFormatted = formatCurrency(Math.abs(metrics.cost), currency);
                    impactMessages.push(`费用${metrics.cost > 0 ? '+' : '-'}${costFormatted}`);
                  }
                  
                  if (impactMessages.length > 0) {
                    toast.info(`优化影响：${impactMessages.join('，')}`);
                  }
                }
              } else {
                toast.warning('没有成功应用任何建议');
              }
            }}
          />
        );
      })()}

      {/* 体能反馈弹窗 - 行程完成后显示 */}
      {id && trip && (
        <TripFeedbackDialog
          tripId={id}
          tripName={trip.name || trip.destination}
          open={fitnessFeedbackDialogOpen}
          onOpenChange={setFitnessFeedbackDialogOpen}
          onComplete={() => {
            // 标记该行程已提交反馈
            localStorage.setItem(`fitness_feedback_submitted_${id}`, 'true');
            setFitnessFeedbackDialogOpen(false);
            toast.success('感谢您的反馈！您的体能画像将根据反馈进行优化');
          }}
        />
      )}
    </div>
  );
}

