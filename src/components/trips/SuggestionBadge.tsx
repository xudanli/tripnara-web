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
    className: 'bg-persona-abu/10 text-persona-abu-foreground border-persona-abu-accent/30 hover:bg-persona-abu/20',
  },
  drdre: {
    icon: TrendingUp,
    label: '节奏',
    className: 'bg-persona-dre/10 text-persona-dre-foreground border-persona-dre-accent/30 hover:bg-persona-dre/20',
  },
  neptune: {
    icon: Wrench,
    label: '修复',
    className: 'bg-persona-neptune/10 text-persona-neptune-foreground border-persona-neptune-accent/30 hover:bg-persona-neptune/20',
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

