import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import { executionApi } from '@/api/execution';
import { placesApi } from '@/api/places';
import type { TripDetail, TripState, ScheduleResponse } from '@/types/trip';
import type { Reminder, FallbackPlan } from '@/api/execution';
import type { PlaceEvidenceResponse } from '@/api/places';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  SkipForward,
  RotateCcw,
  ArrowRight,
  Navigation,
  Wifi,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { EmptyExecuteIllustration } from '@/components/illustrations';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import SpotlightTour from '@/components/onboarding/SpotlightTour';
import type { TourStep } from '@/components/onboarding/SpotlightTour';
import { useOnboarding } from '@/hooks/useOnboarding';
import { WeatherCard } from '@/components/weather/WeatherCard';
import { cn } from '@/lib/utils';
import { FallbackSolutionPreviewDialog } from '@/components/execute/FallbackSolutionPreviewDialog';
import { ReorderScheduleDialog } from '@/components/execute/ReorderScheduleDialog';
import { EditTripDialog } from '@/components/trips/EditTripDialog';
import { ShareTripDialog } from '@/components/trips/ShareTripDialog';
import { CollaboratorsDialog } from '@/components/trips/CollaboratorsDialog';

// ⚠️ 改进：提取常量配置，减少硬编码
const EXECUTE_CONFIG = {
  POLLING_INTERVAL: {
    VISIBLE: 30000,    // 页面可见时：30秒
    HIDDEN: 60000,     // 页面隐藏时：60秒
  },
  REMINDER_ADVANCE_HOURS: 24,
  BUFFER_MINUTES: 15,
  WEATHER_REFRESH_INTERVAL: 5 * 60 * 1000, // 5分钟
} as const;

export default function ExecutePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const tripId = searchParams.get('tripId');
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [tripState, setTripState] = useState<TripState | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRepairSheet, setShowRepairSheet] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  
  // 对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [collaboratorsDialogOpen, setCollaboratorsDialogOpen] = useState(false);
  
  // 执行阶段相关状态
  const [reminders, setReminders] = useState<Reminder[]>([]);
  
  // 位置相关状态
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // ⚠️ 新增：关键证据状态
  const [placeEvidence, setPlaceEvidence] = useState<PlaceEvidenceResponse | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  
  // ⚠️ 新增：修复方案状态
  const [fallbackPlan, setFallbackPlan] = useState<FallbackPlan | null>(null);
  const [selectedSolutionId, setSelectedSolutionId] = useState<string | null>(null);
  const [previewSolutionId, setPreviewSolutionId] = useState<string | null>(null);
  const [showReorderDialog, setShowReorderDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  const { state: onboardingState, completeTour, completeStep } = useOnboarding();
  const [showExecuteTour, setShowExecuteTour] = useState(false);

  // ⚠️ 重要：所有 useMemo 必须在任何条件返回之前调用
  // 获取天气位置：优先使用用户当前位置，其次使用行程项坐标，最后使用目的地国家默认坐标
  const weatherLocation = useMemo(() => {
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

    // 1. 优先使用用户当前位置（GPS）
    if (userLocation) {
      return { location: userLocation, name: '当前位置' };
    }

    // 2. 如果没有 trip 数据，返回 null
    if (!trip) {
      return null;
    }

    // 3. 使用目的地平均位置（计算所有行程项的平均坐标）
    if (trip.TripDay) {
      const places: Array<{ lat: number; lng: number }> = [];
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
      if (places.length > 0) {
        const avgLat = places.reduce((sum, p) => sum + p.lat, 0) / places.length;
        const avgLng = places.reduce((sum, p) => sum + p.lng, 0) / places.length;
        return { 
          location: { lat: avgLat, lng: avgLng }, 
          name: trip.destination || '目的地' 
        };
      }
    }

    // 4. 如果没有行程项坐标，使用目的地国家的默认坐标
    if (trip.destination) {
      const code = trip.destination.split(',')[0]?.trim().toUpperCase();
      if (code && COORDS[code]) {
        return { location: { lat: COORDS[code].lat, lng: COORDS[code].lng }, name: COORDS[code].name };
      }
    }

    return null;
  }, [userLocation, trip]);

  // 判断是否是冰岛（用于显示详细风速信息）
  const isIceland = useMemo(() => {
    if (!trip?.destination) return false;
    const countryCode = trip.destination.split(',')[0]?.trim().toUpperCase();
    return countryCode === 'IS';
  }, [trip?.destination]);

  useEffect(() => {
    if (tripId) {
      loadData();
      loadReminders();
      
      // ⚠️ 开发环境：检查后端接口可用性
      if (import.meta.env.DEV) {
        // 延迟检查，避免影响正常加载
        setTimeout(() => {
          fetch('/api/execution/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tripId, action: 'get_status' }),
          })
            .then(res => {
              if (res.status === 404) {
                console.warn('[Execute Page] ⚠️ 后端接口 /api/execution/execute 返回404，可能未实现');
              } else if (!res.ok) {
                console.warn('[Execute Page] ⚠️ 后端接口 /api/execution/execute 返回错误:', res.status);
              }
            })
            .catch(() => {
              console.warn('[Execute Page] ⚠️ 无法连接到后端服务，请确认后端是否运行');
            });
        }, 2000);
      }
      
      // ⚠️ 改进：优化轮询机制 - 根据页面可见性调整轮询频率
      let interval: NodeJS.Timeout | null = null;
      
      const startPolling = () => {
        // 如果页面不可见，使用更长的轮询间隔
        // 如果页面可见，使用正常轮询间隔
        const pollInterval = document.hidden 
          ? EXECUTE_CONFIG.POLLING_INTERVAL.HIDDEN 
          : EXECUTE_CONFIG.POLLING_INTERVAL.VISIBLE;
        
        if (interval) {
          clearInterval(interval);
        }
        
        interval = setInterval(() => {
          if (tripId && !document.hidden) {
            loadTripState();
            loadReminders();
          }
        }, pollInterval);
      };
      
      // 初始启动轮询
      startPolling();
      
      // 监听页面可见性变化
      const handleVisibilityChange = () => {
        if (tripId) {
          if (!document.hidden) {
            // 页面变为可见时，立即更新一次数据
            loadTripState();
            loadReminders();
          }
          // 重新启动轮询（使用新的间隔）
          startPolling();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // 首次进入 Execute，显示引导
      if (!onboardingState.toursCompleted.execute) {
        setTimeout(() => {
          setShowExecuteTour(true);
        }, 1000);
      }
      
      return () => {
        if (interval) {
          clearInterval(interval);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [tripId, onboardingState.toursCompleted.execute]);

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

  // 获取用户当前位置
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('获取位置失败:', error);
          // 如果获取位置失败，不设置 userLocation，将使用行程位置
        }
      );
    }
  }, []);

  const loadData = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const [tripData, state] = await Promise.all([
        tripsApi.getById(tripId),
        tripsApi.getState(tripId),
      ]);
      setTrip(tripData);
      setTripState(state);
      
      // ⚠️ 调试：记录数据加载情况
      console.log('[Execute Page] 数据加载完成:', {
        tripId,
        hasTrip: !!tripData,
        hasTripState: !!state,
        currentDayId: state.currentDayId,
        currentItemId: state.currentItemId,
        nextStop: state.nextStop,
        tripDaysCount: tripData.TripDay?.length,
        tripDays: tripData.TripDay?.map(d => ({ id: d.id, date: d.date, itemsCount: d.ItineraryItem?.length || 0 })),
      });

      // ⚠️ 改进：加载今天的 Schedule
      // 优先使用 state.currentDayId，如果没有则使用今天的日期
      if (state.currentDayId) {
        // 从 currentDayId 对应的 TripDay 中获取日期
        const currentDay = tripData.TripDay?.find(d => d.id === state.currentDayId);
        const scheduleDate = currentDay?.date || new Date().toISOString().split('T')[0];
        
        console.log('[Execute Page] 加载 Schedule:', {
          currentDayId: state.currentDayId,
          currentDay: currentDay ? { id: currentDay.id, date: currentDay.date } : null,
          scheduleDate,
        });
        
        try {
          const schedule = await tripsApi.getSchedule(tripId, scheduleDate);
          console.log('[Execute Page] Schedule 加载成功:', {
            date: schedule.date,
            itemsCount: schedule.schedule?.items?.length || 0,
            persisted: schedule.persisted,
          });
          setTodaySchedule(schedule);
        } catch (err: any) {
          console.error('[Execute Page] Failed to load today schedule:', {
            error: err,
            currentDayId: state.currentDayId,
            scheduleDate,
            errorMessage: err?.message,
          });
          // Schedule加载失败不影响主流程，只记录错误
          // 但设置 todaySchedule 为 null，避免显示错误数据
          setTodaySchedule(null);
        }
      } else {
        // 如果没有 currentDayId，尝试加载今天的 Schedule
        const today = new Date().toISOString().split('T')[0];
        console.log('[Execute Page] 没有 currentDayId，加载今天的 Schedule:', { today });
        try {
          const schedule = await tripsApi.getSchedule(tripId, today);
          console.log('[Execute Page] Schedule 加载成功:', {
            date: schedule.date,
            itemsCount: schedule.schedule?.items?.length || 0,
            persisted: schedule.persisted,
          });
          setTodaySchedule(schedule);
        } catch (err: any) {
          console.error('[Execute Page] Failed to load today schedule:', {
            error: err,
            today,
            errorMessage: err?.message,
          });
          setTodaySchedule(null);
        }
      }
    } catch (err: any) {
      console.error('[Execute Page] Failed to load data:', err);
      
      // ⚠️ 改进：区分不同类型的错误，提供不同的处理策略
      const status = err?.response?.status;
      const is500 = status === 500;
      const is404 = status === 404;
      const isNetworkError = err?.code === 'ERR_NETWORK' || err?.code === 'ECONNREFUSED';
      
      if (is500) {
        // 500错误：后端服务器错误
        console.error('[Execute Page] ⚠️ 后端服务器错误（500），可能是后端服务异常');
        toast.error('后端服务异常', {
          description: '服务器暂时无法处理请求，请稍后重试或联系技术支持',
          duration: 5000,
        });
      } else if (is404) {
        // 404错误：接口未找到
        console.error('[Execute Page] ⚠️ 接口未找到（404），可能是接口路径错误或未实现');
        toast.error('接口未找到', {
          description: '请确认后端接口是否已实现',
          duration: 5000,
        });
      } else if (isNetworkError) {
        // 网络错误：无法连接到后端
        toast.error('无法连接到后端服务', {
          description: '请检查网络连接或确认后端服务是否运行',
          duration: 5000,
        });
      } else {
        // 其他错误
        const errorMessage = err?.response?.data?.error?.message || err?.message || '加载行程数据失败';
        toast.error(errorMessage, {
          description: '请刷新页面重试，或检查网络连接',
          duration: 5000,
        });
      }
      
      // 设置空状态，避免显示错误数据
      setTrip(null);
      setTripState(null);
      setTodaySchedule(null);
    } finally {
      setLoading(false);
    }
  };

  const loadTripState = async () => {
    if (!tripId) return;
    try {
      const state = await tripsApi.getState(tripId);
      setTripState(state);
    } catch (err: any) {
      const status = err?.response?.status;
      const is500 = status === 500;
      
      if (is500) {
        // 500错误：后端服务器错误
        console.error('[Execute Page] ⚠️ 获取行程状态失败（500错误）:', {
          error: err,
          message: err?.message,
          response: err?.response?.data,
        });
      } else {
        console.error('[Execute Page] Failed to load trip state:', err);
      }
      
      // ⚠️ 改进：轮询时失败不显示错误提示，避免打扰用户
      // 只在控制台记录错误
    }
  };

  const loadReminders = async () => {
    if (!tripId) return;
    try {
      const result = await executionApi.execute({
        tripId,
        action: 'remind',
        remindParams: {
          reminderTypes: ['departure', 'transport', 'weather', 'check_in', 'check_out'],
          advanceHours: EXECUTE_CONFIG.REMINDER_ADVANCE_HOURS,
        },
      });
      setReminders(result.uiOutput.reminders || []);
    } catch (err: any) {
      console.error('[Execute Page] Failed to load reminders:', err);
      
      // ⚠️ 改进：区分不同类型的错误
      const status = err?.response?.status;
      const is500 = status === 500;
      const is404 = status === 404;
      
      if (is500) {
        // 500错误：后端服务器错误，静默处理（避免打扰用户）
        if (import.meta.env.DEV) {
          console.warn('[Execute Page] ⚠️ 后端接口 /api/execution/execute 返回500错误（后端服务异常）');
        }
      } else if (is404) {
        // 404错误：接口未实现，静默处理
        if (import.meta.env.DEV) {
          console.warn('[Execute Page] ⚠️ 后端接口 /api/execution/execute 可能未实现（404错误）');
        }
      }
      
      // 提醒加载失败时设置为空数组，不显示错误提示（避免打扰用户）
      setReminders([]);
    }
  };

  const handleAction = async (action: string) => {
    if (!tripId) {
      toast.error('操作失败', {
        description: '缺少行程ID，请刷新页面重试',
        duration: 3000,
      });
      return;
    }
    
    // 检查是否有下一步信息（对于需要nextStop的操作）
    if ((action === 'delay-15m' || action === 'delay-30m' || action === 'skip' || action === 'replace') && !tripState?.nextStop?.itemId) {
      toast.error('操作失败', {
        description: '当前没有可操作的行程项，请等待行程数据加载完成',
        duration: 3000,
      });
      return;
    }
    
    // 防止重复点击
    if (actionLoading) {
      return;
    }
    
    setActionLoading(true);
    
    try {
      if (action === 'delay-15m' || action === 'delay-30m') {
        // 处理延迟变更
        const delayMinutes = action === 'delay-15m' ? 15 : 30;
        const result = await executionApi.execute({
          tripId,
          action: 'handle_change',
          changeParams: {
            changeType: 'schedule_change',
            changeDetails: {
              reason: `用户请求延迟 ${delayMinutes} 分钟`,
              delayMinutes, // ⚠️ 新增：传递延迟分钟数
              itemId: tripState?.nextStop?.itemId,
            },
          },
        });
        // 如果返回了更新后的时间线，更新状态
        if (result.uiOutput?.changeResult?.updatedSchedule) {
          const updatedSchedule = result.uiOutput.changeResult.updatedSchedule;
          setTodaySchedule({
            date: updatedSchedule.date,
            schedule: {
              items: updatedSchedule.schedule.items.map(item => ({
                placeId: item.placeId,
                placeName: item.placeName,
                startTime: item.startTime,
                endTime: item.endTime,
                type: 'ACTIVITY' as const, // 默认类型
              })),
            },
            persisted: false,
          });
        }
        // 重新加载数据
        await loadData();
        await loadReminders();
        setShowRepairSheet(true);
      } else if (action === 'skip') {
        // 处理跳过变更
        const result = await executionApi.execute({
          tripId,
          action: 'handle_change',
          changeParams: {
            changeType: 'activity_cancelled',
            changeDetails: {
              reason: '用户请求跳过当前活动',
              itemId: tripState?.nextStop?.itemId,
            },
          },
        });
        // 如果返回了更新后的时间线，更新状态
        if (result.uiOutput?.changeResult?.updatedSchedule) {
          const updatedSchedule = result.uiOutput.changeResult.updatedSchedule;
          setTodaySchedule({
            date: updatedSchedule.date,
            schedule: {
              items: updatedSchedule.schedule.items.map(item => ({
                placeId: item.placeId,
                placeName: item.placeName,
                startTime: item.startTime,
                endTime: item.endTime,
                type: 'ACTIVITY' as const, // 默认类型
              })),
            },
            persisted: false,
          });
        }
        await loadData();
        await loadReminders();
      } else if (action === 'replace') {
        // 触发修复（Neptune 会提供替换方案）
        const result = await executionApi.execute({
          tripId,
          action: 'fallback',
          fallbackParams: {
            triggerReason: '用户请求替换当前活动',
            itemId: tripState?.nextStop?.itemId,
            originalPlan: tripState,
          },
        });
        // ⚠️ 新增：保存修复方案数据
        if (result.uiOutput?.fallbackPlan) {
          setFallbackPlan(result.uiOutput.fallbackPlan);
        }
        setShowRepairSheet(true);
      } else if (action === 'reorder') {
        // ⚠️ 新增：重新排序功能
        if (!tripState?.currentDayId) {
          toast.error('无法获取当前日期信息');
          return;
        }
        if (!todaySchedule?.schedule?.items || todaySchedule.schedule.items.length === 0) {
          toast.error('当前没有可排序的行程项');
          return;
        }
        setShowReorderDialog(true);
      } else if (action.startsWith('agent:')) {
        // 调用 Agent API
        console.log('Calling Agent:', action);
      } else {
        console.log('Action:', action);
      }
      
      // 完成 execute 步骤
      completeStep('execute');
    } catch (err: any) {
      console.error('[Execute Page] Failed to handle action:', err);
      
      // ⚠️ 改进：区分不同类型的错误
      const is404 = err?.response?.status === 404 || err?.code === 'ERR_BAD_REQUEST';
      const is500 = err?.response?.status === 500;
      const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout') || err?.message?.includes('超时');
      const isNetworkError = err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error');
      
      if (isTimeout) {
        // ⚠️ 超时错误：提供明确的提示
        const timeoutSeconds = err?.config?.timeout ? Math.round(err.config.timeout / 1000) : 60;
        toast.error('请求超时', {
          description: `操作已等待 ${timeoutSeconds} 秒仍未完成。后端服务可能响应较慢或未运行，请稍后重试或联系技术支持。`,
          duration: 8000,
        });
        console.warn('[Execute Page] ⚠️ API 请求超时:', {
          action,
          timeout: err?.config?.timeout,
          url: err?.config?.url,
          message: err?.message,
        });
      } else if (is404) {
        if (import.meta.env.DEV) {
          console.warn('[Execute Page] ⚠️ 后端接口 /api/execution/execute 可能未实现（404错误）');
          toast.error('后端接口未实现', {
            description: '请确认后端已实现 /api/execution/execute 接口',
            duration: 5000,
          });
        } else {
          // 生产环境显示用户友好的错误提示
          toast.error('功能暂不可用', {
            description: '请稍后重试或联系技术支持',
            duration: 3000,
          });
        }
      } else if (is500) {
        toast.error('服务器错误', {
          description: '后端服务异常，请稍后重试',
          duration: 5000,
        });
      } else if (isNetworkError) {
        toast.error('网络错误', {
          description: '无法连接到服务器，请检查网络连接',
          duration: 5000,
        });
      } else {
        // 其他错误显示原始错误消息
        const errorMessage = err?.response?.data?.error?.message || err?.message || '操作失败，请重试';
        toast.error('操作失败', {
          description: errorMessage,
          duration: 5000,
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // ⚠️ 新增：加载关键证据
  const loadPlaceEvidence = async () => {
    if (!nextStop?.placeId) return;
    
    try {
      setEvidenceLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const evidence = await placesApi.getEvidence(nextStop.placeId, {
        date: today,
        includeWeather: true,
        includeTraffic: true,
      });
      setPlaceEvidence(evidence);
    } catch (err) {
      console.error('Failed to load place evidence:', err);
      // 如果加载失败，不显示错误，使用默认值
    } finally {
      setEvidenceLoading(false);
    }
  };

  // ⚠️ 新增：预览修复方案
  const handlePreviewSolution = (solutionId: string) => {
    setPreviewSolutionId(solutionId);
  };

  // ⚠️ 新增：应用修复方案
  const handleApplySolution = async (solutionId: string) => {
    if (!tripId) return;
    
    try {
      const result = await executionApi.applyFallback({
        tripId,
        solutionId,
        confirm: true,
      });
      
      if (result.success) {
        // 更新今日时间线
        setTodaySchedule({
          date: result.updatedSchedule.date,
          schedule: {
            items: result.updatedSchedule.schedule.items.map(item => ({
              placeId: item.placeId,
              placeName: item.placeName,
              startTime: item.startTime,
              endTime: item.endTime,
              type: 'ACTIVITY' as const, // 默认类型
            })),
          },
          persisted: false,
        });
        // 重新加载数据
        await loadData();
        await loadReminders();
        setShowRepairSheet(false);
        setFallbackPlan(null);
        toast.success('修复方案已应用');
      }
    } catch (err: any) {
      console.error('Failed to apply solution:', err);
      toast.error(err?.message || '应用失败，请重试');
    }
  };

  // Execute 页面引导步骤
  const executeTourSteps: TourStep[] = [
    {
      id: 'next-step',
      target: '[data-tour="next-step"]',
      title: 'Next Step',
      description: 'This is your only focus in the field. 这是您在实地执行时的唯一焦点。',
      position: 'bottom',
    },
    {
      id: 'quick-actions',
      target: '[data-tour="quick-actions"]',
      title: 'Quick Actions',
      description: "Reality changes. These actions keep the plan executable. 现实会变化，这些操作让计划保持可执行。",
      position: 'top',
    },
    {
      id: 'repair-sheet',
      target: '[data-tour="repair-sheet"]',
      title: 'Neptune Repair Sheet',
      description: 'Neptune proposes minimal-change repairs you can preview. Neptune 提供可预览的最小改动修复方案。',
      position: 'top',
      action: () => {
        // 模拟触发修复
        setShowRepairSheet(true);
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!tripId || !trip) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <div className="mb-4 opacity-50">
                <EmptyExecuteIllustration size={160} />
              </div>
              <p className="text-sm text-muted-foreground font-medium mb-1">请先选择一个正在执行的行程</p>
              <p className="text-xs text-muted-foreground mb-4">选择一个行程进入执行模式</p>
              <Button onClick={() => navigate('/dashboard/trips')}>
                前往行程库
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 从 tripState 获取下一步信息
  const nextStop = tripState?.nextStop;
  const currentDay = trip?.TripDay?.find(d => d.id === tripState?.currentDayId);
  const status = tripState?.currentItemId ? 'On track' : 'Needs repair';

  // 辅助函数：格式化地点名称（中英文）
  const formatPlaceName = (placeName: string, place?: { nameCN?: string; nameEN?: string | null }): string => {
    if (place?.nameCN && place?.nameEN) {
      return `${place.nameCN} / ${place.nameEN}`;
    } else if (place?.nameCN) {
      return place.nameCN;
    } else if (place?.nameEN) {
      return place.nameEN;
    }
    return placeName; // 如果没有 Place 对象，使用原始的 placeName
  };

  // 辅助函数：从 trip 数据中查找 Place 对象
  const findPlaceById = (placeId: number): { nameCN?: string; nameEN?: string | null } | undefined => {
    if (!trip?.TripDay) return undefined;
    const allItems = trip.TripDay.flatMap(day => day.ItineraryItem || []);
    const matchingItem = allItems.find(item => item.Place?.id === placeId);
    return matchingItem?.Place || undefined;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Execute Tour */}
      <SpotlightTour
        steps={executeTourSteps}
        open={showExecuteTour && !onboardingState.toursCompleted.execute}
        onClose={() => {
          setShowExecuteTour(false);
          completeTour('execute');
        }}
        onComplete={() => {
          setShowExecuteTour(false);
          completeTour('execute');
        }}
      />

      {/* A. 顶部条（12/12） */}
      <div className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{trip.destination || '执行模式'}</h1>
            <div className="flex items-center gap-2 mt-1">
              {currentDay && (
                <span className="text-sm text-muted-foreground">
                  {format(new Date(currentDay.date), 'yyyy-MM-dd')}
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {format(new Date(), 'HH:mm')}
              </span>
            </div>
          </div>
          <Badge variant={status === 'On track' ? 'default' : 'destructive'}>
            {status === 'On track' ? 'On Track' : 'Needs Repair'}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wifi className="h-4 w-4" />
            <span>在线</span>
          </div>
          {/* 天气卡片 */}
          {weatherLocation && (
            <WeatherCard
              location={weatherLocation.location}
              includeWindDetails={isIceland}
              compact={true}
              refreshInterval={EXECUTE_CONFIG.WEATHER_REFRESH_INTERVAL}
              locationName={weatherLocation.name}
            />
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-12 gap-6 max-w-7xl mx-auto">
          {/* B. 主卡片：Next Step（8/12） */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {nextStop ? (
              <Card className="border-primary" data-tour="next-step">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowRight className="h-5 w-5" />
                    下一步
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold">
                        {formatPlaceName(nextStop.placeName, nextStop.Place)}
                      </h3>
                    </div>
                    {nextStop.startTime && (
                      <div className="flex items-center gap-4 text-sm mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(nextStop.startTime), 'HH:mm')}
                        </span>
                        {nextStop.estimatedArrivalTime && (
                          <>
                            <span className="text-muted-foreground">
                              预计到达: {format(new Date(nextStop.estimatedArrivalTime), 'HH:mm')}
                            </span>
                            <Badge variant="outline">缓冲: {EXECUTE_CONFIG.BUFFER_MINUTES}分钟</Badge>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">为什么是现在：</span>
                      依据时间窗/交通/策略
                    </p>
                  </div>

                  {/* 关键证据（可折叠） */}
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!showEvidence && nextStop?.placeId) {
                          await loadPlaceEvidence();
                        }
                        setShowEvidence(!showEvidence);
                      }}
                      className="w-full justify-between"
                      disabled={evidenceLoading}
                    >
                      <span>关键证据</span>
                      {showEvidence ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    {showEvidence && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2 text-sm">
                        {evidenceLoading ? (
                          <div className="flex items-center justify-center py-2">
                            <Spinner className="w-4 h-4" />
                            <span className="ml-2 text-xs">加载中...</span>
                          </div>
                        ) : placeEvidence?.evidence ? (
                          <>
                            {placeEvidence.evidence.businessHours && (
                              <div>
                                <span className="font-medium">营业时间：</span>
                                <span className="text-muted-foreground">
                                  {placeEvidence.evidence.businessHours.open} - {placeEvidence.evidence.businessHours.close}
                                </span>
                              </div>
                            )}
                            {placeEvidence.evidence.roadClosure && (
                              <div>
                                <span className="font-medium">封路信息：</span>
                                <span className="text-muted-foreground">
                                  {placeEvidence.evidence.roadClosure.hasClosure 
                                    ? placeEvidence.evidence.roadClosure.closures?.[0]?.reason || '有封路'
                                    : '无'}
                                </span>
                              </div>
                            )}
                            {placeEvidence.evidence.weatherWindow && (
                              <div>
                                <span className="font-medium">天气窗口：</span>
                                <span className="text-muted-foreground">
                                  {placeEvidence.evidence.weatherWindow.description}
                                </span>
                              </div>
                            )}
                            {!placeEvidence.evidence.businessHours && 
                             !placeEvidence.evidence.roadClosure && 
                             !placeEvidence.evidence.weatherWindow && (
                              <div className="text-muted-foreground text-xs">
                                暂无关键证据信息
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-muted-foreground text-xs">
                            暂无关键证据信息
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => {
                      // ⚠️ 改进：优先使用 tripState.nextStop.Place（后端应返回完整 Place 信息）
                      // 如果后端返回了完整的 Place 信息，直接使用
                      // 否则从 trip 数据中查找对应的 Place
                      // ⚠️ 导航应该使用活动名称（行程项的 note），而不是地点名称
                      let place: any = null;
                      let lat: number | null = null;
                      let lng: number | null = null;
                      let activityName: string | null = null; // 活动名称
                      
                      console.log('[Execute Page] 开始导航 - 查找坐标和活动名称:', {
                        nextStop,
                        itemId: nextStop?.itemId,
                        hasTripStatePlace: !!(tripState?.nextStop as any)?.Place,
                        tripStateNextStop: tripState?.nextStop,
                        tripDaysCount: trip?.TripDay?.length,
                      });
                      
                      // 1. 优先使用 tripState.nextStop.Place（如果后端已返回）
                      if (tripState?.nextStop?.Place) {
                        place = tripState.nextStop.Place;
                        // 支持多种坐标字段格式
                        lat = place.latitude || place.lat || place.location?.lat;
                        lng = place.longitude || place.lng || place.location?.lng;
                        console.log('[Execute Page] 使用 tripState.nextStop.Place:', { lat, lng, place });
                      }
                      
                      // 2. 从 trip 数据中查找对应的行程项（用于获取活动名称和坐标）
                      const allItems = trip?.TripDay?.flatMap(day => day.ItineraryItem || []) || [];
                      let matchingItem: any = null;
                      
                      // 优先通过 itemId 查找行程项（用于获取活动名称）
                      if (nextStop?.itemId) {
                        matchingItem = allItems.find(item => item.id === nextStop.itemId);
                        if (matchingItem) {
                          // 获取活动名称（note 字段）
                          activityName = matchingItem.note || null;
                          console.log('[Execute Page] 找到行程项，活动名称:', { 
                            itemId: matchingItem.id, 
                            note: matchingItem.note,
                            activityName 
                          });
                        }
                      }
                      
                      // 3. 如果还没有找到 Place，通过 placeId 查找
                      if (!place && nextStop?.placeId) {
                        matchingItem = matchingItem || allItems.find(item => item.Place?.id === nextStop.placeId);
                        if (matchingItem?.Place) {
                          place = matchingItem.Place;
                          // 如果没有活动名称，使用地点名称作为后备
                          if (!activityName) {
                            activityName = matchingItem.note || null;
                          }
                        }
                        
                        console.log('[Execute Page] 从 trip 数据中查找:', {
                          nextStopPlaceId: nextStop?.placeId,
                          allItemsCount: allItems.length,
                          matchingItem: matchingItem ? { id: matchingItem.id, placeId: matchingItem.placeId, note: matchingItem.note } : null,
                          place: place ? { id: place.id, nameCN: place.nameCN } : null,
                          activityName,
                        });
                      }
                      
                      // 4. 如果还没有坐标，从 Place 中提取
                      if (place && (!lat || !lng)) {
                        lat = (place as any).latitude || (place as any).metadata?.location?.lat || (place as any).lat;
                        lng = (place as any).longitude || (place as any).metadata?.location?.lng || (place as any).lng;
                        console.log('[Execute Page] 提取坐标:', { lat, lng, placeKeys: Object.keys(place) });
                      }
                      
                      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                        console.log('[Execute Page] 坐标获取成功，打开导航:', { 
                          lat, 
                          lng, 
                          activityName,
                          placeName: place?.nameCN || place?.nameEN || nextStop?.placeName 
                        });
                        
                        // ⚠️ 重要：优先使用坐标进行导航，确保导航到正确的位置
                        // Google Maps 的 destination 参数可以接受坐标或名称
                        // 使用坐标可以避免同名地点导致的导航错误（如跳转到错误的国家）
                        // 可以同时提供名称作为显示信息，但坐标是主要导航目标
                        const destinationName = activityName || 
                                               (place?.nameCN && place?.nameEN ? `${place.nameCN} ${place.nameEN}` : null) ||
                                               place?.nameCN || 
                                               place?.nameEN || 
                                               nextStop?.placeName || 
                                               null;
                        
                        // ⚠️ 优先使用坐标，确保导航到正确位置
                        // 如果同时有坐标和名称，使用坐标作为主要导航目标
                        // 这样可以避免 Google Maps 解析名称时找到错误的地址
                        const destination = `${lat},${lng}`;
                        
                        console.log('[Execute Page] 使用坐标进行导航:', { 
                          lat, 
                          lng,
                          activityName, 
                          placeName: place?.nameCN || place?.nameEN,
                          destinationName,
                          note: '使用坐标确保导航到正确位置，避免同名地点错误'
                        });
                        
                        // 打开Google Maps导航（使用坐标）
                        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
                        console.log('[Execute Page] 导航URL:', mapsUrl);
                        window.open(mapsUrl);
                      } else {
                        console.error('[Execute Page] 无法获取坐标:', {
                          nextStop,
                          tripStateNextStop: tripState?.nextStop,
                          hasPlace: !!place,
                          placeKeys: place ? Object.keys(place) : [],
                          placeLatitude: place?.latitude,
                          placeLongitude: place?.longitude,
                          placeLat: (place as any)?.lat,
                          placeLng: (place as any)?.lng,
                          tripDaysCount: trip?.TripDay?.length,
                          extractedLat: lat,
                          extractedLng: lng,
                        });
                        
                        // ⚠️ 改进：根据是否有Place数据提供不同的错误提示
                        if (!place) {
                          toast.error('无法获取目的地坐标', {
                            description: '行程数据中缺少地点信息，请确认后端已返回 nextStop.Place 数据',
                            duration: 5000,
                          });
                        } else if (!lat && !lng) {
                          toast.error('无法获取目的地坐标', {
                            description: '地点数据中缺少坐标字段（latitude/longitude），请确认后端已返回坐标信息',
                            duration: 5000,
                          });
                        } else {
                          toast.error('无法获取目的地坐标', {
                            description: '坐标数据格式不正确，请检查后端返回的坐标字段',
                            duration: 5000,
                          });
                        }
                      }
                    }}
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    开始导航
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="mb-4 opacity-50">
                      <CheckCircle2 className="w-16 h-16 text-green-500" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">暂无下一步操作</p>
                    <p className="text-xs text-muted-foreground">所有任务已完成</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* C. 右侧：Today Timeline + Reminders（4/12） */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* 提醒卡片 */}
            {reminders.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    提醒
                  </CardTitle>
                  <CardDescription>重要提醒事项</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reminders.map((reminder) => {
                      const priorityColors = {
                        urgent: 'bg-red-100 border-red-300 text-red-800',
                        high: 'bg-orange-100 border-orange-300 text-orange-800',
                        medium: 'bg-yellow-100 border-yellow-300 text-yellow-800',
                        low: 'bg-blue-100 border-blue-300 text-blue-800',
                      };
                      return (
                        <div
                          key={reminder.id}
                          className={`p-3 border rounded-lg ${priorityColors[reminder.priority] || priorityColors.medium}`}
                        >
                          <div className="font-medium text-sm mb-1">{reminder.title}</div>
                          <div className="text-xs opacity-90">{reminder.message}</div>
                          {reminder.triggerTime && (
                            <div className="text-xs opacity-70 mt-1">
                              {format(new Date(reminder.triggerTime), 'MM-dd HH:mm')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>今日时间线</CardTitle>
                <CardDescription>只显示今天</CardDescription>
              </CardHeader>
              <CardContent>
                {todaySchedule?.schedule?.items ? (
                  <div className="space-y-2">
                    {todaySchedule.schedule.items.map((item, idx) => {
                      const isCurrent = tripState?.currentItemId === item.placeId.toString();
                      const isNext = nextStop?.itemId === item.placeId.toString();
                      return (
                        <div
                          key={idx}
                          className={`p-3 border rounded-lg ${
                            isCurrent ? 'bg-primary/10 border-primary' : isNext ? 'bg-yellow-50 border-yellow-200' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium">
                                {formatPlaceName(item.placeName, findPlaceById(item.placeId))}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {/^\d{2}:\d{2}$/.test(item.startTime) ? item.startTime : format(new Date(item.startTime), 'HH:mm')} - {/^\d{2}:\d{2}$/.test(item.endTime) ? item.endTime : format(new Date(item.endTime), 'HH:mm')}
                              </div>
                            </div>
                            {isCurrent && <Badge className="bg-primary">当前</Badge>}
                            {isNext && <Badge variant="outline">下一站</Badge>}
                            {!isCurrent && !isNext && <Badge variant="outline">待执行</Badge>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Clock className="w-12 h-12 text-gray-300 mb-3" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground font-medium mb-1">暂无今日安排</p>
                    <p className="text-xs text-muted-foreground">今天没有计划的活动</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* D. 固定动作栏（底部/右下浮层） */}
        <div className="fixed bottom-6 right-6 z-50" data-tour="quick-actions">
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('delay-15m')}
                  disabled={actionLoading || !tripId || !tripState?.nextStop?.itemId}
                  className="flex items-center gap-1"
                >
                  {actionLoading ? (
                    <Spinner className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  延迟15m
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('delay-30m')}
                  disabled={actionLoading || !tripId || !tripState?.nextStop?.itemId}
                  className="flex items-center gap-1"
                >
                  {actionLoading ? (
                    <Spinner className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  延迟30m
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('skip')}
                  disabled={actionLoading || !tripId || !tripState?.nextStop?.itemId}
                  className="flex items-center gap-1"
                >
                  {actionLoading ? (
                    <Spinner className="h-3 w-3" />
                  ) : (
                    <SkipForward className="h-3 w-3" />
                  )}
                  Skip
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('replace')}
                  disabled={actionLoading || !tripId || !tripState?.nextStop?.itemId}
                  className="flex items-center gap-1"
                >
                  {actionLoading ? (
                    <Spinner className="h-3 w-3" />
                  ) : (
                    <RotateCcw className="h-3 w-3" />
                  )}
                  Replace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('reorder')}
                  disabled={actionLoading || !tripId || !todaySchedule?.schedule?.items || todaySchedule.schedule.items.length === 0}
                  className="col-span-2"
                >
                  {actionLoading ? (
                    <>
                      <Spinner className="h-3 w-3 mr-1" />
                      处理中...
                    </>
                  ) : (
                    'Reorder today'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* E. Neptune Repair Sheet（触发后从底部弹出） */}
      <Sheet open={showRepairSheet} onOpenChange={setShowRepairSheet}>
        <SheetContent side="bottom" className="h-[80vh]" data-tour="repair-sheet">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Neptune 修复方案
            </SheetTitle>
            <SheetDescription>
              系统检测到问题，以下是推荐的修复方案
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {/* 问题描述 */}
            {fallbackPlan?.triggerReason && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="font-medium text-yellow-800 mb-2">检测到的问题</div>
                  <div className="text-sm text-yellow-700">
                    {fallbackPlan.triggerReason}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 修复方案列表 */}
            {fallbackPlan?.solutions && fallbackPlan.solutions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {fallbackPlan.solutions.map((solution) => (
                  <Card 
                    key={solution.id}
                    className={cn(
                      'cursor-pointer hover:shadow-md transition-shadow',
                      solution.recommended && 'border-primary'
                    )}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{solution.title}</CardTitle>
                        {solution.recommended && (
                          <Badge className="bg-primary">推荐</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        {solution.description}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="font-medium">到达时间：</span>
                          {solution.impact.arrivalTime}
                        </div>
                        <div>
                          <span className="font-medium">缺失点：</span>
                          {solution.impact.missingPlaces === 0 ? '无' : `${solution.impact.missingPlaces}个`}
                        </div>
                        <div>
                          <span className="font-medium">风险变化：</span>
                          {solution.impact.riskChange === 'low' ? '低' : 
                           solution.impact.riskChange === 'medium' ? '中' : '高'}
                        </div>
                      </div>
                      <Button 
                        variant={solution.recommended ? 'default' : 'outline'}
                        className="w-full"
                        onClick={() => handlePreviewSolution(solution.id)}
                      >
                        Preview
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Spinner className="w-8 h-8 mx-auto mb-2" />
                <p>正在生成修复方案...</p>
              </div>
            )}

            {/* Apply 按钮 */}
            {fallbackPlan?.solutions && fallbackPlan.solutions.length > 0 && (
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setShowRepairSheet(false);
                  setFallbackPlan(null);
                  setSelectedSolutionId(null);
                }}>
                  取消
                </Button>
                {selectedSolutionId ? (
                  <Button onClick={() => handleApplySolution(selectedSolutionId)}>
                    Apply Changes
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      const recommendedSolution = fallbackPlan.solutions.find(s => s.recommended);
                      const defaultSolution = fallbackPlan.solutions[0];
                      const solutionToApply = recommendedSolution || defaultSolution;
                      if (solutionToApply) {
                        setSelectedSolutionId(solutionToApply.id);
                        handleApplySolution(solutionToApply.id);
                      }
                    }}
                  >
                    Apply Changes
                  </Button>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 预览修复方案对话框 */}
      <FallbackSolutionPreviewDialog
        solutionId={previewSolutionId}
        open={!!previewSolutionId}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewSolutionId(null);
          }
        }}
        onApply={handleApplySolution}
      />

      {/* 重新排序对话框 */}
      {tripState?.currentDayId && todaySchedule?.schedule?.items && trip && (
        <ReorderScheduleDialog
          tripId={tripId!}
          dayId={tripState.currentDayId}
          items={todaySchedule.schedule.items}
          itemIdMap={useMemo(() => {
            // 构建 placeId 到 itemId 的映射
            const map = new Map<number, string>();
            const currentDay = trip.TripDay?.find(day => day.id === tripState.currentDayId);
            if (currentDay?.ItineraryItem) {
              currentDay.ItineraryItem.forEach(item => {
                if (item.placeId) {
                  map.set(item.placeId, item.id);
                }
              });
            }
            return map;
          }, [trip, tripState.currentDayId])}
          open={showReorderDialog}
          onOpenChange={setShowReorderDialog}
          onSuccess={async (result) => {
            // 更新今日时间线
            setTodaySchedule({
              date: result.updatedSchedule.date,
              schedule: {
                items: result.updatedSchedule.schedule.items.map(item => ({
                  placeId: item.placeId,
                  placeName: item.placeName,
                  startTime: item.startTime,
                  endTime: item.endTime,
                  type: 'ACTIVITY' as const,
                })),
              },
              persisted: false,
            });
            // 重新加载数据
            await loadData();
            await loadReminders();
          }}
        />
      )}

      {/* 编辑对话框 */}
      {trip && (
        <EditTripDialog
          trip={trip}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={() => {
            // 重新加载行程数据
            if (tripId) {
              loadData();
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

