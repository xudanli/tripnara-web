/**
 * 三人格状态徽章组件
 * 显示三人格（Abu/Dr.Dre/Neptune）的评审状态
 */

import { Shield, Activity, Compass, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type PersonaType = 'ABU' | 'DR_DRE' | 'NEPTUNE';
export type PersonaStatus = 'ALLOW' | 'NEED_ADJUST' | 'REJECT' | 'PENDING';

interface PersonaStatusBadgeProps {
  persona: PersonaType;
  status: PersonaStatus;
  size?: 'sm' | 'md';
  className?: string;
}

const personaConfig = {
  ABU: {
    name: 'Abu',
    nameCN: '安全守门',
    icon: Shield,
    // 统一使用中性色，通过图标区分
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
  DR_DRE: {
    name: 'Dr.Dre',
    nameCN: '节奏体感',
    icon: Activity,
    // 统一使用中性色，通过图标区分
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
  NEPTUNE: {
    name: 'Neptune',
    nameCN: '结构修复',
    icon: Compass,
    // 统一使用中性色，通过图标区分
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
};

const statusConfig = {
  ALLOW: {
    icon: CheckCircle,
    label: '✓',
    // 使用中性色，通过图标形状表达状态
    className: 'text-slate-600',
  },
  NEED_ADJUST: {
    icon: AlertTriangle,
    label: '⚠',
    // 需要调整时使用稍深的颜色，但仍保持克制
    className: 'text-amber-600',
  },
  REJECT: {
    icon: XCircle,
    label: '✗',
    // 使用中性色，通过图标形状表达状态
    className: 'text-slate-600',
  },
  PENDING: {
    icon: null,
    label: '...',
    className: 'text-slate-400',
  },
};

export default function PersonaStatusBadge({
  persona,
  status,
  size = 'md',
  className,
}: PersonaStatusBadgeProps) {
  const personaInfo = personaConfig[persona];
  const PersonaIcon = personaInfo.icon;
  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1',
        personaInfo.bgColor,
        personaInfo.borderColor,
        className
      )}
    >
      <PersonaIcon className={cn(iconSize, personaInfo.color)} />
      <span className={cn('font-medium', textSize, personaInfo.color)}>
        {personaInfo.nameCN}
      </span>
      {StatusIcon ? (
        <StatusIcon className={cn(iconSize, statusInfo.className)} />
      ) : (
        <span className={cn(textSize, statusInfo.className)}>
          {statusInfo.label}
        </span>
      )}
    </div>
  );
}
