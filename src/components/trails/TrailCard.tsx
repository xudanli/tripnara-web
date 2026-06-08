import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Mountain,
  Clock,
  TrendingUp,
  AlertTriangle,
  Bookmark,
  ArrowRight,
} from 'lucide-react';
import type { RouteDirection } from '@/types/places-routes';
import {
  listEstimatedDays,
  listReadinessScore,
  listStartPointLabel,
  listTotalDistanceKm,
} from '@/lib/hiking-trail-detail-ui';
import { TrailOfflineDownloadButton } from './TrailOfflineDownloadButton';
import { isTrailBookmarked, toggleTrailBookmark } from '@/lib/trail-bookmarks';
import { useState } from 'react';
import { toast } from 'sonner';

interface TrailCardProps {
  trail: RouteDirection;
  readinessScore?: number;
  className?: string;
}

export function TrailCard({
  trail,
  readinessScore,
  className,
}: TrailCardProps) {
  const navigate = useNavigate();
  const [bookmarked, setBookmarked] = useState(() => isTrailBookmarked(trail.id));

  const handleBookmark = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    void toggleTrailBookmark(trail.id)
      .then((next) => {
        setBookmarked(next);
        toast.success(next ? '已收藏路线' : '已取消收藏');
      })
      .catch((err) => toast.error((err as Error).message || '收藏操作失败'));
  };

  const getReadinessScore = (): number | null => {
    const fromApi = readinessScore ?? listReadinessScore(trail);
    if (fromApi != null) return fromApi;
    const month = new Date().getMonth() + 1;
    const isBestMonth = trail.seasonality?.bestMonths?.includes(month);
    return isBestMonth ? 85 : 65;
  };

  const getRiskTags = (): string[] => {
    const tags: string[] = [];
    if (trail.riskProfile?.altitudeSickness) tags.push('高反');
    if (trail.riskProfile?.roadClosure) tags.push('封路');
    if (trail.constraints?.soft?.maxElevationM && trail.constraints.soft.maxElevationM > 4000) {
      tags.push('高海拔');
    }
    return tags.slice(0, 3);
  };

  const score = getReadinessScore();
  const distanceKm = listTotalDistanceKm(trail);
  const estimatedDays = listEstimatedDays(trail);
  const startLabel = listStartPointLabel(trail);
  const risks = getRiskTags();

  return (
    <Card
      className={`cursor-pointer hover:shadow-lg transition-shadow ${className || ''}`}
      onClick={() => navigate(`/dashboard/trails/${trail.id}`)}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">{trail.nameCN}</CardTitle>
            <CardDescription className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {trail.countryCode} · {trail.regions?.[0] || ''}
              </span>
              {startLabel ? (
                <span className="text-xs">起点 {startLabel}</span>
              ) : null}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBookmark}
              title={bookmarked ? '取消收藏' : '收藏'}
            >
              <Bookmark
                className={`h-4 w-4 ${bookmarked ? 'fill-amber-500 text-amber-500' : ''}`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 核心指标 */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
          <div className="flex items-center gap-1">
            <Mountain className="h-4 w-4 text-muted-foreground" />
            <span>
              {trail.constraints?.soft?.maxElevationM
                ? `${trail.constraints.soft.maxElevationM}m`
                : '未知'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span>
              {trail.constraints?.soft?.maxDailyAscentM
                ? `+${trail.constraints.soft.maxDailyAscentM}m`
                : '未知'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {distanceKm != null
                ? `${distanceKm.toFixed(0)} km`
                : estimatedDays != null
                  ? `${estimatedDays} 天`
                  : '—'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <span>{trail.riskProfile?.level || '未知'}</span>
          </div>
        </div>

        {score != null && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-muted-foreground">可走指数</span>
              <span className="text-sm font-semibold">{score}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  score >= 80
                    ? 'bg-green-500'
                    : score >= 60
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        )}

        {/* 风险标签 */}
        {risks.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {risks.map((risk) => (
              <Badge key={risk} variant="destructive" className="text-xs">
                {risk}
              </Badge>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/dashboard/trails/${trail.id}`);
            }}
          >
            查看详情
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
          <TrailOfflineDownloadButton routeDirectionId={trail.id} iconOnly />
        </div>
      </CardContent>
    </Card>
  );
}

