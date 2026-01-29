import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { routeDirectionsApi } from '@/api/route-directions';
import { tripsApi } from '@/api/trips';
import type { RouteTemplate } from '@/types/places-routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateTripFromTemplateDialog } from '@/components/trips/CreateTripFromTemplateDialog';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';

export default function RouteTemplatesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 查询参数
  const routeDirectionIdParam = searchParams.get('routeDirectionId');
  const durationDaysParam = searchParams.get('durationDays');
  const isActiveParam = searchParams.get('isActive');
  const countryCodeParam = searchParams.get('countryCode');
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');

  const [routeDirectionId, setRouteDirectionId] = useState<number | undefined>(
    routeDirectionIdParam ? parseInt(routeDirectionIdParam, 10) : undefined
  );
  const [durationDays, setDurationDays] = useState<number | undefined>(
    durationDaysParam ? parseInt(durationDaysParam, 10) : undefined
  );
  const [isActive, setIsActive] = useState<boolean | undefined>(
    isActiveParam ? isActiveParam === 'true' : undefined
  );
  const [countryCode, setCountryCode] = useState<string | undefined>(
    countryCodeParam || undefined
  );
  const [limit, setLimit] = useState<number>(limitParam ? parseInt(limitParam, 10) : 100); // 增加默认limit以支持前端筛选
  const [offset, setOffset] = useState<number>(offsetParam ? parseInt(offsetParam, 10) : 0);

  const [allTemplates, setAllTemplates] = useState<RouteTemplate[]>([]); // 存储所有模板
  const [templates, setTemplates] = useState<RouteTemplate[]>([]); // 筛选后的模板
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RouteTemplate | null>(null);

  // 筛选模板函数
  const filterTemplates = (templatesToFilter: RouteTemplate[]) => {
    let filtered = [...templatesToFilter];

    // 按国家代码筛选（前端筛选）
    if (countryCode) {
      filtered = filtered.filter(
        (t) => t.routeDirection?.countryCode?.toUpperCase() === countryCode.toUpperCase()
      );
    }

    setTemplates(filtered);
  };

  useEffect(() => {
    loadTemplates();
  }, [routeDirectionId, durationDays, isActive, limit, offset]);

  // 当 countryCode 变化时，重新筛选模板
  useEffect(() => {
    if (allTemplates.length > 0) {
      filterTemplates(allTemplates);
    }
  }, [countryCode, allTemplates]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: {
        routeDirectionId?: number;
        durationDays?: number;
        isActive?: boolean;
        limit?: number;
        offset?: number;
      } = {};

      if (routeDirectionId) {
        params.routeDirectionId = routeDirectionId;
      }
      if (durationDays) {
        params.durationDays = durationDays;
      }
      if (isActive !== undefined) {
        params.isActive = isActive;
      }
      if (limit) {
        params.limit = limit;
      }
      if (offset) {
        params.offset = offset;
      }

      const data = await routeDirectionsApi.queryTemplates(params);
      setAllTemplates(data || []);
      
      // 数据加载后，应用前端筛选（useEffect 也会监听 allTemplates 变化，但这里直接设置初始值更高效）
      filterTemplates(data || []);
    } catch (err: any) {
      setError(err.message || '加载路线模板失败');
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (routeDirectionId) {
      params.set('routeDirectionId', routeDirectionId.toString());
    }
    if (durationDays) {
      params.set('durationDays', durationDays.toString());
    }
    if (isActive !== undefined) {
      params.set('isActive', isActive.toString());
    }
    if (countryCode) {
      params.set('countryCode', countryCode);
    }
    if (limit) {
      params.set('limit', limit.toString());
    }
    if (offset) {
      params.set('offset', offset.toString());
    }
    setSearchParams(params);
    // 如果设置了 countryCode，会通过 useEffect 自动触发筛选
  };

  const handleReset = () => {
    setRouteDirectionId(undefined);
    setDurationDays(undefined);
    setIsActive(undefined);
    setCountryCode(undefined);
    setLimit(100);
    setOffset(0);
    setSearchParams({});
  };

  const handleViewDetail = (id: number) => {
    navigate(`/dashboard/route-directions/templates/${id}`);
  };

  const handleUseTemplate = (template: RouteTemplate) => {
    setSelectedTemplate(template);
    setCreateDialogOpen(true);
  };

  const handleCreateSuccess = async (tripId: string) => {
    console.log('🔄 [RouteTemplates] handleCreateSuccess 被调用，tripId:', tripId);
    
    // 显示成功提示
    toast.success('行程创建成功！', {
      description: '正在跳转到行程库...',
      duration: 3000,
    });
    
    // 延迟导航，给后端时间完成创建和权限设置
    try {
      // 等待一小段时间，让后端完成创建（增加到1.5秒）
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 尝试验证行程是否存在（可选，如果失败也不阻止导航）
      try {
        await tripsApi.getById(tripId);
        console.log('✅ [RouteTemplates] 行程创建成功，已验证可访问:', tripId);
      } catch (verifyErr: any) {
        console.warn('⚠️ [RouteTemplates] 行程创建后验证失败，但继续导航:', {
          tripId,
          error: verifyErr.message,
        });
        // 不阻止导航，可能只是暂时的权限问题
      }
      
      // 导航到行程库（显示新创建的行程）
      console.log('🔄 [RouteTemplates] 导航到行程库');
      // 设置刷新标记（备用机制）
      sessionStorage.setItem('trips-page-should-refresh', 'true');
      navigate('/dashboard/trips', { state: { from: 'create', tripId } });
    } catch (err: any) {
      console.error('❌ [RouteTemplates] 创建行程后导航失败:', err);
      toast.error('行程创建成功，但跳转失败，请手动访问行程库');
      // 仍然尝试导航到行程库，即使验证失败
      navigate('/dashboard/trips', { state: { from: 'create', tripId } });
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">路线模板</h1>
          <p className="text-muted-foreground">查询和管理路线模板</p>
        </div>
      </div>

      {/* 筛选器 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              筛选条件
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? '隐藏' : '显示'}筛选
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                重置
              </Button>
              <Button size="sm" onClick={handleSearch}>
                查询
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="countryCode">国家代码</Label>
                <Input
                  id="countryCode"
                  type="text"
                  placeholder="例如: IS, JP, NP"
                  value={countryCode || ''}
                  onChange={(e) => setCountryCode(e.target.value || undefined)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="routeDirectionId">路线方向ID</Label>
                <Input
                  id="routeDirectionId"
                  type="number"
                  placeholder="例如: 1"
                  value={routeDirectionId || ''}
                  onChange={(e) =>
                    setRouteDirectionId(e.target.value ? parseInt(e.target.value, 10) : undefined)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationDays">行程天数</Label>
                <Input
                  id="durationDays"
                  type="number"
                  placeholder="例如: 7"
                  value={durationDays || ''}
                  onChange={(e) =>
                    setDurationDays(e.target.value ? parseInt(e.target.value, 10) : undefined)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit">每页数量</Label>
                <Input
                  id="limit"
                  type="number"
                  placeholder="例如: 20"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value, 10) || 20)}
                />
              </div>
              <div className="space-y-2">
                <Label>激活状态</Label>
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isActive-true"
                      checked={isActive === true}
                      onCheckedChange={(checked) => setIsActive(checked ? true : undefined)}
                    />
                    <Label htmlFor="isActive-true" className="cursor-pointer">
                      激活
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isActive-false"
                      checked={isActive === false}
                      onCheckedChange={(checked) => setIsActive(checked ? false : undefined)}
                    />
                    <Label htmlFor="isActive-false" className="cursor-pointer">
                      未激活
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

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

      {/* 加载状态 */}
      {loading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {/* 模板列表 */}
      {!loading && !error && (
        <>
          {templates.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>暂无路线模板</EmptyTitle>
                <EmptyDescription>
                  没有找到符合条件的路线模板，请尝试调整筛选条件
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.nameCN}</CardTitle>
                        {template.nameEN && (
                          <CardDescription className="mt-1">{template.nameEN}</CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {template.isActive ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* 基本信息 */}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {template.durationDays} 天
                        </Badge>
                        <Badge className={getPaceColor(template.defaultPacePreference)}>
                          {template.defaultPacePreference}
                        </Badge>
                        {template.routeDirection && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {template.routeDirection.nameCN}
                          </Badge>
                        )}
                      </div>

                      {/* 每日计划摘要 */}
                      {template.dayPlans && template.dayPlans.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">每日计划:</p>
                          <div className="space-y-1">
                            {template.dayPlans.slice(0, 3).map((dayPlan, idx) => (
                              <div key={idx} className="text-sm flex items-center gap-2">
                                <span className="text-muted-foreground">第 {dayPlan.day} 天:</span>
                                {dayPlan.theme && (
                                  <span className="font-medium">{dayPlan.theme}</span>
                                )}
                                {dayPlan.maxIntensity && (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${getIntensityColor(dayPlan.maxIntensity)}`}
                                  >
                                    {dayPlan.maxIntensity}
                                  </Badge>
                                )}
                              </div>
                            ))}
                            {template.dayPlans.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                还有 {template.dayPlans.length - 3} 天...
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleViewDetail(template.id)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          查看详情
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleUseTemplate(template)}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          使用模板
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* 使用模板创建行程对话框 */}
      {selectedTemplate && (
        <CreateTripFromTemplateDialog
          templateId={selectedTemplate.id}
          templateName={selectedTemplate.nameCN}
          defaultDurationDays={selectedTemplate.durationDays}
          defaultPacePreference={selectedTemplate.defaultPacePreference}
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) {
              setSelectedTemplate(null);
            }
          }}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}


