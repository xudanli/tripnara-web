/**
 * 决策状态区域
 * 显示当前行程的决策状态卡片
 */

import { useMemo } from 'react';
import type { TripListItem } from '@/types/trip';
import CurrentTripDecisionCard from './CurrentTripDecisionCard';
import { cn } from '@/lib/utils';

interface DecisionStatusSectionProps {
  trips: TripListItem[];
  className?: string;
}

export default function DecisionStatusSection({
  trips,
  className,
}: DecisionStatusSectionProps) {
  // 获取当前需要显示决策状态的行程（规划中的行程，最近编辑的）
  const currentTrip = useMemo(() => {
    // 筛选规划中的行程
    const planningTrips = trips.filter(trip => trip.status === 'PLANNING');
    
    if (planningTrips.length === 0) {
      return null;
    }

    // 按最后编辑时间降序排序，取第一个
    return planningTrips.sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    })[0];
  }, [trips]);

  // 如果没有当前行程，不显示决策状态区域
  if (!currentTrip) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <CurrentTripDecisionCard tripId={currentTrip.id} />
    </div>
  );
}
