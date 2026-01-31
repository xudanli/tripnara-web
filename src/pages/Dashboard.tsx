/**
 * Dashboard 页面 - 对话优先架构
 * 将自然语言对话界面作为首页主界面
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { tripsApi } from '@/api/trips';
import type { TripListItem } from '@/types/trip';
import { Spinner } from '@/components/ui/spinner';
import WelcomeModal from '@/components/onboarding/WelcomeModal';
import { useOnboarding } from '@/hooks/useOnboarding';
import NLChatInterface from '@/components/trips/NLChatInterface';

export default function DashboardPage() {
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  
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
      
      // 只加载行程数据（用于判断是否需要显示 Welcome Modal）
      const tripsData = await tripsApi.getAll();
      const tripsList = Array.isArray(tripsData) ? tripsData : [];
      setTrips(tripsList);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTripCreated = () => {
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

      {/* 对话界面 */}
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <Spinner className="w-8 h-8" />
        </div>
      ) : (
        <NLChatInterface
          onTripCreated={handleTripCreated}
          className="flex-1"
        />
      )}
    </div>
  );
}
