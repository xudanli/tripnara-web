/**
 * 推荐路线卡片组件
 * 显示根据用户画像推荐的路线列表
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { RecommendedRoute } from '@/types/trip';
import { cn } from '@/lib/utils';

interface RecommendedRoutesCardProps {
  routes: RecommendedRoute[];
  onRouteSelect?: (route: RecommendedRoute) => void;
  className?: string;
}

export default function RecommendedRoutesCard({
  routes,
  onRouteSelect,
  className,
}: RecommendedRoutesCardProps) {
  if (!routes || routes.length === 0) {
    return null;
  }
  
  // 根据难度匹配度确定颜色
  const getDifficultyColor = (match: string) => {
    if (match.includes('完美') || match.includes('完美匹配')) {
      return 'bg-green-100 text-green-700 border-green-300';
    }
    if (match.includes('良好') || match.includes('良好匹配')) {
      return 'bg-blue-100 text-blue-700 border-blue-300';
    }
    if (match.includes('一般') || match.includes('一般匹配')) {
      return 'bg-amber-100 text-amber-700 border-amber-300';
    }
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };
  
  return (
    <Card className={cn('border-slate-200', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-600" />
          <span>为您推荐的路线</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {routes.map((route, index) => (
          <div
            key={index}
            className="border border-slate-200 rounded-lg p-4 space-y-3 hover:border-primary transition-colors"
          >
            {/* 路线名称和难度匹配 */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900 mb-1">
                  {index + 1}. {route.route}
                </h4>
                {route.reason && (
                  <p className="text-xs text-slate-600 mb-2">
                    {route.reason}
                  </p>
                )}
              </div>
              {route.difficultyMatch && (
                <Badge 
                  variant="outline" 
                  className={cn('text-xs flex-shrink-0', getDifficultyColor(route.difficultyMatch))}
                >
                  {route.difficultyMatch}
                </Badge>
              )}
            </div>
            
            {/* 季节和前置条件 */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              {route.season && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>适合季节：{route.season}</span>
                </div>
              )}
            </div>
            
            {/* 前置条件（如果有） */}
            {route.prerequisites && route.prerequisites.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-amber-700">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="font-medium">前置条件：</span>
                </div>
                <ul className="space-y-0.5 ml-4">
                  {route.prerequisites.map((prereq, idx) => (
                    <li key={idx} className="text-xs text-amber-700">
                      • {prereq}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* 选择按钮 */}
            {onRouteSelect && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRouteSelect(route)}
                className="w-full"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                选择此路线
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
