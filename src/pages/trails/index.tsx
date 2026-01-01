import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Search,
  Bookmark,
  MapPin,
  Shield,
  Compass,
  TrendingUp,
} from 'lucide-react';

export default function TrailsHubPage() {
  const navigate = useNavigate();

  const hubSections = [
    {
      key: 'explore',
      title: '发现路线',
      description: '搜索和筛选适合你的徒步路线',
      icon: Search,
      path: '/dashboard/trails/explore',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      key: 'saved',
      title: '收藏/下载',
      description: '查看已保存和离线下载的路线',
      icon: Bookmark,
      path: '/dashboard/trails/saved',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      key: 'my-hikes',
      title: '我的徒步',
      description: '计划中 / 执行中 / 已完成的徒步',
      icon: MapPin,
      path: '/dashboard/trails/my-hikes',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      key: 'safety',
      title: '安全中心',
      description: '装备清单 / 风险策略 / 个人能力档案',
      icon: Shield,
      path: '/dashboard/trails/safety',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  const quickActions = [
    {
      key: 'readiness',
      title: '可执行性评估',
      description: '评估今天/这周能不能走',
      icon: Compass,
      path: '/dashboard/readiness',
    },
    {
      key: 'insights',
      title: '复盘洞察',
      description: '查看历史徒步的复盘和锚点',
      icon: TrendingUp,
      path: '/dashboard/insights',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">徒步中心</h1>
        <p className="text-muted-foreground">
          从发现路线到执行复盘，全链路徒步管理
        </p>
      </div>

      {/* 主要功能区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {hubSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.key}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(section.path)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${section.bgColor}`}>
                    <Icon className={`h-6 w-6 ${section.color}`} />
                  </div>
                  <div>
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  进入
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 快捷操作 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">快捷操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.key}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(action.path)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <h3 className="font-medium">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 用户旅程提示 */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">徒步用户旅程</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="px-3 py-1 bg-background rounded-full">1. 发现路线</span>
            <span className="px-3 py-1 bg-background rounded-full">2. 评估详情</span>
            <span className="px-3 py-1 bg-background rounded-full">3. Readiness 评估</span>
            <span className="px-3 py-1 bg-background rounded-full">4. 准备清单</span>
            <span className="px-3 py-1 bg-background rounded-full">5. 执行徒步</span>
            <span className="px-3 py-1 bg-background rounded-full">6. 复盘沉淀</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
