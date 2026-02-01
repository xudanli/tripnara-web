/**
 * 快捷入口区域
 * 显示三个核心入口：行程、国家数据库、路线模版
 */

import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { List, Globe, Route } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAccessSectionProps {
  className?: string;
}

export default function QuickAccessSection({ className }: QuickAccessSectionProps) {
  const navigate = useNavigate();

  const quickAccessItems = [
    {
      id: 'trips',
      title: '我的行程',
      description: '查看和管理所有行程',
      icon: List,
      route: '/dashboard/trips',
      // 统一使用中性色，通过图标形状区分功能
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
      hoverBgColor: 'hover:bg-slate-100',
    },
    {
      id: 'countries',
      title: '国家数据库',
      description: '浏览国家知识库和目的地信息',
      icon: Globe,
      route: '/dashboard/countries',
      // 统一使用中性色，通过图标形状区分功能
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
      hoverBgColor: 'hover:bg-slate-100',
    },
    {
      id: 'route-templates',
      title: '路线模版',
      description: '查看和选择路线模版',
      icon: Route,
      route: '/dashboard/route-directions/templates',
      // 统一使用中性色，通过图标形状区分功能
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
      hoverBgColor: 'hover:bg-slate-100',
    },
  ];

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">快捷入口</CardTitle>
        <CardDescription className="text-xs">
          快速访问常用功能
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant="outline"
                className={cn(
                  "h-auto flex-col gap-2 p-3 transition-all duration-200",
                  "hover:shadow-sm hover:scale-[1.02]",
                  item.bgColor,
                  item.hoverBgColor,
                  "border border-slate-200"
                )}
                onClick={() => navigate(item.route)}
              >
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", item.bgColor)}>
                  <Icon className={cn("w-4 h-4", item.color)} />
                </div>
                <div className="flex flex-col gap-0.5 text-center">
                  <span className="font-semibold text-sm text-gray-900">
                    {item.title}
                  </span>
                  <span className="text-xs text-gray-600">
                    {item.description}
                  </span>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
