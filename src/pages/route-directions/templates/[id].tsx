import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { routeDirectionsApi } from '@/api/route-directions';
import type { RouteTemplate } from '@/types/places-routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Mountain,
  Clock,
} from 'lucide-react';

export default function RouteTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<RouteTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadTemplate();
    }
  }, [id]);

  const loadTemplate = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await routeDirectionsApi.getTemplateById(Number(id));
      
      // 🔍 调试：检查数据结构
      console.log('📋 [RouteTemplateDetail] 加载的模板数据:', {
        templateId: data.id,
        nameCN: data.nameCN,
        dayPlansCount: data.dayPlans?.length || 0,
        dayPlans: data.dayPlans?.map((dayPlan: any, idx: number) => ({
          day: dayPlan.day,
          theme: dayPlan.theme,
          hasPois: !!dayPlan.pois && dayPlan.pois.length > 0,
          poisCount: dayPlan.pois?.length || 0,
          pois: dayPlan.pois?.map((poi: any) => ({
            id: poi.id,
            nameCN: poi.nameCN,
            nameEN: poi.nameEN,
            order: poi.order,
            required: poi.required,
          })) || [],
          hasRequiredNodes: !!dayPlan.requiredNodes && dayPlan.requiredNodes.length > 0,
          requiredNodesCount: dayPlan.requiredNodes?.length || 0,
          requiredNodes: dayPlan.requiredNodes || [],
        })) || [],
      });
      
      setTemplate(data);
    } catch (err: any) {
      setError(err.message || '加载路线模板详情失败');
      console.error('Failed to load template:', err);
    } finally {
      setLoading(false);
    }
  };


  const getIntensityColor = (intensity?: string) => {
    switch (intensity) {
      case 'LIGHT':
        return 'bg-green-100 text-green-800';
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'CHALLENGE':
        return 'bg-orange-100 text-orange-800';
      case 'EXTREME':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaceColor = (pace?: string) => {
    switch (pace) {
      case 'RELAXED':
        return 'bg-blue-100 text-blue-800';
      case 'BALANCED':
        return 'bg-purple-100 text-purple-800';
      case 'CHALLENGE':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <XCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
            <Button onClick={() => navigate('/dashboard/route-directions/templates')} className="mt-4" variant="outline">
              返回列表
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!template) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/route-directions/templates')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回列表
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{template.nameCN}</h1>
            {template.nameEN && <p className="text-muted-foreground mt-1">{template.nameEN}</p>}
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <XCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：主要信息 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {template.durationDays} 天
                </Badge>
                <Badge className={getPaceColor(template.defaultPacePreference)}>
                  {template.defaultPacePreference}
                </Badge>
                <div className="flex items-center gap-2">
                  {template.isActive ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">已激活</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-400">未激活</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 每日计划 */}
          <Card>
            <CardHeader>
              <CardTitle>每日计划</CardTitle>
              <CardDescription>共 {template.dayPlans?.length || 0} 天的行程安排</CardDescription>
            </CardHeader>
            <CardContent>
              {template.dayPlans && template.dayPlans.length > 0 ? (
                <div className="space-y-4">
                  {template.dayPlans.map((dayPlan, idx) => (
                    <Card key={idx} className="border-l-4 border-l-primary">
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-lg">第 {dayPlan.day} 天</h4>
                            {dayPlan.maxIntensity && (
                              <Badge className={getIntensityColor(dayPlan.maxIntensity)}>
                                {dayPlan.maxIntensity}
                              </Badge>
                            )}
                          </div>
                          {dayPlan.theme && (
                            <p className="text-muted-foreground font-medium">{dayPlan.theme}</p>
                          )}
                          {dayPlan.maxElevationM && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mountain className="w-4 h-4" />
                              <span>最大海拔: {dayPlan.maxElevationM}m</span>
                            </div>
                          )}
                          {/* ✅ 优先显示 pois 格式（新格式） */}
                          {dayPlan.pois && Array.isArray(dayPlan.pois) && dayPlan.pois.length > 0 ? (
                            <div className="space-y-3 mt-4 pt-3 border-t">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm font-semibold text-foreground">POI活动列表</span>
                                <Badge variant="secondary" className="text-xs">
                                  {dayPlan.pois.length} 个
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                {dayPlan.pois
                                  .sort((a, b) => {
                                    const orderA = a.order ?? 999;
                                    const orderB = b.order ?? 999;
                                    return orderA - orderB;
                                  })
                                  .map((poi, poiIdx) => {
                                    const displayOrder = poi.order !== undefined && poi.order !== null ? poi.order : poiIdx + 1;
                                    const poiName = poi.nameCN || poi.nameEN || `POI ${poi.id}`;
                                    
                                    // 🆕 格式化时间显示
                                    const formatTime = (timeStr?: string): string | null => {
                                      if (!timeStr) return null;
                                      try {
                                        // 处理 ISO 8601 格式（如 "2024-05-01T09:00:00.000Z"）
                                        const date = new Date(timeStr);
                                        if (!isNaN(date.getTime())) {
                                          return date.toLocaleTimeString('zh-CN', { 
                                            hour: '2-digit', 
                                            minute: '2-digit',
                                            hour12: false 
                                          });
                                        }
                                        // 处理简单时间格式（如 "09:00:00"）
                                        if (timeStr.includes(':')) {
                                          const parts = timeStr.split(':');
                                          if (parts.length >= 2) {
                                            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
                                          }
                                        }
                                        return timeStr;
                                      } catch {
                                        return timeStr;
                                      }
                                    };
                                    
                                    const startTimeDisplay = formatTime(poi.startTime);
                                    const endTimeDisplay = formatTime(poi.endTime);
                                    
                                    return (
                                      <div
                                        key={poi.id || `poi-${poiIdx}`}
                                        className="flex items-start gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                                      >
                                        {/* 顺序编号 */}
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center border border-primary/20">
                                          {displayOrder}
                                        </div>
                                        {/* POI名称和详情 */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="font-medium text-sm text-foreground">
                                              {poiName}
                                            </span>
                                            {poi.required && (
                                              <Badge variant="default" className="text-[10px] px-1.5 py-0.5 h-5">
                                                必游
                                              </Badge>
                                            )}
                                            {/* 🆕 显示时间 */}
                                            {(startTimeDisplay || endTimeDisplay) && (
                                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="w-3 h-3" />
                                                {startTimeDisplay && endTimeDisplay ? (
                                                  <span>{startTimeDisplay} - {endTimeDisplay}</span>
                                                ) : startTimeDisplay ? (
                                                  <span>{startTimeDisplay} 开始</span>
                                                ) : endTimeDisplay ? (
                                                  <span>{endTimeDisplay} 结束</span>
                                                ) : null}
                                              </div>
                                            )}
                                            {poi.durationMinutes && (
                                              <span className="text-xs text-muted-foreground">
                                                {Math.round(poi.durationMinutes / 60)}小时
                                              </span>
                                            )}
                                            {poi.category && (
                                              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-5">
                                                {poi.category}
                                              </Badge>
                                            )}
                                          </div>
                                          {poi.description && (
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                              {poi.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          ) : (
                            /* ⚠️ 向后兼容：如果没有 pois，显示 requiredNodes（已废弃） */
                            dayPlan.requiredNodes && Array.isArray(dayPlan.requiredNodes) && dayPlan.requiredNodes.length > 0 ? (
                              <div className="space-y-2 mt-4 pt-3 border-t">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground">必需节点</span>
                                  <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-200 text-yellow-800">
                                    旧格式（已废弃）
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {dayPlan.requiredNodes.map((node, nodeIdx) => (
                                    <Badge key={nodeIdx} variant="outline" className="text-xs">
                                      {node}
                                    </Badge>
                                  ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                  ⚠️ 此模板使用旧数据格式，仅显示节点ID。请联系管理员更新为新的POI格式。
                                </p>
                              </div>
                            ) : (
                              <div className="mt-4 pt-3 border-t">
                                <p className="text-sm text-muted-foreground">暂无POI活动信息</p>
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">暂无每日计划</p>
              )}
            </CardContent>
          </Card>

          {/* 元数据 */}
          {template.metadata && Object.keys(template.metadata).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>元数据</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
                  {JSON.stringify(template.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：关联信息 */}
        <div className="space-y-6">
          {/* 路线方向信息 */}
          {template.routeDirection && (
            <Card>
              <CardHeader>
                <CardTitle>关联路线方向</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">名称</p>
                  <p className="font-medium">{template.routeDirection.nameCN}</p>
                  {template.routeDirection.nameEN && (
                    <p className="text-sm text-muted-foreground">{template.routeDirection.nameEN}</p>
                  )}
                </div>
                {template.routeDirection.countryCode && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">国家代码</p>
                    <p className="font-medium">{template.routeDirection.countryCode}</p>
                  </div>
                )}
                {template.routeDirection.tags && template.routeDirection.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">标签</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {template.routeDirection.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    navigate(`/dashboard/route-directions/by-country?countryCode=${template.routeDirection?.countryCode || ''}`)
                  }
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  查看路线方向
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 其他信息 */}
          <Card>
            <CardHeader>
              <CardTitle>其他信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">模板ID</p>
                <p className="font-medium">{template.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">UUID</p>
                <p className="font-mono text-sm break-all">{template.uuid}</p>
              </div>
              {template.createdAt && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">创建时间</p>
                  <p className="text-sm">
                    {new Date(template.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              )}
              {template.updatedAt && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">更新时间</p>
                  <p className="text-sm">
                    {new Date(template.updatedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

