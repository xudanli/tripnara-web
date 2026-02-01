/**
 * Dashboard 页面 - 重新设计
 * 显示决策状态区域、继续编辑卡片、快捷入口和创建行程入口
 * 符合 TripNARA "决策优先"的产品定位
 */

import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { tripsApi } from '@/api/trips';
import { countriesApi } from '@/api/countries';
import type { TripListItem } from '@/types/trip';
import type { Country } from '@/types/country';
import { Spinner } from '@/components/ui/spinner';
import WelcomeModal from '@/components/onboarding/WelcomeModal';
import { useOnboarding } from '@/hooks/useOnboarding';
import DecisionStatusSection from '@/components/dashboard/DecisionStatusSection';
import ContinueEditingCard from '@/components/dashboard/ContinueEditingCard';
import QuickAccessSection from '@/components/dashboard/QuickAccessSection';
import CreateTripSection from '@/components/dashboard/CreateTripSection';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function DashboardPage() {
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedContinueEditing, setDismissedContinueEditing] = useState<string | null>(null);
  
  // Onboarding
  const {
    isFirstTime,
    completeWelcome,
    dismiss,
  } = useOnboarding();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // 检查是否需要显示 Welcome Modal（首次登录或没有行程数据时）
  useEffect(() => {
    if (loading) return; // 等待数据加载完成
    
    // 首次登录或没有任何行程数据时，显示 Welcome Modal
    if (isFirstTime || trips.length === 0) {
      setShowWelcomeModal(true);
    }
  }, [isFirstTime, trips.length, loading]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 并行加载行程和国家数据
      const [tripsData, countriesData] = await Promise.all([
        tripsApi.getAll().catch(() => []),
        countriesApi.getAll().catch(() => ({ countries: [] })),
      ]);
      
      const tripsList = Array.isArray(tripsData) ? tripsData : [];
      setTrips(tripsList);
      
      const countriesList = Array.isArray(countriesData) 
        ? countriesData 
        : (countriesData?.countries || []);
      setCountries(countriesList);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 获取国家名称
  const getCountryName = (countryCode: string): string => {
    const country = countries.find(c => 
      c.isoCode.toLowerCase() === countryCode.toLowerCase()
    );
    return country?.nameCN || countryCode;
  };

  // 获取需要继续编辑的行程
  const continueEditingTrip = useMemo(() => {
    if (dismissedContinueEditing) return null;
    
    // 筛选未完成的行程（PLANNING 状态）
    const unfinishedTrips = trips.filter(trip => {
      const isUnfinished = trip.status === 'PLANNING';
      if (!isUnfinished) return false;
      
      // 检查最后编辑时间是否在30天内
      if (trip.updatedAt) {
        const updatedDate = new Date(trip.updatedAt);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      }
      
      return true;
    });
    
    // 按最后编辑时间降序排序，取第一个
    return unfinishedTrips
      .sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      })[0] || null;
  }, [trips, dismissedContinueEditing]);

  const handleTripCreated = (_tripId?: string) => {
    // 行程创建成功后的回调
    toast.success('行程创建成功！', {
      description: '正在加载行程详情...',
      duration: 3000,
    });
    
    // 重新加载数据
    loadData();
  };

  const handleWelcomeComplete = (experienceType: 'steady' | 'balanced' | 'exploratory') => {
    completeWelcome(experienceType);
    setShowWelcomeModal(false);
  };

  const handleDismissContinueEditing = () => {
    if (continueEditingTrip) {
      setDismissedContinueEditing(continueEditingTrip.id);
      // 可选：保存到 localStorage，下次登录也不显示
      localStorage.setItem(`dismissed_continue_editing_${continueEditingTrip.id}`, 'true');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Welcome Modal */}
      <WelcomeModal
        open={showWelcomeModal}
        onClose={() => {
          setShowWelcomeModal(false);
          dismiss();
        }}
        onComplete={handleWelcomeComplete}
      />

      {/* 主内容区域 */}
      <ScrollArea className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          {/* 决策状态区域 - 优先级最高，体现"决策优先"的产品哲学 */}
          <DecisionStatusSection trips={trips} />

          {/* 继续编辑卡片 */}
          {continueEditingTrip && (
            <ContinueEditingCard
              trip={continueEditingTrip}
              onClose={handleDismissContinueEditing}
              getCountryName={getCountryName}
            />
          )}

          {/* 快捷入口 - 视觉权重弱化 */}
          <QuickAccessSection />

          {/* 创建行程入口 */}
          <CreateTripSection onTripCreated={handleTripCreated} />
        </div>
      </ScrollArea>
    </div>
  );
}
