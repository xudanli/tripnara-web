import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { PersonaMode } from '@/components/common/PersonaModeToggle';
import { tripsApi } from '@/api/trips';
import { itineraryOptimizationApi } from '@/api/itinerary-optimization';
import type { TripDetail } from '@/types/trip';
import type { OptimizeRouteRequest, OptimizeRouteResponse } from '@/types/itinerary-optimization';
import { toast } from 'sonner';

interface OptimizeTabProps {
  tripId: string;
  personaMode?: PersonaMode;
}

export default function OptimizeTab({ tripId, personaMode = 'abu' }: OptimizeTabProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [result, setResult] = useState<OptimizeRouteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    try {
      const data = await tripsApi.getById(tripId);
      setTrip(data);
    } catch (err) {
      console.error('Failed to load trip:', err);
    }
  };

  const handleOptimize = async () => {
    if (!trip || !trip.TripDay || trip.TripDay.length === 0) {
      toast.error(t('planStudio.optimizeTab.noTripData'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 收集所有地点的 ID
      const placeIds: number[] = [];
      for (const day of trip.TripDay) {
        if (day.ItineraryItem) {
          for (const item of day.ItineraryItem) {
            if (item.placeId && !placeIds.includes(item.placeId)) {
              placeIds.push(item.placeId);
            }
          }
        }
      }

      if (placeIds.length === 0) {
        toast.error(t('planStudio.optimizeTab.noPlaces'));
        return;
      }

      // 获取第一个日期作为配置基础
      const firstDay = trip.TripDay[0];
      const startDate = new Date(firstDay.date);
      const endDate = new Date(trip.endDate);

      // 构建优化请求
      const request: OptimizeRouteRequest = {
        placeIds,
        config: {
          date: firstDay.date,
          startTime: new Date(startDate.setHours(9, 0, 0, 0)).toISOString(),
          endTime: new Date(endDate.setHours(18, 0, 0, 0)).toISOString(),
          pacingFactor: 1.0, // 标准节奏
        },
      };

      // 调用优化接口
      const optimizeResult = await itineraryOptimizationApi.optimize(request);
      setResult(optimizeResult);

      toast.success(t('planStudio.optimizeTab.optimizeSuccess'));
    } catch (err: any) {
      console.error('Failed to optimize:', err);
      const errorMessage = err.message || t('planStudio.optimizeTab.optimizeFailed');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('planStudio.optimizeTab.title')}</CardTitle>
          <CardDescription>{t('planStudio.optimizeTab.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleOptimize} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                {t('planStudio.optimizeTab.optimizing')}
              </>
            ) : (
              t('planStudio.optimizeTab.generatePlan')
            )}
          </Button>

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-800">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {result && (
            <div className="space-y-4 mt-6">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium">{t('planStudio.optimizeTab.optimizeComplete')}</span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {t('planStudio.optimizeTab.happinessScore')}: {result.happinessScore.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              {result.schedule && result.schedule.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('planStudio.optimizeTab.optimizedSchedule')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.schedule.map((item, idx) => {
                        const node = result.nodes[item.nodeIndex];
                        return (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <div className="font-medium">{node?.name || `Node ${item.nodeIndex}`}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(item.startTime).toLocaleTimeString()} - {new Date(item.endTime).toLocaleTimeString()}
                        </div>
                    </div>
                            {item.transportTime && (
                              <Badge variant="outline">{item.transportTime} min</Badge>
                            )}
                        </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {result.scoreBreakdown && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('planStudio.optimizeTab.scoreBreakdown')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>{t('planStudio.optimizeTab.interestScore')}</span>
                        <span className="font-medium">{result.scoreBreakdown.interestScore.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('planStudio.optimizeTab.distancePenalty')}</span>
                        <span className="font-medium">{result.scoreBreakdown.distancePenalty.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('planStudio.optimizeTab.clusteringBonus')}</span>
                        <span className="font-medium">{result.scoreBreakdown.clusteringBonus.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

