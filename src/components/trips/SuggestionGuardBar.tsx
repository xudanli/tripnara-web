/**
 * 护航提示条组件
 * 在Header下方显示，仅在有待处理建议时出现
 */

import { Button } from '@/components/ui/button';
import { Shield, TrendingUp, Wrench, ChevronRight } from 'lucide-react';
import type { SuggestionStats } from '@/types/suggestion';

interface SuggestionGuardBarProps {
  stats: SuggestionStats | null;
  onClick?: () => void;
  className?: string;
}

export function SuggestionGuardBar({ stats, onClick, className }: SuggestionGuardBarProps) {
  // 如果没有统计信息或所有数量为0，不显示
  if (!stats || (stats.byPersona.abu.total === 0 && stats.byPersona.drdre.total === 0 && stats.byPersona.neptune.total === 0)) {
    return null;
  }

  const total = stats.byPersona.abu.total + stats.byPersona.drdre.total + stats.byPersona.neptune.total;
  
  const items: Array<{ persona: 'abu' | 'drdre' | 'neptune'; count: number; label: string }> = [];
  
  if (stats.byPersona.abu.total > 0) {
    items.push({ persona: 'abu', count: stats.byPersona.abu.total, label: '风险' });
  }
  if (stats.byPersona.drdre.total > 0) {
    items.push({ persona: 'drdre', count: stats.byPersona.drdre.total, label: '节奏' });
  }
  if (stats.byPersona.neptune.total > 0) {
    items.push({ persona: 'neptune', count: stats.byPersona.neptune.total, label: '修复' });
  }

  const personaIcons = {
    abu: Shield,
    drdre: TrendingUp,
    neptune: Wrench,
  };

  return (
    <div className={`bg-blue-50/50 border border-blue-200/60 rounded-lg p-4 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-900">
            发现 <strong>{total}</strong> 条建议
            {items.length > 0 && (
              <>
                {' '}（
                {items.map((item, idx) => {
                  const Icon = personaIcons[item.persona];
                  return (
                    <span key={item.persona} className="inline-flex items-center gap-1">
                      {idx > 0 && '、'}
                      <Icon className="w-3 h-3" />
                      <strong>{item.count}</strong> 个{item.label}
                    </span>
                  );
                })}
                ），已汇总在右侧助手中心
              </>
            )}
          </span>
        </div>
        {onClick && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClick}
            className="text-blue-700 border-blue-300 hover:bg-blue-100"
          >
            查看建议
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

