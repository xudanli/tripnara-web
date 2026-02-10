/**
 * Planning Assistant V2 - 快捷操作按钮组件
 * 
 * 提供常用操作的快捷按钮，如"推荐酒店"、"推荐餐厅"等
 */

import { Button } from '@/components/ui/button';
import { Hotel, Utensils, Cloud, Plane, Train, Search, Home } from 'lucide-react';
import { generateQuickActionMessage } from '@/utils/planning-assistant-helpers';

interface QuickActionsProps {
  onAction: (message: string) => void;
  destination?: string;
  disabled?: boolean;
  className?: string;
}

const quickActions = [
  {
    icon: Hotel,
    label: '推荐酒店',
    action: 'hotel' as const,
    description: '搜索酒店',
  },
  {
    icon: Home,
    label: '推荐住宿',
    action: 'accommodation' as const,
    description: '酒店+Airbnb',
  },
  {
    icon: Utensils,
    label: '推荐餐厅',
    action: 'restaurant' as const,
    description: '附近美食',
  },
  {
    icon: Cloud,
    label: '查天气',
    action: 'weather' as const,
    description: '天气预报',
  },
  {
    icon: Plane,
    label: '查航班',
    action: 'flight' as const,
    description: '搜索航班',
  },
  {
    icon: Train,
    label: '查火车',
    action: 'rail' as const,
    description: '铁路查询',
  },
  {
    icon: Search,
    label: '搜索信息',
    action: 'search' as const,
    description: '网上搜索',
  },
];

export function QuickActions({
  onAction,
  destination,
  disabled = false,
  className,
}: QuickActionsProps) {
  const handleAction = (action: typeof quickActions[0]['action']) => {
    const message = generateQuickActionMessage(action, destination);
    onAction(message);
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className || ''}`}>
      {quickActions.map(({ icon: Icon, label, action, description }) => (
        <Button
          key={action}
          variant="outline"
          size="sm"
          onClick={() => handleAction(action)}
          disabled={disabled}
          className="h-auto py-2 px-3 flex items-center gap-2"
          title={description}
        >
          <Icon className="w-4 h-4" />
          <span className="text-xs">{label}</span>
        </Button>
      ))}
    </div>
  );
}
