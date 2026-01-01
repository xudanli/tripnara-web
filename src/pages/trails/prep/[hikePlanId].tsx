import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Car,
  Download,
  MapPin,
  Phone,
  ExternalLink,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PrepChecklist, PrepPermit, PrepTransport, OfflinePack } from '@/types/trail';

export default function PrepCenterPage() {
  const { hikePlanId } = useParams<{ hikePlanId: string }>();
  const navigate = useNavigate();
  
  // 模拟数据
  const [checklist, setChecklist] = useState<PrepChecklist[]>([
    {
      id: 'essential',
      category: 'essential',
      items: [
        { id: '1', name: '地图和指南针', required: true, checked: false },
        { id: '2', name: 'GPS设备/手机', required: true, checked: false },
        { id: '3', name: '头灯/手电筒', required: true, checked: false },
        { id: '4', name: '急救包', required: true, checked: false },
      ],
    },
    {
      id: 'clothing',
      category: 'clothing',
      items: [
        { id: '5', name: '防水外套', required: true, checked: false, reason: '预计有降水' },
        { id: '6', name: '保暖层', required: true, checked: false, reason: '最低温度 -5°C' },
        { id: '7', name: '速干衣', required: false, checked: false },
      ],
    },
    {
      id: 'safety',
      category: 'safety',
      items: [
        { id: '8', name: '口哨', required: true, checked: false },
        { id: '9', name: '救生毯', required: true, checked: false },
        { id: '10', name: '信号镜', required: false, checked: false },
      ],
    },
  ]);

  const [permits, setPermits] = useState<PrepPermit[]>([
    {
      id: '1',
      name: '国家公园许可',
      required: true,
      obtained: false,
      bookingUrl: 'https://example.com/permits',
      capacity: 50,
      deadline: '2024-12-31',
      cost: 100,
    },
  ]);

  const [transport] = useState<PrepTransport>({
    type: 'drive',
    toTrailhead: {
      method: '自驾',
      parkingLocation: { latitude: -45.0, longitude: 168.0 },
      estimatedDuration: 120,
    },
    fromTrailhead: {
      method: '自驾',
    },
  });

  const [offlinePack, setOfflinePack] = useState<OfflinePack | null>(null);

  const categoryLabels: Record<string, string> = {
    essential: '必需品',
    clothing: '衣物',
    safety: '安全',
    navigation: '导航',
    food: '食物',
    shelter: '庇护',
  };

  const handleChecklistToggle = (categoryId: string, itemId: string) => {
    setChecklist((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.id === itemId ? { ...item, checked: !item.checked } : item
              ),
            }
          : cat
      )
    );
  };

  const handlePermitToggle = (permitId: string) => {
    setPermits((prev) =>
      prev.map((p) => (p.id === permitId ? { ...p, obtained: !p.obtained } : p))
    );
  };

  const allEssentialChecked = checklist
    .flatMap((cat) => cat.items.filter((item) => item.required))
    .every((item) => item.checked);

  const allPermitsObtained = permits.filter((p) => p.required).every((p) => p.obtained);

  const canStart = allEssentialChecked && allPermitsObtained && offlinePack !== null;

  const handleDownloadOfflinePack = () => {
    // 模拟下载离线包
    setOfflinePack({
      trailId: 'trail-1',
      emergencyContacts: [
        { name: '救援电话', phone: '+64-111', type: 'rescue' },
        { name: '公园管理处', phone: '+64-222', type: 'park' },
      ],
      downloadedAt: new Date().toISOString(),
    });
    toast.success('离线包下载成功');
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* 返回按钮 */}
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">徒步准备中心</h1>
        <p className="text-muted-foreground">
          把"可执行计划"变成"可出门行动"
        </p>
      </div>

      <Tabs defaultValue="checklist" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checklist">装备清单</TabsTrigger>
          <TabsTrigger value="permits">许可/预约</TabsTrigger>
          <TabsTrigger value="transport">到达与返程</TabsTrigger>
          <TabsTrigger value="offline">离线包</TabsTrigger>
        </TabsList>

        {/* Checklist */}
        <TabsContent value="checklist">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>装备清单</CardTitle>
                  <CardDescription>
                    根据温度、风、路线风险自动生成
                  </CardDescription>
                </div>
                {allEssentialChecked ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    必需品已备齐
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    缺少必需品
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {checklist.map((category) => {
                const categoryChecked = category.items
                  .filter((item) => item.required)
                  .every((item) => item.checked);
                const missingRequired = category.items.filter(
                  (item) => item.required && !item.checked
                );

                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">
                        {categoryLabels[category.category] || category.category}
                      </h3>
                      {categoryChecked ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          缺少 {missingRequired.length} 项
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      {category.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-2 rounded-lg border hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={() =>
                              handleChecklistToggle(category.id, item.id)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={item.required ? 'font-medium' : ''}>
                                {item.name}
                              </span>
                              {item.required && (
                                <Badge variant="destructive" className="text-xs">
                                  必需
                                </Badge>
                              )}
                            </div>
                            {item.reason && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.reason}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {!allEssentialChecked && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-900 font-medium mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    关键装备缺失
                  </div>
                  <p className="text-sm text-red-700">
                    缺少必需装备可能触发 Abu 的风险提示，请确保所有必需物品已准备。
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permits */}
        <TabsContent value="permits">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>许可/预约</CardTitle>
                  <CardDescription>需要预约、费用、链接</CardDescription>
                </div>
                {allPermitsObtained ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    已获取
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    待获取
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {permits.map((permit) => (
                <Card key={permit.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{permit.name}</h3>
                          {permit.required && (
                            <Badge variant="destructive" className="text-xs">
                              必需
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {permit.capacity && (
                            <div>容量：{permit.capacity} 人</div>
                          )}
                          {permit.deadline && (
                            <div>截止时间：{permit.deadline}</div>
                          )}
                          {permit.cost && <div>费用：${permit.cost}</div>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Checkbox
                          checked={permit.obtained}
                          onCheckedChange={() => handlePermitToggle(permit.id)}
                        />
                        {permit.bookingUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(permit.bookingUrl, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            预约
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {permits.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  无需许可
                </div>
              )}

              {!allPermitsObtained && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-900 font-medium mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    预约失败时
                  </div>
                  <p className="text-sm text-yellow-700">
                    Neptune 将提供替代营地/替代路线建议
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transport */}
        <TabsContent value="transport">
          <Card>
            <CardHeader>
              <CardTitle>到达与返程</CardTitle>
              <CardDescription>自驾、公交、班车信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  到达起点
                </h3>
                <div className="p-4 border rounded-lg space-y-2 text-sm">
                  <div>
                    <span className="font-medium">方式：</span>
                    {transport.toTrailhead.method}
                  </div>
                  {transport.toTrailhead.parkingLocation && (
                    <div>
                      <span className="font-medium">停车点：</span>
                      <Button variant="link" size="sm" className="p-0 h-auto">
                        <MapPin className="h-3 w-3 mr-1" />
                        查看位置
                      </Button>
                    </div>
                  )}
                  {transport.toTrailhead.estimatedDuration && (
                    <div>
                      <span className="font-medium">预计车程：</span>
                      {transport.toTrailhead.estimatedDuration} 分钟
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  从终点返回
                </h3>
                <div className="p-4 border rounded-lg space-y-2 text-sm">
                  <div>
                    <span className="font-medium">方式：</span>
                    {transport.fromTrailhead.method}
                  </div>
                  {transport.fromTrailhead.lastDeparture && (
                    <div>
                      <span className="font-medium">末班车：</span>
                      {transport.fromTrailhead.lastDeparture}
                    </div>
                  )}
                  {!transport.fromTrailhead.lastDeparture && (
                    <div className="text-muted-foreground italic">
                      信息缺失，请引导补全
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Offline Pack */}
        <TabsContent value="offline">
          <Card>
            <CardHeader>
              <CardTitle>离线包</CardTitle>
              <CardDescription>离线地图、轨迹、紧急联系卡</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {offlinePack ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-900 font-medium mb-2">
                      <CheckCircle2 className="h-4 w-4" />
                      已下载
                    </div>
                    <div className="text-sm text-green-700">
                      下载时间：{new Date(offlinePack.downloadedAt!).toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">包含内容</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>离线地图</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>GPS轨迹</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>紧急联系卡（本地可打开）</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>关键撤退点列表</span>
                      </div>
                    </div>
                  </div>

                  {offlinePack.emergencyContacts && (
                    <div>
                      <h3 className="font-semibold mb-2">紧急联系人</h3>
                      <div className="space-y-2">
                        {offlinePack.emergencyContacts.map((contact, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 border rounded-lg text-sm"
                          >
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="font-medium">{contact.name}</div>
                              <div className="text-muted-foreground">{contact.phone}</div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {contact.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Download className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    下载离线包以确保在无信号区域也能使用
                  </p>
                  <Button onClick={handleDownloadOfflinePack}>
                    <Download className="h-4 w-4 mr-2" />
                    下载离线包
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Start Hike CTA */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">准备完成</h3>
              <p className="text-sm text-muted-foreground">
                {canStart
                  ? '所有准备工作已完成，可以开始徒步'
                  : '请完成所有必需的准备工作'}
              </p>
            </div>
            <Button
              size="lg"
              disabled={!canStart}
              onClick={() => navigate(`/dashboard/trails/on-trail/${hikePlanId}`)}
            >
              <Play className="h-4 w-4 mr-2" />
              开始徒步
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

