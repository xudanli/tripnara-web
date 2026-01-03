/**
 * 建议角标组件
 * 显示在Day卡片、行程项右上角的轻量级信号指示器
 */

import { Shield, TrendingUp, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PersonaType } from '@/types/suggestion';

interface SuggestionBadgeProps {
  persona: PersonaType;
  count: number;
  onClick?: () => void;
  className?: string;
}

const personaConfig = {
  abu: {
    icon: Shield,
    label: '风险',
    className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
  },
  drdre: {
    icon: TrendingUp,
    label: '节奏',
    className: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
  },
  neptune: {
    icon: Wrench,
    label: '修复',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
  },
};

export function SuggestionBadge({ persona, count, onClick, className }: SuggestionBadgeProps) {
  if (count === 0) return null;

  const config = personaConfig[persona];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1 cursor-pointer transition-colors',
        config.className,
        className
      )}
      onClick={onClick}
    >
      <Icon className="w-3 h-3" />
      <span className="text-xs font-medium">{count}</span>
    </Badge>
  );
}

