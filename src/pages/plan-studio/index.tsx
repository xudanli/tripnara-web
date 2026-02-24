import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import IntentTab from './IntentTab';
import ScheduleTab from './ScheduleTab';
import PlanningWorkbenchTab from './PlanningWorkbenchTab';
import BudgetTab from './BudgetTab';
// PersonaModeToggle 已移除 - 三人格现在是系统内部工具，不再允许用户切换视图
// PlanStudioSidebar 已移除 - 策略概览功能已整合到 AI 助手侧边栏
import { Compass } from '@/components/illustrations/SimpleIllustrations';
import { Button } from '@/components/ui/button';
import WelcomeModal from '@/components/onboarding/WelcomeModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
// Icons are now imported from pipeline-status.ts
import {
  getPipelineStatusIcon,
  getPipelineStatusLabel,
  getPipelineStatusClasses,
  getPipelineProgressColor,
  type PipelineStageStatus,
} from '@/lib/pipeline-status';
import { cn } from '@/lib/utils';
import { tripsApi } from '@/api/trips';
import { Spinner } from '@/components/ui/spinner';
import { LogoLoading } from '@/components/common/LogoLoading';
import ReadinessDrawer from '@/components/readiness/ReadinessDrawer';
import type { PipelineStatus, PipelineStage, TripListItem, TripDetail } from '@/types/trip';
import { countriesApi } from '@/api/countries';
import type { Country } from '@/types/country';
import { Settings2, Zap, Footprints, Wallet, Sparkles } from 'lucide-react';
import { PlanStudioProvider } from '@/contexts/PlanStudioContext';
import { formatCurrency } from '@/utils/format';
import { WeatherCard } from '@/components/weather/WeatherCard';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import { useContextApi } from '@/hooks';
import type { ContextPackage } from '@/api/context';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { EditTripDialog } from '@/components/trips/EditTripDialog';
import { ShareTripDialog } from '@/components/trips/ShareTripDialog';
import { CollaboratorsDialog } from '@/components/trips/CollaboratorsDialog';

function PlanStudioPageContent() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const tripId = searchParams.get('tripId');
  const defaultTab = searchParams.get('tab') || 'schedule';
  // 如果访问已移除的 tab，重定向到 schedule
  const normalizedTab = (defaultTab === 'optimize' || defaultTab === 'what-if' || defaultTab === 'decision-draft' || defaultTab === 'bookings') ? 'schedule' : defaultTab;
  const [activeTab, setActiveTab] = useState(normalizedTab === 'intent' || normalizedTab === 'places' ? 'schedule' : normalizedTab);
  
  // 意图与约束弹窗
  const [showIntentDialog, setShowIntentDialog] = useState(false);
  // personaMode 已移除 - 三人格由系统自动调用，不再需要用户切换视图
  
  const [loading, setLoading] = useState(true);
  const [hasTrips, setHasTrips] = useState(false);
  const [tripExists, setTripExists] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // 用于触发子组件刷新
  const [readinessDrawerOpen, setReadinessDrawerOpen] = useState(false);
  const [highlightFindingId, setHighlightFindingId] = useState<string | undefined>(undefined);
  
  // 行程状态相关
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  
  // 行程相关（用于检查是否有行程和显示欢迎页面）
  const [allTrips, setAllTrips] = useState<TripListItem[]>([]);
  const [countryMap, setCountryMap] = useState<Map<string, Country>>(new Map());
  
  // 当前行程详情（用于摘要条显示）
  const [currentTrip, setCurrentTrip] = useState<TripDetail | null>(null);
  
  // 对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [collaboratorsDialogOpen, setCollaboratorsDialogOpen] = useState(false);
  
  // 生成方案相关状态
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [generatingStage, setGeneratingStage] = useState('');
  const { buildContextWithCompress } = useContextApi();

  // 根据国家代码获取国家名称
  const getCountryName = (countryCode: string): string => {
    const country = countryMap.get(countryCode);
    if (country) {
      return country.nameCN;
    }
    // 如果找不到，返回代码本身
    return countryCode;
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', value);
    setSearchParams(newParams);
    
    // 不再需要切换 personaMode，三人格由系统自动调用
  };

  // 监听「加入行程」等操作，刷新 ScheduleTab（右侧助手添加住宿/火车后）
  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener('plan-studio:schedule-refresh', handler);
    return () => window.removeEventListener('plan-studio:schedule-refresh', handler);
  }, []);


  // 加载国家信息
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await countriesApi.getAll();
        const countries = response.countries || [];
        const map = new Map<string, Country>();
        countries.forEach((country) => {
          map.set(country.isoCode, country);
        });
        setCountryMap(map);
      } catch (err: any) {
        console.error('Failed to load countries:', err);
      }
    };
    loadCountries();
  }, []);

  // 处理从其他页面传递过来的状态（如侧边栏的操作）
  useEffect(() => {
    const state = location.state as {
      openEditDialog?: boolean;
      openShareDialog?: boolean;
      openCollaboratorsDialog?: boolean;
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
      
      // 清除 state，避免刷新页面时重复打开
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, location.search]);

  // 检查行程数据和验证tripId是否有效
  useEffect(() => {
    const checkTripsAndTripId = async () => {
      try {
        setLoading(true);
        
        // 1. 检查是否有任何行程（只显示规划中的行程）
        const allTripsData = await tripsApi.getAll();
        const allTripsList = Array.isArray(allTripsData) ? allTripsData : [];
        // ✅ 只显示规划中状态的行程
        const planningTrips = allTripsList.filter(trip => trip.status === 'PLANNING');
        setAllTrips(planningTrips);
        setHasTrips(planningTrips.length > 0);
        
        // 2. 如果有tripId，验证行程是否存在且为规划中状态
        if (tripId) {
          try {
            const trip = await tripsApi.getById(tripId);
            // ✅ 检查行程状态是否为规划中
            if (trip.status === 'PLANNING') {
              setTripExists(true);
              setCurrentTrip(trip); // 保存当前行程详情
            } else {
              // 行程不是规划中状态，清除tripId参数
              console.warn('Trip is not in PLANNING status:', tripId, trip.status);
              setTripExists(false);
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('tripId');
              setSearchParams(newParams);
            }
          } catch (err: any) {
            // 行程不存在（可能已被删除）
            console.warn('Trip not found or deleted:', tripId);
            setTripExists(false);
            // 清除无效的tripId参数
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('tripId');
            setSearchParams(newParams);
          }
        } else {
          setTripExists(false);
        }
        
        // 3. 如果没有行程数据，显示引导状态
        if (allTripsList.length === 0) {
          setShowWelcomeModal(true);
        }
      } catch (err) {
        console.error('Failed to check trips:', err);
        setHasTrips(false);
        setTripExists(false);
        // 出错时也显示引导状态
        setShowWelcomeModal(true);
      } finally {
        setLoading(false);
      }
    };
    
    checkTripsAndTripId();
  }, [tripId, searchParams, setSearchParams]);

  // 获取行程 Pipeline 状态
  const loadPipelineStatus = async () => {
    if (!tripId) return;
    
    try {
      setLoadingStatus(true);
      setStatusError(null);
      const status = await tripsApi.getPipelineStatus(tripId);
      setPipelineStatus(status);
    } catch (err: any) {
      console.error('[PlanStudio] Failed to load pipeline status:', err);
      setStatusError(err.message || '获取状态失败');
      // 如果获取失败，尝试从 trip 详情中获取
      try {
        const trip = await tripsApi.getById(tripId);
        if (trip.pipelineStatus) {
          setPipelineStatus(trip.pipelineStatus);
        }
      } catch (tripErr) {
        // 忽略错误，保持 statusError
      }
    } finally {
      setLoadingStatus(false);
    }
  };

  // 当 tripId 变化时，加载 Pipeline 状态
  useEffect(() => {
    if (tripId && tripExists) {
      loadPipelineStatus();
    } else {
      setPipelineStatus(null);
      setStatusError(null);
    }
  }, [tripId, tripExists]);

  // 定期刷新状态（每30秒）
  useEffect(() => {
    if (!tripId || !tripExists) return;

    const interval = setInterval(() => {
      loadPipelineStatus();
    }, 30000); // 30秒

    return () => clearInterval(interval);
  }, [tripId, tripExists]);

  // 构建规划上下文
  const buildPlanningContext = () => {
    if (!currentTrip) return null;

    const destinationParts = currentTrip.destination?.split(',') || [];
    const country = destinationParts[0]?.trim().toUpperCase() || '';
    const city = destinationParts.length > 1 ? destinationParts.slice(1).join(',').trim() : undefined;

    const days = currentTrip.TripDay?.length || 0;
    if (days === 0) {
      toast.error('行程天数不能为0，请先设置行程日期');
      return null;
    }

    const constraints: any = {};
    if (currentTrip.totalBudget) {
      constraints.budget = {
        total: currentTrip.totalBudget,
        currency: currentTrip.budgetConfig?.currency || 'CNY',
      };
    }

    return {
      destination: {
        country,
        city,
      },
      days,
      travelMode: 'mixed' as const,
      constraints: Object.keys(constraints).length > 0 ? constraints : undefined,
    };
  };

  // 构建 Context Package
  const buildContextPackage = async (userQuery: string): Promise<ContextPackage | null> => {
    if (!currentTrip || !tripId) return null;

    try {
      const phase = 'planning';
      const agent = 'PLANNER';

      const contextPkg = await buildContextWithCompress(
        {
          tripId,
          phase,
          agent,
          userQuery,
          tokenBudget: 3600,
          requiredTopics: ['VISA', 'ROAD_RULES', 'SAFETY'],
          useCache: true,
        },
        {
          strategy: 'balanced',
          preserveKeys: [],
        }
      );

      return contextPkg;
    } catch (err: any) {
      console.error('[Plan Studio] Context Package 构建失败:', err);
      return null;
    }
  };

  // 加载行程数据
  const loadTrip = async () => {
    if (!tripId) return;
    try {
      const trip = await tripsApi.getById(tripId);
      if (trip.status === 'PLANNING') {
        setCurrentTrip(trip);
        setTripExists(true);
      }
    } catch (err: any) {
      console.error('Failed to load trip:', err);
    }
  };

  // 生成方案
  const handleGeneratePlan = async () => {
    if (!tripId || !currentTrip) {
      toast.error('请先选择行程');
      return;
    }

    const context = buildPlanningContext();
    if (!context) return;

    setGeneratingPlan(true);
    setGeneratingProgress(0);
    setGeneratingStage('准备中...');
    
    try {
      const userQuery = `帮我规划${currentTrip.destination || ''}的${currentTrip.TripDay?.length || 0}天行程`;
      
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setGeneratingProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      // 构建 Context Package（可选，不阻塞流程）
      setGeneratingStage('构建上下文...');
      setGeneratingProgress(20);
      buildContextPackage(userQuery).catch(err => {
        console.warn('Context Package 构建失败，继续执行:', err);
      });

      setGeneratingProgress(40);
      setGeneratingStage('执行规划操作...');

      // 调用规划工作台 API
      await planningWorkbenchApi.execute({
        context,
        tripId,
        userAction: 'generate',
      });

      clearInterval(progressInterval);
      setGeneratingProgress(100);
      setGeneratingStage('完成');

      toast.success('方案生成成功！3秒后切换到决策评估...', {
        duration: 3000,
        action: {
          label: '立即查看',
          onClick: () => {
            setActiveTab('workbench');
            const newParams = new URLSearchParams(searchParams);
            newParams.set('tab', 'workbench');
            setSearchParams(newParams);
          },
        },
      });
      
      // 延迟切换到决策评估 Tab，给用户选择时间
      setTimeout(() => {
        setActiveTab('workbench');
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', 'workbench');
        setSearchParams(newParams);
        setGeneratingProgress(0);
        setGeneratingStage('');
      }, 3000);
      
      // 刷新页面数据
      await loadTrip();
    } catch (err: any) {
      console.error('生成方案失败:', err);
      toast.error(err.message || '生成方案失败，请稍后重试');
      setGeneratingProgress(0);
      setGeneratingStage('');
    } finally {
      setGeneratingPlan(false);
    }
  };

  // ⚠️ 重要：所有 useMemo 必须在早期返回之前调用
  // 常见国家首都/主要城市坐标（用于没有行程项时的天气查询）
  const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number; name: string }> = {
    'IS': { lat: 64.1466, lng: -21.9426, name: '冰岛·雷克雅未克' },
    'JP': { lat: 35.6762, lng: 139.6503, name: '日本·东京' },
    'TH': { lat: 13.7563, lng: 100.5018, name: '泰国·曼谷' },
    'KR': { lat: 37.5665, lng: 126.9780, name: '韩国·首尔' },
    'US': { lat: 40.7128, lng: -74.0060, name: '美国·纽约' },
    'GB': { lat: 51.5074, lng: -0.1278, name: '英国·伦敦' },
    'FR': { lat: 48.8566, lng: 2.3522, name: '法国·巴黎' },
    'DE': { lat: 52.5200, lng: 13.4050, name: '德国·柏林' },
    'IT': { lat: 41.9028, lng: 12.4964, name: '意大利·罗马' },
    'ES': { lat: 40.4168, lng: -3.7038, name: '西班牙·马德里' },
    'AU': { lat: -33.8688, lng: 151.2093, name: '澳大利亚·悉尼' },
    'NZ': { lat: -36.8485, lng: 174.7633, name: '新西兰·奥克兰' },
    'SG': { lat: 1.3521, lng: 103.8198, name: '新加坡' },
    'MY': { lat: 3.1390, lng: 101.6869, name: '马来西亚·吉隆坡' },
    'VN': { lat: 21.0285, lng: 105.8542, name: '越南·河内' },
    'ID': { lat: -6.2088, lng: 106.8456, name: '印度尼西亚·雅加达' },
    'CN': { lat: 39.9042, lng: 116.4074, name: '中国·北京' },
    'HK': { lat: 22.3193, lng: 114.1694, name: '香港' },
    'TW': { lat: 25.0330, lng: 121.5654, name: '台湾·台北' },
    'AE': { lat: 25.2048, lng: 55.2708, name: '阿联酋·迪拜' },
    'EG': { lat: 30.0444, lng: 31.2357, name: '埃及·开罗' },
    'GR': { lat: 37.9838, lng: 23.7275, name: '希腊·雅典' },
    'TR': { lat: 41.0082, lng: 28.9784, name: '土耳其·伊斯坦布尔' },
    'PT': { lat: 38.7223, lng: -9.1393, name: '葡萄牙·里斯本' },
    'NL': { lat: 52.3676, lng: 4.9041, name: '荷兰·阿姆斯特丹' },
    'CH': { lat: 46.9480, lng: 7.4474, name: '瑞士·伯尔尼' },
    'AT': { lat: 48.2082, lng: 16.3738, name: '奥地利·维也纳' },
    'CZ': { lat: 50.0755, lng: 14.4378, name: '捷克·布拉格' },
    'NO': { lat: 59.9139, lng: 10.7522, name: '挪威·奥斯陆' },
    'SE': { lat: 59.3293, lng: 18.0686, name: '瑞典·斯德哥尔摩' },
    'FI': { lat: 60.1699, lng: 24.9384, name: '芬兰·赫尔辛基' },
    'DK': { lat: 55.6761, lng: 12.5683, name: '丹麦·哥本哈根' },
    'CA': { lat: 45.4215, lng: -75.6972, name: '加拿大·渥太华' },
    'MX': { lat: 19.4326, lng: -99.1332, name: '墨西哥·墨西哥城' },
    'BR': { lat: -23.5505, lng: -46.6333, name: '巴西·圣保罗' },
    'AR': { lat: -34.6037, lng: -58.3816, name: '阿根廷·布宜诺斯艾利斯' },
    'CL': { lat: -33.4489, lng: -70.6693, name: '智利·圣地亚哥' },
    'PE': { lat: -12.0464, lng: -77.0428, name: '秘鲁·利马' },
    'IN': { lat: 28.6139, lng: 77.2090, name: '印度·新德里' },
    'RU': { lat: 55.7558, lng: 37.6173, name: '俄罗斯·莫斯科' },
    'ZA': { lat: -33.9249, lng: 18.4241, name: '南非·开普敦' },
    'MA': { lat: 33.9716, lng: -6.8498, name: '摩洛哥·拉巴特' },
    'PH': { lat: 14.5995, lng: 120.9842, name: '菲律宾·马尼拉' },
    'HR': { lat: 45.8150, lng: 15.9819, name: '克罗地亚·萨格勒布' },
    'PL': { lat: 52.2297, lng: 21.0122, name: '波兰·华沙' },
    'HU': { lat: 47.4979, lng: 19.0402, name: '匈牙利·布达佩斯' },
    'IE': { lat: 53.3498, lng: -6.2603, name: '爱尔兰·都柏林' },
  };

  // 获取天气位置：优先使用行程项坐标，否则使用目的地国家默认坐标
  const weatherLocation = useMemo(() => {
    if (!currentTrip) {
      return null;
    }

    // 1. 尝试从行程项中获取坐标
    const places: Array<{ lat: number; lng: number }> = [];
    if (currentTrip.TripDay && currentTrip.TripDay.length > 0) {
      for (const day of currentTrip.TripDay) {
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
        name: currentTrip.destination || '目的地' 
      };
    }

    // 2. 如果没有行程项坐标，使用目的地国家的默认坐标
    if (currentTrip.destination) {
      const countryCode = currentTrip.destination.split(',')[0]?.trim().toUpperCase();
      const countryCoord = COUNTRY_COORDINATES[countryCode];
      if (countryCoord) {
        return {
          location: { lat: countryCoord.lat, lng: countryCoord.lng },
          name: countryCoord.name
        };
      }
    }

    return null;
  }, [currentTrip]);

  // 判断是否是冰岛（用于显示详细风速信息）
  const isIceland = useMemo(() => {
    if (!currentTrip?.destination) return false;
    const countryCode = currentTrip.destination.split(',')[0]?.trim().toUpperCase();
    return countryCode === 'IS';
  }, [currentTrip?.destination]);

  const handleWelcomeComplete = (experienceType: 'steady' | 'balanced' | 'exploratory') => {
    setShowWelcomeModal(false);
    navigate('/dashboard/trips/new?experience=' + experienceType);
  };

  // 加载中状态（使用 Logo 加载动画，符合 TripNARA 品牌与决策感）
  if (loading) {
    return (
      <LogoLoading size={56} fullScreen />
    );
  }

  // 没有行程数据或tripId无效时，显示引导状态
  if (!hasTrips || (tripId && !tripExists) || !tripId) {
    return (
      <>
        <WelcomeModal
          open={showWelcomeModal}
          onClose={() => {
            // 如果用户关闭模态框但还没有行程，引导到行程列表
            if (!hasTrips) {
              navigate('/dashboard/trips');
            } else {
              setShowWelcomeModal(false);
            }
          }}
          onComplete={handleWelcomeComplete}
        />
        
        {/* 如果用户已经完成了欢迎流程但还没有行程，显示空状态 */}
        {!showWelcomeModal && (
          <div className="p-6">
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center">
                  <div className="mb-4 opacity-50">
                    <Compass size={120} color="#9CA3AF" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium mb-1">{t('planStudio.noTrip')}</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {hasTrips ? t('planStudio.selectTripToStart') : t('planStudio.createFirstTrip')}
                  </p>
                  <Button onClick={() => navigate('/dashboard/trips')}>
                    {hasTrips ? t('planStudio.goToTrips') : t('planStudio.createTrip')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 顶部：标题 + 行程切换 + 状态 */}
      <div className="border-b bg-white px-4 sm:px-6 py-3 sm:py-4">
        {/* 第一行：标题和主要操作 */}
        <div className="flex items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{t('planStudio.title')}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 hidden sm:block">
              {t('planStudio.subtitle')}
            </p>
          </div>
          
          {/* 右侧操作区：生成方案按钮 + Pipeline状态 */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* 生成方案按钮 */}
            {tripId && tripExists && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-end gap-1">
                      <Button
                        onClick={handleGeneratePlan}
                        disabled={generatingPlan || !currentTrip}
                        size="sm"
                        className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                      >
                        {generatingPlan ? (
                          <>
                            <Spinner className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline sm:hidden">{generatingStage || '生成中'}</span>
                            <span className="hidden sm:inline">{generatingStage || '生成中...'}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline sm:hidden">生成</span>
                            <span className="hidden sm:inline">重新生成方案</span>
                          </>
                        )}
                      </Button>
                      {generatingPlan && generatingProgress > 0 && (
                        <div className="w-full max-w-[80px] sm:max-w-[120px]">
                          <Progress value={generatingProgress} className="h-1" />
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-sm">
                      基于您在时间轴的修改，生成新的行程方案。生成后可在决策评估中查看和提交。
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Pipeline 状态指示器 */}
            {tripId && tripExists && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {loadingStatus ? (
                  <Spinner className="w-3 h-3 sm:w-4 sm:h-4" />
                ) : pipelineStatus ? (
                  <button
                    onClick={() => setShowStatusDialog(true)}
                    className="hover:opacity-80 transition-opacity"
                    title="点击查看详细状态"
                  >
                    <PipelineStatusIndicator status={pipelineStatus} />
                  </button>
                ) : statusError ? (
                  <div className="text-xs text-muted-foreground">
                    状态加载失败
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* 第二行：天气卡片 */}
        {tripId && tripExists && weatherLocation && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-2 sm:pt-0 border-t sm:border-t-0">
            <div className="flex-shrink-0">
              <WeatherCard
                location={weatherLocation.location}
                includeWindDetails={isIceland}
                compact={true}
                refreshInterval={10 * 60 * 1000} // 10分钟刷新一次
                locationName={weatherLocation.name}
              />
            </div>
          </div>
        )}
      </div>

      {/* 摘要条 - 显示当前行程核心设置 */}
      {tripId && tripExists && currentTrip && (
        <TripSummaryBar 
          trip={currentTrip} 
          countryName={getCountryName(currentTrip.destination)}
          onOpenSettings={() => setShowIntentDialog(true)}
        />
      )}

      {/* 主内容区：Tab导航 + 内容 */}
      <div className="flex-1 overflow-hidden flex">
        {/* 主内容区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
            <div className="border-b bg-white px-6">
              <TabsList className="justify-start">
                <TabsTrigger value="schedule">{t('planStudio.tabs.schedule')}</TabsTrigger>
                <TabsTrigger value="workbench">{t('planStudio.tabs.workbench')}</TabsTrigger>
                <TabsTrigger value="budget">预算管理</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* 主内容区 */}
              <div className="max-w-5xl mx-auto">
                <TabsContent value="schedule" className="mt-0">
                  {tripId ? (
                    <ScheduleTab 
                      tripId={tripId} 
                      refreshKey={refreshKey}
                      onOpenReadinessDrawer={(findingId?: string) => {
                        setHighlightFindingId(findingId);
                        setReadinessDrawerOpen(true);
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center p-8">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">请先选择行程</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="workbench" className="mt-0">
                  <PlanningWorkbenchTab 
                    tripId={tripId!} 
                  />
                </TabsContent>
                <TabsContent value="budget" className="mt-0">
                  <BudgetTab tripId={tripId!} />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </div>

      {/* 准备度抽屉 */}
      <ReadinessDrawer
        open={readinessDrawerOpen}
        onClose={() => {
          setReadinessDrawerOpen(false);
          setHighlightFindingId(undefined);
        }}
        tripId={tripId}
        highlightFindingId={highlightFindingId}
      />

      {/* Pipeline 状态详情对话框 */}
      {pipelineStatus && (
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>行程规划状态</DialogTitle>
              <DialogDescription>
                查看行程规划的各个阶段完成情况
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {pipelineStatus.stages.map((stage) => (
                <PipelineStageCard key={stage.id} stage={stage} />
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 意图与约束弹窗 */}
      <Dialog open={showIntentDialog} onOpenChange={setShowIntentDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              调整约束
            </DialogTitle>
            <DialogDescription>
              设置行程的意图、偏好和约束条件
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <IntentTab tripId={tripId} />
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      {currentTrip && (
        <EditTripDialog
          trip={currentTrip}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={() => {
            // 重新加载行程数据
            if (tripId) {
              tripsApi.getById(tripId).then(setCurrentTrip).catch(console.error);
            }
          }}
        />
      )}

      {/* 分享对话框 */}
      {tripId && (
        <ShareTripDialog
          tripId={tripId}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
        />
      )}

      {/* 协作者对话框 */}
      {tripId && (
        <CollaboratorsDialog
          tripId={tripId}
          open={collaboratorsDialogOpen}
          onOpenChange={setCollaboratorsDialogOpen}
        />
      )}
    </div>
  );
}

// 行程摘要条组件
function TripSummaryBar({ 
  trip, 
  countryName,
  onOpenSettings 
}: { 
  trip: TripDetail; 
  countryName: string;
  onOpenSettings: () => void;
}) {
  // 从 pacingConfig 获取节奏信息
  const getPaceLabel = () => {
    const level = trip.pacingConfig?.level;
    const maxActivities = trip.pacingConfig?.maxDailyActivities;
    
    if (level === 'relaxed' || (maxActivities && maxActivities <= 3)) {
      return { label: '悠闲', emoji: '🌿', desc: '每天2-3个点' };
    } else if (level === 'tight' || (maxActivities && maxActivities > 5)) {
      return { label: '紧凑', emoji: '🚀', desc: '每天6+个点' };
    }
    return { label: '标准', emoji: '⚖️', desc: '每天4-5个点' };
  };

  const pace = getPaceLabel();
  const budget = trip.totalBudget || trip.budgetConfig?.totalBudget;
  const currency = trip.budgetConfig?.currency || 'CNY';
  const days = trip.TripDay?.length || 0;
  const startDate = trip.startDate ? new Date(trip.startDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '';
  const endDate = trip.endDate ? new Date(trip.endDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '';

  return (
    <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b px-6 py-3">
      <div className="flex items-center justify-between">
        {/* 左侧：核心信息 */}
        <div className="flex items-center gap-6 text-sm">
          {/* 目的地和日期 */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">{countryName}</span>
            {startDate && endDate && (
              <span className="text-slate-500">
                {startDate} - {endDate} ({days}天)
              </span>
            )}
          </div>
          
          {/* 分隔线 */}
          <div className="h-4 w-px bg-slate-300" />
          
          {/* 节奏 */}
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-slate-600">{pace.emoji} {pace.label}</span>
          </div>
          
          {/* 预算 */}
          {budget && budget > 0 && (
            <>
              <div className="h-4 w-px bg-slate-300" />
              <div className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-600">{formatCurrency(budget, currency)}</span>
              </div>
            </>
          )}
          
          {/* 旅行者数量 */}
          {trip.pacingConfig?.travelers && trip.pacingConfig.travelers.length > 0 && (
            <>
              <div className="h-4 w-px bg-slate-300" />
              <div className="flex items-center gap-1.5">
                <Footprints className="w-4 h-4 text-blue-500" />
                <span className="text-slate-600">{trip.pacingConfig.travelers.length}人</span>
              </div>
            </>
          )}
        </div>
        
        {/* 右侧：调整按钮 */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onOpenSettings}
          className="text-slate-600 hover:text-slate-800"
        >
          <Settings2 className="w-4 h-4 mr-1.5" />
          调整约束
        </Button>
      </div>
    </div>
  );
}

// Pipeline 状态指示器组件
function PipelineStatusIndicator({ status }: { status: PipelineStatus }) {
  // 计算当前进度
  const totalStages = status.stages.length;
  const completedStages = status.stages.filter(s => s.status === 'completed').length;
  const riskStages = status.stages.filter(s => s.status === 'risk').length;
  const inProgressStages = status.stages.filter(s => s.status === 'in-progress').length;
  
  // 获取当前阶段
  const currentStage = status.stages.find(s => s.status === 'in-progress' || s.status === 'risk');
  
  // 计算进度百分比
  const progressPercentage = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;
  
  // 获取进度条颜色
  const progressColorClass = riskStages > 0 
    ? getPipelineProgressColor('risk')
    : inProgressStages > 0
    ? getPipelineProgressColor('in-progress')
    : getPipelineProgressColor('completed');
  
  return (
    <div className="flex items-center gap-3 text-xs">
      {/* 进度条 */}
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={cn('h-full transition-all', progressColorClass)}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <span className="text-muted-foreground min-w-[3rem]">
          {completedStages}/{totalStages}
        </span>
      </div>
      
      {/* 当前阶段 */}
      {currentStage && (
        <div className="flex items-center gap-1">
          <div className={cn(
            'w-2 h-2 rounded-full animate-pulse',
            getPipelineProgressColor(currentStage.status as PipelineStageStatus)
          )} />
          <span className="text-muted-foreground">
            {currentStage.name}
          </span>
        </div>
      )}
      
      {/* 风险提示 */}
      {riskStages > 0 && (
        <div className={cn('flex items-center gap-1', getPipelineStatusClasses('risk'))}>
          <span>⚠️</span>
          <span>{riskStages} 个风险项</span>
        </div>
      )}
    </div>
  );
}

// Pipeline 阶段卡片组件
function PipelineStageCard({ stage }: { stage: PipelineStage }) {
  const stageStatus = stage.status as PipelineStageStatus;
  const StatusIcon = getPipelineStatusIcon(stageStatus);
  const statusClasses = getPipelineStatusClasses(stageStatus);
  
  // 对于 in-progress 状态，添加动画
  const iconClasses = cn(
    'w-5 h-5',
    statusClasses.split(' ').find(cls => cls.startsWith('text-')) || 'text-muted-foreground',
    stageStatus === 'in-progress' && 'animate-spin'
  );

  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        <StatusIcon className={iconClasses} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-sm">{stage.name}</h4>
          <Badge 
            variant="outline" 
            className={cn('border', statusClasses)}
          >
            {getPipelineStatusLabel(stageStatus)}
          </Badge>
        </div>
        {stage.summary && (
          <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line">
            {stage.summary}
          </p>
        )}
        {stage.completedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            完成时间: {new Date(stage.completedAt).toLocaleString('zh-CN')}
          </p>
        )}
      </div>
    </div>
  );
}

// 导出包裹了 Provider 的页面组件
export default function PlanStudioPage() {
  return (
    <PlanStudioProvider>
      <PlanStudioPageContent />
    </PlanStudioProvider>
  );
}