import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Compass,
  Shield,
  ListChecks,
  Activity,
} from 'lucide-react';

export default function TrailsSafetyPage() {
  const navigate = useNavigate();

  const sections = [
    {
      title: '可执行性评估',
      description: '结合天气、路线与个人状态，判断今天/本周能否出发',
      icon: Compass,
      path: '/dashboard/readiness',
    },
    {
      title: '路线 Readiness',
      description: '按路线评估季节、天气、地形与体能匹配（非行程）',
      icon: Activity,
      path: '/dashboard/trails/explore',
      note: '在路线详情点击 Readiness 评估，或 /readiness?trailId=路线ID',
    },
    {
      title: '装备与行前清单',
      description: '在准备中心勾选装备、许可与离线包',
      icon: ListChecks,
      path: '/dashboard/trails/saved',
      note: '从已下载路线进入准备页',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/dashboard/trails')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回徒步中心
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Shield className="h-8 w-8 text-red-600" />
          安全中心
        </h1>
        <p className="text-muted-foreground">
          装备清单、风险策略与个人能力档案（逐步接入 Readiness / 审计 API）
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-50">
                    <Icon className="h-5 w-5 text-red-700" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{s.title}</CardTitle>
                    <CardDescription>{s.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {s.note ? (
                  <p className="text-sm text-muted-foreground mb-3">{s.note}</p>
                ) : null}
                <Button variant="outline" onClick={() => navigate(s.path)}>
                  前往
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
