import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { routeDirectionsApi } from '@/api/route-directions';
import type { RouteTemplate, UpdateRouteTemplateRequest } from '@/types/places-routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Edit,
  Save,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Mountain,
} from 'lucide-react';
import { toast } from 'sonner';

const PACE_OPTIONS = [
  { value: 'RELAXED', label: '放松' },
  { value: 'BALANCED', label: '平衡' },
  { value: 'CHALLENGE', label: '挑战' },
];

export default function RouteTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<RouteTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // 编辑表单状态
  const [formData, setFormData] = useState<UpdateRouteTemplateRequest>({
    nameCN: '',
    nameEN: '',
    durationDays: undefined,
    defaultPacePreference: 'BALANCED',
    isActive: true,
  });

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
      setTemplate(data);
      // 初始化表单数据
      setFormData({
        nameCN: data.nameCN || '',
        nameEN: data.nameEN || '',
        durationDays: data.durationDays,
        defaultPacePreference: data.defaultPacePreference,
        isActive: data.isActive,
        dayPlans: data.dayPlans || [],
      });
    } catch (err: any) {
      setError(err.message || '加载路线模板详情失败');
      console.error('Failed to load template:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    try {
      setSaving(true);
      setError(null);
      await routeDirectionsApi.updateTemplate(Number(id), formData);
      toast.success('更新成功');
      setIsEditing(false);
      // 重新加载数据
      await loadTemplate();
    } catch (err: any) {
      const errorMessage = err.message || '更新路线模板失败';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Failed to update template:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (template) {
      setFormData({
        nameCN: template.nameCN || '',
        nameEN: template.nameEN || '',
        durationDays: template.durationDays,
        defaultPacePreference: template.defaultPacePreference,
        isActive: template.isActive,
        dayPlans: template.dayPlans || [],
      });
    }
    setIsEditing(false);
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
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="w-4 h-4 mr-2" />
                取消
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                保存
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              编辑
            </Button>
          )}
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
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nameCN">中文名称</Label>
                    <Input
                      id="nameCN"
                      value={formData.nameCN}
                      onChange={(e) => setFormData({ ...formData, nameCN: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nameEN">英文名称</Label>
                    <Input
                      id="nameEN"
                      value={formData.nameEN}
                      onChange={(e) => setFormData({ ...formData, nameEN: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="durationDays">行程天数</Label>
                    <Input
                      id="durationDays"
                      type="number"
                      value={formData.durationDays || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          durationDays: e.target.value ? parseInt(e.target.value, 10) : undefined,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultPacePreference">默认节奏偏好</Label>
                    <Select
                      value={formData.defaultPacePreference}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, defaultPacePreference: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PACE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isActive">激活状态</Label>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
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
                          {dayPlan.pois && dayPlan.pois.length > 0 ? (
                            <div className="space-y-2 mt-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">POI列表:</span>
                                <Badge variant="secondary" className="text-xs">
                                  {dayPlan.pois.length} 个
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {dayPlan.pois
                                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                                  .map((poi, poiIdx) => (
                                    <Badge
                                      key={poi.id || poiIdx}
                                      variant={poi.required ? 'default' : 'outline'}
                                      className="text-xs"
                                    >
                                      {poi.nameCN || poi.nameEN || `POI ${poi.id}`}
                                      {poi.required && (
                                        <span className="ml-1 text-[10px]">★</span>
                                      )}
                                      {poi.durationMinutes && (
                                        <span className="ml-1 text-[10px] opacity-70">
                                          ({Math.round(poi.durationMinutes / 60)}h)
                                        </span>
                                      )}
                                    </Badge>
                                  ))}
                              </div>
                            </div>
                          ) : (
                            /* ⚠️ 向后兼容：如果没有 pois，显示 requiredNodes（已废弃） */
                            dayPlan.requiredNodes && dayPlan.requiredNodes.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className="text-sm text-muted-foreground">必需节点:</span>
                                <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-200">
                                  旧格式（已废弃）
                                </Badge>
                                {dayPlan.requiredNodes.map((node, nodeIdx) => (
                                  <Badge key={nodeIdx} variant="outline" className="text-xs">
                                    {node}
                                  </Badge>
                                ))}
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
                  <Label className="text-sm text-muted-foreground">名称</Label>
                  <p className="font-medium">{template.routeDirection.nameCN}</p>
                  {template.routeDirection.nameEN && (
                    <p className="text-sm text-muted-foreground">{template.routeDirection.nameEN}</p>
                  )}
                </div>
                {template.routeDirection.countryCode && (
                  <div>
                    <Label className="text-sm text-muted-foreground">国家代码</Label>
                    <p className="font-medium">{template.routeDirection.countryCode}</p>
                  </div>
                )}
                {template.routeDirection.tags && template.routeDirection.tags.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground">标签</Label>
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
                <Label className="text-sm text-muted-foreground">模板ID</Label>
                <p className="font-medium">{template.id}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">UUID</Label>
                <p className="font-mono text-sm break-all">{template.uuid}</p>
              </div>
              {template.createdAt && (
                <div>
                  <Label className="text-sm text-muted-foreground">创建时间</Label>
                  <p className="text-sm">
                    {new Date(template.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              )}
              {template.updatedAt && (
                <div>
                  <Label className="text-sm text-muted-foreground">更新时间</Label>
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

