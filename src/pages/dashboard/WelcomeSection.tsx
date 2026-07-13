import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { TripDetail } from '@/types/trip';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, ArrowRight, Map, Users } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface WelcomeSectionProps {
  user: ReturnType<typeof useAuth>['user'];
  activeTrip: TripDetail | null;
  getCountryName: (code: string) => string;
}

export default function WelcomeSection({ user, activeTrip, getCountryName }: WelcomeSectionProps) {
  const navigate = useNavigate();
  const userName = user?.displayName || user?.email?.split('@')[0] || '朋友';

  // 计算行程天数
  const getTripDays = (trip: TripDetail | null): number => {
    if (!trip) return 0;
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // 获取出行月份
  const getTripMonth = (trip: TripDetail | null): string => {
    if (!trip) return '';
    return format(new Date(trip.startDate), 'M月', { locale: zhCN });
  };

  // 获取旅程阶段状态（简化版）
  const getTripStage = (trip: TripDetail | null): string => {
    if (!trip) return '未开始规划';
    
    if (trip.statistics?.progress === 'ONGOING') {
      return '进行中';
    } else if (trip.statistics?.progress === 'COMPLETED') {
      return '已完成';
    } else if (trip.status === 'PLANNING') {
      if (trip.TripDay && trip.TripDay.length > 0) {
        return '已确定路线方向 · 正在生成可执行日程';
      }
      return '规划中';
    }
    return '规划中';
  };

  if (!activeTrip) {
    return (
      <Card className="bg-gradient-to-br from-muted/15 to-muted/15 border-border">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-gray-900">
              欢迎回来，{userName} 👋
            </h1>
            <p className="text-lg text-gray-600">
              开始规划你的下一次旅程吧
            </p>
            <Button
              onClick={() => navigate('/dashboard/trips/new')}
              size="lg"
              className="mt-4"
            >
              创建新行程 →
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tripDays = getTripDays(activeTrip);
  const tripMonth = getTripMonth(activeTrip);
  const tripStage = getTripStage(activeTrip);
  const countryName = getCountryName(activeTrip.destination);

  return (
    <Card className="bg-gradient-to-br from-muted/15 to-muted/15 border-border">
      <CardContent className="p-8">
        {/* 标题 */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          欢迎回来，{userName} 👋
        </h1>

        {/* 当前旅程卡片 */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                《{countryName}》
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{tripDays} 天</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{countryName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{tripMonth}</span>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-sm font-medium text-gray-700">当前阶段：</span>
                <span className="text-sm text-gray-600 ml-2">{tripStage}</span>
              </div>
            </div>
          </div>

          {/* CTA 按钮 */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => navigate(`/dashboard/plan-studio?tripId=${activeTrip.id}&tab=schedule`)}
              className="flex items-center gap-2"
            >
              继续规划 <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/dashboard/trips/${activeTrip.id}`)}
              className="flex items-center gap-2"
            >
              <Map className="w-4 h-4" />
              查看路线地图
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/dashboard/trips/${activeTrip.id}`)}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              邀请同行人
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
