import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { tripsApi } from '@/api/trips';
import { countriesApi } from '@/api/countries';
import { tripDetailApi } from '@/api/trip-detail';
import type { Health, StatusUnderstanding } from '@/api/trip-detail';
import type { 
  TripDetail, 
  ItineraryItem, 
  TripRecapReport,
  EvidenceListResponse,
  PersonaAlert,
  DayMetricsResponse,
  TripMetricsResponse,
  ConflictsResponse
} from '@/types/trip';
import type { Suggestion, SuggestionStats } from '@/types/suggestion';
import { AssistantCenter } from '@/components/trips/AssistantCenter';
import { SuggestionGuardBar } from '@/components/trips/SuggestionGuardBar';
import DayItineraryCard from '@/components/trips/DayItineraryCard';
import { AdjustTimeDialog } from '@/components/trips/AdjustTimeDialog';
import { SuggestionPreviewDialog } from '@/components/trips/SuggestionPreviewDialog';
import type { Country } from '@/types/country';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { ArrowLeft, Calendar, Edit, Share2, Users, MapPin, MoreVertical, Trash2, TrendingUp, Shield, Activity, RefreshCw, History, Play, Compass, BarChart3, Eye, Clock, Cloud, AlertCircle, Info, AlertTriangle, Plus, Wallet, ExternalLink } from 'lucide-react';
import TripBudgetPage from './budget';
import BudgetOverviewCard from '@/components/trips/BudgetOverviewCard';
import BudgetAlertBanner from '@/components/trips/BudgetAlertBanner';
import BudgetMonitorCard from '@/components/trips/BudgetMonitorCard';
import TripCostSummaryCard from '@/components/trips/TripCostSummaryCard';
import UnpaidItemsList from '@/components/trips/UnpaidItemsList';
import HealthBar from '@/components/trips/HealthBar';
import { useDrawer } from '@/components/layout/DashboardLayout';
import { format } from 'date-fns';
import PersonaModeToggle, { type PersonaMode } from '@/components/common/PersonaModeToggle';
import { EditTripDialog } from '@/components/trips/EditTripDialog';
import { ShareTripDialog } from '@/components/trips/ShareTripDialog';
import { CollaboratorsDialog } from '@/components/trips/CollaboratorsDialog';
import { EditItineraryItemDialog } from '@/components/trips/EditItineraryItemDialog';
import { CreateItineraryItemDialog } from '@/components/trips/CreateItineraryItemDialog';
import { ReplaceItineraryItemDialog } from '@/components/trips/ReplaceItineraryItemDialog';
import { itineraryItemsApi } from '@/api/trips';
import { cn } from '@/lib/utils';
import ComplianceRulesCard from '@/components/trips/ComplianceRulesCard';
import BusinessHoursCard from '@/components/trips/BusinessHoursCard';
import type { DecisionLogEntry, ReplaceItineraryItemResponse } from '@/types/trip';
import { zhCN } from 'date-fns/locale';
import AbuView from '@/components/trips/views/AbuView';
import DrDreView from '@/components/trips/views/DrDreView';
import NeptuneView from '@/components/trips/views/NeptuneView';
import AutoView from '@/components/trips/views/AutoView';
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
import { useMemo } from 'react';
import { getPersonaColorClasses, getPersonaIconColorClasses } from '@/lib/persona-colors';
import { getTripStatusClasses, getTripStatusLabel } from '@/lib/trip-status';
import { getGateStatusClasses } from '@/lib/gate-status';
import { WeatherCard, WeatherAlertBanner } from '@/components/weather/WeatherCard';

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
          <div className="flex items-center justify-center">
            <Spinner className="w-8 h-8" />
          </div>
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
  const { t } = useTranslation();

  // 提取国家代码的辅助函数
  const extractCountryCodes = (destination: string | undefined): string[] => {
    if (!destination) return [];
    const parts = destination.split(',');
    const countryCode = parts[0]?.trim().toUpperCase();
    return countryCode ? [countryCode] : [];
  };
  const { setDrawerOpen, setDrawerTab } = useDrawer();
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
  const [viewMode, setViewMode] = useState<PersonaMode>('auto');
  const [adjustTimeDialogOpen, setAdjustTimeDialogOpen] = useState(false);
  const [adjustingSuggestion, setAdjustingSuggestion] = useState<Suggestion | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewSuggestion, setPreviewSuggestion] = useState<Suggestion | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview'); // ✅ Tab 状态控制
  
  // 新增：证据、风险、指标相关状态
  const [evidence, setEvidence] = useState<EvidenceListResponse | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [personaAlerts, setPersonaAlerts] = useState<PersonaAlert[]>([]);
  const [personaAlertsLoading, setPersonaAlertsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionStats, setSuggestionStats] = useState<SuggestionStats | null>(null);
  const [dayMetricsMap, setDayMetricsMap] = useState<Map<string, DayMetricsResponse>>(new Map());
  const [tripMetrics, setTripMetrics] = useState<TripMetricsResponse | null>(null);
  const [conflicts, setConflicts] = useState<ConflictsResponse | null>(null);
  
  // 新增：决策日志相关状态
  const [decisionLogs, setDecisionLogs] = useState<DecisionLogEntry[]>([]);
  
  // 新增：行程详情页 Agent 相关状态
  const [tripHealth, setTripHealth] = useState<Health | null>(null);
  const [statusUnderstanding, setStatusUnderstanding] = useState<StatusUnderstanding | null>(null);
  
  // 新增：提取的数据状态（通过 useMemo 计算）
  const abuData = useMemo<AbuViewData | null>(() => {
    if (decisionLogs.length === 0 && personaAlerts.length === 0) return null;
    return extractAbuData(decisionLogs, personaAlerts);
  }, [decisionLogs, personaAlerts]);
  
  const drDreData = useMemo<DrDreViewData | null>(() => {
    if (decisionLogs.length === 0 && !tripMetrics) return null;
    return extractDrDreData(decisionLogs, tripMetrics);
  }, [decisionLogs, tripMetrics]);
  
  const neptuneData = useMemo<NeptuneViewData | null>(() => {
    if (decisionLogs.length === 0 && suggestions.length === 0) return null;
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
    if (id) {
      loadTrip();
    }
  }, [id]);

  // ✅ 当行程状态变化时，自动调整 Tab（仅在状态变化时，不覆盖用户手动选择）
  useEffect(() => {
    if (!trip) return;
    
    // 如果当前在"执行"tab，但状态不是进行中或已完成，切换回"规划"tab
    if (activeTab === 'execute' && trip.status !== 'IN_PROGRESS' && trip.status !== 'COMPLETED') {
      setActiveTab('plan');
    }
    
    // 如果当前在"复盘"tab，但状态不是已完成，切换回"规划"tab
    if (activeTab === 'insights' && trip.status !== 'COMPLETED') {
      setActiveTab('plan');
    }
  }, [trip?.status, activeTab]);

  const loadTrip = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await tripsApi.getById(id);
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
        
        // 在 trip 设置后加载依赖 trip 的数据
        // 使用 setTimeout 确保 state 已更新
        setTimeout(() => {
          loadTripMetrics();
        }, 0);
        
        // 检查收藏和点赞状态
        // 注意：如果后端在 GET /trips/:id 响应中包含 isCollected、isLiked、likeCount 字段，
        // 可以直接从 data 中获取，无需单独调用接口
        // 加载行程状态
        await loadTripState();
        // 加载相关数据（先加载不依赖 trip 的数据）
        await Promise.all([
          loadEvidence(),
          loadSuggestions(),
          loadConflicts(),
          loadPersonaAlerts(), // 新增：加载三人格提醒
          loadDecisionLogs(), // 新增：加载决策日志
          loadTripHealth(), // 新增：加载行程健康度
          loadTripStatus(), // 新增：加载行程状态理解
        ]);
      } else {
        setError('行程数据为空');
      }
    } catch (err: any) {
      setError(err.message || '加载行程详情失败');
      console.error('Failed to load trip:', err);
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

  // 加载关键证据（前3条）
  const loadEvidence = async () => {
    if (!id) return;
    try {
      setEvidenceLoading(true);
      const data = await tripsApi.getEvidence(id, { limit: 3, offset: 0 });
      setEvidence(data);
    } catch (err: any) {
      console.error('Failed to load evidence:', err);
      // 静默处理错误，不影响主流程
    } finally {
      setEvidenceLoading(false);
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
      // 获取足够多的日志（100条）
      const response = await tripsApi.getDecisionLog(id, 100, 0);
      setDecisionLogs(response.items || []);
    } catch (err: any) {
      console.error('Failed to load decision logs:', err);
      // 静默处理错误，不影响主流程
      setDecisionLogs([]);
    }
  };

  // 新增：加载行程健康度
  const loadTripHealth = async () => {
    if (!id) return;
    try {
      const health = await tripDetailApi.getHealth(id);
      setTripHealth(health);
    } catch (err: any) {
      console.error('Failed to load trip health:', err);
      // 静默处理错误，不影响主流程
      setTripHealth(null);
    }
  };

  // 新增：加载行程状态理解
  const loadTripStatus = async () => {
    if (!id) return;
    try {
      const status = await tripDetailApi.getStatus(id);
      setStatusUnderstanding(status);
    } catch (err: any) {
      console.error('Failed to load trip status:', err);
      // 静默处理错误，不影响主流程
      setStatusUnderstanding(null);
    }
  };

  // 加载行程指标（用于健康度计算）
  const loadTripMetrics = async () => {
    if (!id || !trip) return;
    try {
      const data = await tripsApi.getMetrics(id);
      setTripMetrics(data);
      
      // 建立每日指标映射
      if (data.days) {
        const metricsMap = new Map<string, DayMetricsResponse>();
        for (const day of data.days) {
          metricsMap.set(day.date, day);
        }
        setDayMetricsMap(metricsMap);
      }
    } catch (err: any) {
      console.error('Failed to load trip metrics:', err);
      // 静默处理错误，不影响主流程
    }
  };

  // 加载冲突列表
  const loadConflicts = async () => {
    if (!id) return;
    try {
      const data = await tripsApi.getConflicts(id);
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
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error || '行程不存在'}</p>
          <Button onClick={() => navigate('/dashboard/trips')} className="mt-4" variant="outline">
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  // 计算健康度指标（从 API 获取真实数据）
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

    // 默认值（仅在数据加载中时使用）
    const defaultMetrics = {
      executable: 85,
      buffer: 70,
      risk: 25,
      cost: 80,
    };

    if (!tripMetrics) return defaultMetrics;

    // 基于行程指标计算健康度
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
      {/* 顶部 Header（12/12） */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-start justify-between gap-6">
          {/* 左：Trip Title + 标签 */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/trips')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
              <h1 className="text-2xl font-bold">{trip.destination}</h1>
              <Badge 
                variant="outline" 
                className={cn(
                  'font-medium',
                  getTripStatusClasses(trip.status as any)
                )}
              >
                {getTripStatusLabel(trip.status as any)}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground ml-11">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(trip.startDate), 'yyyy-MM-dd')} -{' '}
                {format(new Date(trip.endDate), 'yyyy-MM-dd')}
              </span>
            </div>
              <Badge variant="secondary">标准节奏</Badge>
              <Badge variant="secondary">自驾</Badge>
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

          {/* 中：Health Bar */}
          <div className="w-80" data-tour="health-bar">
            {trip?.TripDay?.some(day => day.ItineraryItem && day.ItineraryItem.length > 0) ? (
              <HealthBar
                executable={healthMetrics.executable}
                buffer={healthMetrics.buffer}
                risk={healthMetrics.risk}
                cost={healthMetrics.cost}
              />
            ) : (
              // ✅ 弱化上方提示，只显示简单的占位
              <div className="text-center text-xs text-muted-foreground/60 py-4">
                <Info className="w-3 h-3 mx-auto mb-1 opacity-40" />
                <p className="opacity-60">等待添加行程项</p>
              </div>
            )}
          </div>

          {/* 右：视图模式切换 + 主 CTA */}
          <div className="flex items-center gap-2" data-tour="primary-cta">
            {/* ✅ 已取消状态下隐藏视图切换 */}
            {trip.status !== 'CANCELLED' && (
              <PersonaModeToggle value={viewMode} onChange={setViewMode} />
            )}
            {mainCTA && CTAIcon && (
              <Button onClick={mainCTA.action} size="lg">
                <CTAIcon className="w-4 h-4 mr-2" />
                {mainCTA.label}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="w-4 h-4" />
          </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* ✅ 已取消状态下隐藏编辑、修改状态、分享、协作者 */}
                {trip.status !== 'CANCELLED' && (
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
                            // 进行中 → 已完成、已取消、规划中（允许重新规划）
                            allowedTransitions.push(
                              { status: 'COMPLETED', label: '已完成', icon: '✅', description: '完成行程' },
                              { status: 'CANCELLED', label: '已取消', icon: '❌', description: '取消行程' },
                              { status: 'PLANNING', label: '规划中', icon: '📋', description: '重新规划' }
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

      {/* 护航提示条（仅在有待处理建议时显示） */}
      <SuggestionGuardBar
        stats={suggestionStats}
        onClick={() => {
          // 滚动到助手中心或打开助手中心（如果需要）
        }}
      />
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
        <div className="px-6 py-2">
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
          <div className="border-b bg-white px-6">
        <TabsList>
              <TabsTrigger value="overview">
                <Eye className="w-4 h-4 mr-2" />
                总览
              </TabsTrigger>
              <TabsTrigger value="plan">
                <Compass className="w-4 h-4 mr-2" />
                规划
              </TabsTrigger>
              {/* ✅ 根据行程状态显示"执行"tab：仅在 IN_PROGRESS 或 COMPLETED 时显示 */}
              {(trip.status === 'IN_PROGRESS' || trip.status === 'COMPLETED') && (
                <TabsTrigger value="execute">
                  <Play className="w-4 h-4 mr-2" />
                  执行
                </TabsTrigger>
              )}
              {/* ✅ 根据行程状态显示"复盘"tab：仅在 COMPLETED 时显示 */}
              {trip.status === 'COMPLETED' && (
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

        <div className="flex-1 overflow-y-auto p-6">
          <TabsContent value="overview" className="mt-0 space-y-6">
            <div className="grid grid-cols-12 gap-6">
              {/* 左（8/12）：Route Map / Skeleton + Day Summary */}
              <div className="col-span-12 lg:col-span-8 space-y-6">
                {/* Route Map / Skeleton */}
          <Card>
            <CardHeader>
                    <CardTitle>路线骨架图</CardTitle>
                    <CardDescription>Day1~DayN 路线概览</CardDescription>
            </CardHeader>
            <CardContent>
                    <div className="space-y-4">
                      {trip.TripDay.map((day, idx) => {
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
                            onViewItinerary={trip.status === 'PLANNING' ? () => {
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
                            onAddItem={trip.status !== 'CANCELLED' ? () => {
                              // ✅ 已取消状态下不允许添加行程项
                              setSelectedDayId(day.id);
                              setCreateItemDialogOpen(true);
                            } : undefined}
                            onQuickPlan={trip.status === 'PLANNING' ? () => {
                              // ✅ 只有规划中状态才能快速规划
                              navigate(`/dashboard/plan-studio?tripId=${id}&dayId=${day.id}&mode=quick`);
                            } : undefined}
                            onViewRecommendations={trip.status === 'PLANNING' ? () => {
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

              {/* 右（4/12）：健康度 + 状态理解 + 助手中心 + Evidence Quick Peek */}
              <div className="col-span-12 lg:col-span-4 space-y-6">
                {/* 行程健康度（来自 trip-detail API） */}
                {tripHealth && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">行程健康度</CardTitle>
                      <CardDescription>理解与掌控旅行现状</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-sm',
                            tripHealth.overall === 'healthy' && getGateStatusClasses('ALLOW'),
                            tripHealth.overall === 'warning' && getGateStatusClasses('NEED_CONFIRM'),
                            tripHealth.overall === 'critical' && getGateStatusClasses('REJECT')
                          )}
                        >
                          {tripHealth.overall === 'healthy' && '健康'}
                          {tripHealth.overall === 'warning' && '警告'}
                          {tripHealth.overall === 'critical' && '严重'}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {Object.entries(tripHealth.dimensions).map(([key, dimension]) => (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {key === 'schedule' && '时间'}
                                {key === 'budget' && (
                                  <button
                                    onClick={() => {
                                      setActiveTab('budget');
                                    }}
                                    className="flex items-center gap-1 hover:text-primary transition-colors"
                                  >
                                    预算
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}
                                {key === 'pace' && '节奏'}
                                {key === 'feasibility' && '可达性'}
                              </span>
                              <span className="font-medium">{dimension.score}/100</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full transition-all',
                                  dimension.score >= 80 && 'bg-green-500',
                                  dimension.score >= 60 && dimension.score < 80 && 'bg-yellow-500',
                                  dimension.score < 60 && 'bg-red-500'
                                )}
                                style={{ width: `${dimension.score}%` }}
                              />
                            </div>
                            {dimension.issues.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {dimension.issues.slice(0, 2).join(', ')}
                                {dimension.issues.length > 2 && ` +${dimension.issues.length - 2} 更多`}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
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

                {/* 状态理解（来自 trip-detail API） */}
                {statusUnderstanding && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">状态理解</CardTitle>
                      <CardDescription>当前行程状态分析</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">进度</span>
                          <span className="text-sm font-medium">
                            {statusUnderstanding.progress.completed}/{statusUnderstanding.progress.total} (
                            {statusUnderstanding.progress.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${statusUnderstanding.progress.percentage}%` }}
                          />
                        </div>
                      </div>
                      {statusUnderstanding.nextSteps.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">下一步：</p>
                          <ul className="space-y-1">
                            {statusUnderstanding.nextSteps.slice(0, 3).map((step, index) => (
                              <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span>{step.step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {statusUnderstanding.risks.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-orange-600">风险：</p>
                          <ul className="space-y-1">
                            {statusUnderstanding.risks.slice(0, 2).map((risk, index) => (
                              <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                                <AlertTriangle className="w-3 h-3 text-orange-600 mt-0.5 flex-shrink-0" />
                                <span>{risk.description}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 助手中心 - 已取消状态下隐藏 */}
                {trip.status !== 'CANCELLED' && (
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
                          
                          // 重新加载建议列表
                          await loadSuggestions();
                          
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
                          
                          // 重新加载建议列表和行程数据
                          await loadSuggestions();
                          await loadTrip();
                          
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

                {/* Evidence Quick Peek - 已取消状态下隐藏 */}
                {trip.status !== 'CANCELLED' && (
                  <Card data-tour="evidence-quick-peek">
                  <CardHeader>
                    <CardTitle>关键证据</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {evidenceLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Spinner className="w-4 h-4" />
                    </div>
                    ) : evidence && evidence.items.length > 0 ? (
                      <>
                        {evidence.items.map((item) => {
                          const typeConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
                            opening_hours: { label: '营业时间', icon: Clock, color: 'text-blue-600' },
                            road_closure: { label: '封路信息', icon: AlertCircle, color: 'text-red-600' },
                            weather: { label: '天气窗口', icon: Cloud, color: 'text-sky-600' },
                            booking: { label: '预订信息', icon: Calendar, color: 'text-purple-600' },
                            other: { label: '其他', icon: Info, color: 'text-gray-600' },
                          };
                          
                          const config = typeConfig[item.type] || { label: item.type, icon: Info, color: 'text-gray-600' };
                          const Icon = config.icon;
                          
                          // 如果是营业时间类型，使用优化的组件
                          if (item.type === 'opening_hours') {
                            // 从 title 或 description 中提取地点名称
                            // title 可能是 "营业时间" 或 "地点名 营业时间"
                            // description 可能包含 "地点名 营业时间: {...JSON...}"
                            let placeName: string | undefined = undefined;
                            
                            // 尝试从 title 提取
                            if (item.title) {
                              const titleMatch = item.title.match(/^(.+?)\s*营业时间/);
                              if (titleMatch && titleMatch[1] && titleMatch[1] !== '营业时间') {
                                placeName = titleMatch[1].trim();
                              }
                            }
                            
                            // 如果 title 中没有，尝试从 description 开头提取
                            if (!placeName && item.description) {
                              const descMatch = item.description.match(/^(.+?)\s*营业时间\s*[:：]/);
                              if (descMatch && descMatch[1]) {
                                placeName = descMatch[1].trim();
                              }
                            }
                            
                            return (
                              <BusinessHoursCard
                                key={item.id}
                                title={placeName}
                                description={item.description || ''}
                                day={item.day}
                              />
                            );
                          }
                          
                          // 其他类型的证据，使用原有样式
                          let displayContent = item.description || '';
                          
                          // 确定显示的标题：优先使用 item.title，如果没有则使用类型标签
                          const displayTitle = item.title || config.label;
                          
                          return (
                            <div
                              key={item.id}
                              className="p-3 border rounded-lg hover:bg-muted/50 transition-colors space-y-2"
                            >
                              <div className="flex items-start gap-2">
                                <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.color)} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-sm font-medium">{displayTitle}</span>
                                    {item.day && (
                                      <Badge variant="outline" className="text-xs">
                                        Day {item.day}
                                      </Badge>
                                    )}
                      </div>
                                  {displayContent && (
                                    <div className="text-xs text-muted-foreground break-words">
                                      {displayContent}
                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {evidence.total > evidence.items.length && (
                          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                            还有 {evidence.total - evidence.items.length} 条证据
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        暂无关键证据
                      </div>
                    )}
                    {/* ✅ 查看所有证据按钮 */}
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => {
                        setDrawerTab('evidence');
                        setDrawerOpen(true);
                      }}
                    >
                      查看所有证据
                    </Button>
                  </CardContent>
                </Card>
                )}

                {/* ✅ 只有规划中状态才显示规划工作台按钮 */}
                {trip.status === 'PLANNING' && (
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/dashboard/plan-studio?tripId=${id}`)}
                  >
                    <Compass className="w-4 h-4 mr-2" />
                    打开计划工作室
                  </Button>
                )}
                    </div>
                      </div>
          </TabsContent>

          {/* Plan Tab */}
          <TabsContent value="plan" className="mt-0 space-y-4">
          {trip.TripDay.length === 0 ? (
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
                  {trip.status !== 'CANCELLED' && (
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
                      {trip.status === 'PLANNING' && (
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
              {/* 视图模式说明（仅在非Auto模式显示） */}
              {viewMode !== 'auto' && (
              <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                  <div className="text-sm">
                    {viewMode === 'abu' && (
                      <div className="flex items-center gap-2">
                        <Shield className={cn('w-4 h-4', getPersonaIconColorClasses('ABU'))} />
                        <span>
                            <strong>{t('personaModeToggle.abu.label')}：</strong>{t('personaModeToggle.abu.desc')}
                        </span>
                        </div>
                    )}
                    {viewMode === 'dre' && (
                      <div className="flex items-center gap-2">
                        <Activity className={cn('w-4 h-4', getPersonaIconColorClasses('DR_DRE'))} />
                        <span>
                            <strong>{t('personaModeToggle.dre.label')}：</strong>{t('personaModeToggle.dre.desc')}
                        </span>
                    </div>
              )}
                    {viewMode === 'neptune' && (
                      <div className="flex items-center gap-2">
                        <RefreshCw className={cn('w-4 h-4', getPersonaIconColorClasses('NEPTUNE'))} />
                        <span>
                            <strong>{t('personaModeToggle.neptune.label')}：</strong>{t('personaModeToggle.neptune.desc')}
                        </span>
                        </div>
                              )}
                            </div>
                  </CardContent>
                </Card>
              )}

              {/* 🆕 合规规则卡片 */}
              {trip && trip.destination && (
                <ComplianceRulesCard
                  tripId={id!}
                  countryCodes={extractCountryCodes(trip.destination)}
                  ruleTypes={['VISA', 'TRANSPORT', 'ENTRY']}
                />
              )}

              {/* 根据视图模式显示不同的视图组件 */}
              {viewMode === 'auto' && (
                <AutoView 
                  trip={trip} 
                  overallMetrics={overallMetrics}
                  abuData={abuData}
                  drDreData={drDreData}
                  neptuneData={neptuneData}
                  onNavigateToPlanStudio={trip.status === 'PLANNING' ? () => navigate(`/dashboard/plan-studio?tripId=${id}`) : undefined}
                  onAddItem={trip.status !== 'CANCELLED' ? () => {
                    // ✅ 已取消状态下不允许添加行程项
                    const firstDay = trip.TripDay?.[0];
                    if (firstDay) {
                      setSelectedDayId(firstDay.id);
                      setCreateItemDialogOpen(true);
                    }
                  } : undefined}
                />
              )}
              {viewMode === 'abu' && (
                <AbuView 
                  trip={trip} 
                  abuData={abuData}
                  onItemClick={() => {
                    setDrawerTab('risk');
                    setDrawerOpen(true);
                  }}
                />
              )}
              {viewMode === 'dre' && (
                <DrDreView 
                  trip={trip} 
                  drDreData={drDreData}
                  tripMetrics={tripMetrics}
                  onItemClick={() => {
                    setDrawerTab('evidence');
                    setDrawerOpen(true);
                  }}
                />
              )}
              {viewMode === 'neptune' && (
                <NeptuneView 
                  trip={trip} 
                  neptuneData={neptuneData}
                  onItemClick={() => {
                    setDrawerTab('evidence');
                    setDrawerOpen(true);
                  }}
                />
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
              <Spinner className="w-8 h-8" />
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
            // 重新加载建议列表和行程数据
            await loadSuggestions();
            await loadTrip();
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
            // 重新加载建议列表和行程数据
            await loadSuggestions();
            await loadTrip();
          }}
        />
      )}
    </div>
  );
}

