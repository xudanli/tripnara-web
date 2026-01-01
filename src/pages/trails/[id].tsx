import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { routeDirectionsApi } from '@/api/route-directions';
import type { RouteDirection } from '@/types/places-routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Share2,
  Bookmark,
  MapPin,
  Mountain,
  TrendingUp,
  Clock,
  AlertTriangle,
  Droplet,
  Home,
  Navigation,
  Calendar,
  Phone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

export default function TrailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trail, setTrail] = useState<RouteDirection | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (id) {
      loadTrail();
    }
  }, [id]);

  const loadTrail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await routeDirectionsApi.getById(Number(id));
      setTrail(data);
    } catch (error: any) {
      toast.error('加载路线详情失败: ' + (error.message || '未知错误'));
      console.error('Failed to load trail:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSegment = (index: number) => {
    const newExpanded = new Set(expandedSegments);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSegments(newExpanded);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  if (!trail) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">路线不存在</div>
      </div>
    );
  }

  const currentMonth = new Date().getMonth() + 1;
  const isBestMonth = trail.seasonality?.bestMonths?.includes(currentMonth);
  const monthBadge = isBestMonth ? '最佳季节' : '非最佳季节';

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* 返回按钮 */}
      <Button
        variant="ghost"
        onClick={() => navigate('/dashboard/trails/explore')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回
      </Button>

      {/* Hero 区域 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-3xl">{trail.nameCN}</CardTitle>
                <Badge variant={isBestMonth ? 'default' : 'secondary'}>
                  {monthBadge}
                </Badge>
              </div>
              <CardDescription className="flex items-center gap-1 text-base">
                <MapPin className="h-4 w-4" />
                {trail.countryCode} · {trail.regions?.join(', ')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                分享
              </Button>
              <Button variant="outline" size="sm">
                <Bookmark className="h-4 w-4 mr-2" />
                收藏
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 核心指标一行 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {trail.constraints?.soft?.maxElevationM
                  ? `${trail.constraints.soft.maxElevationM}m`
                  : '未知'}
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Mountain className="h-3 w-3" />
                最高点
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {trail.constraints?.soft?.maxDailyAscentM
                  ? `+${trail.constraints.soft.maxDailyAscentM}m`
                  : '未知'}
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                日爬升
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">待计算</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                耗时
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">待计算</div>
              <div className="text-sm text-muted-foreground">距离</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {trail.riskProfile?.level || '未知'}
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                难度
              </div>
            </div>
          </div>

          {/* 主 CTA */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              size="lg"
              onClick={() => navigate(`/dashboard/readiness?trailId=${trail.id}`)}
            >
              做 Readiness 评估
            </Button>
            <Button variant="outline" size="lg">
              保存路线
            </Button>
          </div>

          {/* 预览图占位 */}
          <div className="mt-4 h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
            路线线条 + 海拔剖面缩略图
          </div>
        </CardContent>
      </Card>

      {/* 详细内容 Tabs */}
      <Tabs defaultValue="route" className="space-y-4">
        <TabsList>
          <TabsTrigger value="route">路线结构</TabsTrigger>
          <TabsTrigger value="safety">风险与约束</TabsTrigger>
          <TabsTrigger value="logistics">后勤与补给</TabsTrigger>
          <TabsTrigger value="alternatives">替代与修复</TabsTrigger>
        </TabsList>

        {/* Route Intelligence */}
        <TabsContent value="route">
          <Card>
            <CardHeader>
              <CardTitle>路线结构</CardTitle>
              <CardDescription>路线类型、分段、海拔剖面</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">路线类型</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {trail.constraints?.transportMode?.includes('hiking') ? '徒步' : '未知'}
                </p>
              </div>

              {/* 分段列表（模拟） */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">分段</Label>
                {[1, 2, 3].map((segmentIndex) => (
                  <Card key={segmentIndex} className="border">
                    <CardHeader
                      className="cursor-pointer"
                      onClick={() => toggleSegment(segmentIndex)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-base">
                            分段 {segmentIndex}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            距离: 待计算 | 爬升: 待计算 | 坡度: 待计算
                          </CardDescription>
                        </div>
                        {expandedSegments.has(segmentIndex) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </CardHeader>
                    {expandedSegments.has(segmentIndex) && (
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div>关键节点：水源、涉水、观景点、避难所</div>
                          <div>暴露度：待计算</div>
                          <div>预计耗时：待计算</div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              {/* 海拔剖面 */}
              <div>
                <Label className="text-sm font-medium">海拔剖面</Label>
                <div className="mt-2 h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                  交互式海拔剖面图（拖动显示对应路段坡度与风险）
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Safety & Constraints */}
        <TabsContent value="safety">
          <Card>
            <CardHeader>
              <CardTitle>风险与约束</CardTitle>
              <CardDescription>Abu 视角：硬门控与风险矩阵</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 风险矩阵 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">风险矩阵</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm font-medium">天气敏感度</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {trail.riskProfile?.weatherWindow ? '高' : '中'}
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm font-medium">暴露路段</div>
                    <div className="text-xs text-muted-foreground mt-1">待评估</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm font-medium">涉水</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {trail.riskProfile?.factors?.includes('water') ? '有' : '无'}
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm font-medium">高反风险</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {trail.riskProfile?.altitudeSickness ? '是' : '否'}
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm font-medium">封路风险</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {trail.riskProfile?.roadClosure ? '是' : '否'}
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm font-medium">信号盲区</div>
                    <div className="text-xs text-muted-foreground mt-1">待评估</div>
                  </div>
                </div>
              </div>

              {/* 不可走条件 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">不可走条件（硬门控）</Label>
                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="font-medium text-red-900">风速阈值</div>
                    <div className="text-red-700 mt-1">超过 12m/s 禁止暴露山脊路段</div>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="font-medium text-red-900">降水</div>
                    <div className="text-red-700 mt-1">持续降水 &gt; 5mm/h 禁止涉水路段</div>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="font-medium text-red-900">温度</div>
                    <div className="text-red-700 mt-1">低于 -10°C 禁止高海拔路段</div>
                  </div>
                </div>
              </div>

              {/* 备案与救援 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">备案与救援信息</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>救援电话：待补充</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>登记点：待补充</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Navigation className="h-4 w-4 text-muted-foreground" />
                    <span>最近撤退点：待补充</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logistics */}
        <TabsContent value="logistics">
          <Card>
            <CardHeader>
              <CardTitle>后勤与补给</CardTitle>
              <CardDescription>Dr.Dre 视角：到达、补给、时间窗口</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 起点到达 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">起点到达方式</Label>
                <div className="space-y-2 text-sm">
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">自驾</div>
                    <div className="text-muted-foreground mt-1">
                      停车点：待补充 | 预计车程：待补充
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">公交/班车</div>
                    <div className="text-muted-foreground mt-1">
                      班次窗口：待补充（信息缺失，引导补全）
                    </div>
                  </div>
                </div>
              </div>

              {/* 补给 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">补给</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Droplet className="h-4 w-4 text-muted-foreground" />
                    <span>水源点密度：待评估</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span>补给点：待补充</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span>厕所：待补充</span>
                  </div>
                </div>
              </div>

              {/* 营地/避难所 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">营地/避难所</Label>
                <div className="space-y-2 text-sm">
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">容量：待补充</div>
                    <div className="text-muted-foreground mt-1">
                      预约：待补充 | 费用：待补充
                    </div>
                  </div>
                </div>
              </div>

              {/* 时间窗口 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">时间窗口</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>建议出发时间：待计算</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>回程末班车/天黑时间：待补充</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alternatives & Repair */}
        <TabsContent value="alternatives">
          <Card>
            <CardHeader>
              <CardTitle>替代与修复</CardTitle>
              <CardDescription>Neptune 视角：Plan B 与最小改动修复</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Plan B */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Plan B：短线替代</Label>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="border">
                      <CardContent className="p-3">
                        <div className="font-medium text-sm">替代路线 {i}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          同景观更稳 | 距离更短 | 风险更低
                        </div>
                        <Button variant="link" size="sm" className="mt-2 p-0 h-auto">
                          查看详情 <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 退出点 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">退出点/折返点</Label>
                <div className="space-y-2 text-sm">
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">退出点 1</div>
                    <div className="text-muted-foreground mt-1">按里程标注：待补充</div>
                  </div>
                </div>
              </div>

              {/* 最小改动修复 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">最小改动修复建议</Label>
                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="font-medium text-blue-900">如果延误</div>
                    <div className="text-blue-700 mt-1">如何改路线：待计算</div>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="font-medium text-blue-900">如果疲劳</div>
                    <div className="text-blue-700 mt-1">如何改路线：待计算</div>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="font-medium text-blue-900">如果天气变差</div>
                    <div className="text-blue-700 mt-1">如何改路线：待计算</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 添加 Label 组件导入
import { Label } from '@/components/ui/label';

