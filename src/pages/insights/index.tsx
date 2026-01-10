import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import { routeDirectionsApi } from '@/api/route-directions';
import { userApi } from '@/api/user';
import type { TripDetail, TripRecapReport } from '@/types/trip';
import type { RouteTemplate } from '@/types/places-routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Heart, AlertTriangle, FileText, Star } from 'lucide-react';

export default function InsightsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tripId = searchParams.get('tripId');
  const [, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [recapReport, setRecapReport] = useState<TripRecapReport | null>(null);
  const [loadingRecap, setLoadingRecap] = useState(false);
  const [templates, setTemplates] = useState<RouteTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(false);

  useEffect(() => {
    if (tripId) {
      loadTrip();
      loadRecapReport();
    }
    loadTemplates();
    loadUserPreferences();
  }, [tripId]);

  const loadTrip = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const data = await tripsApi.getById(tripId);
      setTrip(data);
    } catch (err) {
      console.error('Failed to load trip:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecapReport = async () => {
    if (!tripId) return;
    try {
      setLoadingRecap(true);
      const report = await tripsApi.getRecap(tripId);
      setRecapReport(report);
    } catch (err) {
      console.error('Failed to load recap report:', err);
      setRecapReport(null);
    } finally {
      setLoadingRecap(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const data = await routeDirectionsApi.queryTemplates({ isActive: true, limit: 20 });
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadUserPreferences = async () => {
    try {
      setLoadingPreferences(true);
      const profile = await userApi.getProfile();
      setUserPreferences(profile);
    } catch (err) {
      console.error('Failed to load user preferences:', err);
      setUserPreferences(null);
    } finally {
      setLoadingPreferences(false);
    }
  };

  // 从 TripRecapReport 转换为页面使用的格式
  const report = recapReport ? {
    robustness: recapReport.metadata?.rating ? recapReport.metadata.rating * 2 : 8.5, // 假设 rating 是 0-5，转换为 0-10
    rhythm: '标准', // TODO: 从 report 中提取或计算
    highlights: recapReport.places.slice(0, 5).map((place, idx) => ({
      id: place.id || idx,
      title: place.nameCN,
      description: `在 ${place.visitDate} 访问`,
    })),
    failures: [] as Array<{ id: number | string; title: string; description: string }>, // TODO: 从 report 中提取失败点
  } : {
    robustness: 0,
    rhythm: '',
    highlights: [] as Array<{ id: number | string; title: string; description: string }>,
    failures: [] as Array<{ id: number | string; title: string; description: string }>,
  };

  const preferences = userPreferences ? {
    preferredRhythm: userPreferences.preferredRhythm || '标准',
    preferredPlaces: userPreferences.preferredPlaceTypes || [],
    avgDailyWalk: userPreferences.avgDailyWalk || 0,
  } : {
    preferredRhythm: '标准',
    preferredPlaces: [],
    avgDailyWalk: 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 顶部 */}
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-2xl font-bold">复盘与沉淀</h1>
        <p className="text-sm text-muted-foreground mt-1">
          让用户越用越强：路线报告、个人偏好、可复用模板
        </p>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="report" className="space-y-6">
            <TabsList>
              <TabsTrigger value="report">路线报告</TabsTrigger>
              <TabsTrigger value="preferences">偏好画像</TabsTrigger>
              <TabsTrigger value="templates">路线模板</TabsTrigger>
            </TabsList>

            {/* 路线报告 */}
            <TabsContent value="report" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    路线报告
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingRecap ? (
                    <div className="flex items-center justify-center py-8">
                      <Spinner className="w-6 h-6" />
                    </div>
                  ) : !recapReport ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>暂无复盘报告</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={loadRecapReport}
                        disabled={loadingRecap}
                      >
                        {loadingRecap ? '加载中...' : '生成报告'}
                      </Button>
                    </div>
                  ) : (
                    <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">稳健度</div>
                          <div className="text-2xl font-bold">{report.robustness.toFixed(1)}/10</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">节奏</div>
                      <div className="text-2xl font-bold">{report.rhythm}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      最值回忆点
                    </h3>
                    <div className="space-y-2">
                      {report.highlights.map((item) => (
                        <div key={item.id} className="p-3 border rounded-lg">
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      失败点
                    </h3>
                    <div className="space-y-2">
                      {report.failures.map((item) => (
                        <div key={item.id} className="p-3 border rounded-lg border-yellow-200 bg-yellow-50">
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 偏好画像 */}
            <TabsContent value="preferences" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    偏好画像更新
                  </CardTitle>
                  <CardDescription>下次自动带入这些偏好</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingPreferences ? (
                    <div className="flex items-center justify-center py-8">
                      <Spinner className="w-6 h-6" />
                    </div>
                  ) : !userPreferences ? (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无偏好数据
                    </div>
                  ) : (
                    <>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">偏好节奏</div>
                    <Badge>{preferences.preferredRhythm}</Badge>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">偏好类型</div>
                    <div className="flex gap-2">
                      {preferences.preferredPlaces.map((place: string) => (
                        <Badge key={place} variant="outline">{place}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">平均每日步行</div>
                    <div className="text-lg font-semibold">{preferences.avgDailyWalk} km</div>
                  </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 路线模板 */}
            <TabsContent value="templates" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    可复用模板
                  </CardTitle>
                  <CardDescription>保存为 "Route Pattern"</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingTemplates ? (
                    <div className="flex items-center justify-center py-8">
                      <Spinner className="w-6 h-6" />
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无模板
                    </div>
                  ) : (
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <Card key={template.id} className="cursor-pointer hover:border-primary">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium">{template.nameCN || template.nameEN}</div>
                                <div className="text-sm text-muted-foreground">
                                  {template.nameEN && template.nameCN !== template.nameEN ? template.nameEN : ''}
                                  {template.durationDays ? ` · ${template.durationDays} 天` : ''}
                                </div>
                            </div>
                            <Button size="sm" variant="outline">
                              使用
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {!tripId && (
            <Card className="mt-6">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">请先选择一个已完成的行程</p>
                <Button onClick={() => navigate('/dashboard/trips')}>
                  前往行程库
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

