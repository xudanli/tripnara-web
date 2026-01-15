import type { UIStatus } from '@/api/agent';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

/**
 * Trip creation status indicator (reusable).
 * Kept lightweight; mirrors the feel of AgentChat's indicator without coupling.
 */
export function StatusIndicator({ status, className }: { status: UIStatus; className?: string }) {
  const config = (() => {
    switch (status) {
      case 'thinking':
        return {
          icon: (
            <div className="relative w-4 h-4">
              <div className="absolute inset-0 rounded-full bg-blue-500 animate-pulse" />
              <div className="absolute inset-1 rounded-full bg-blue-300" />
            </div>
          ),
          text: 'AI 正在思考…',
          color: 'text-blue-600',
        };
      case 'browsing':
        return {
          icon: <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />,
          text: '正在收集信息…',
          color: 'text-orange-600',
        };
      case 'verifying':
        return {
          icon: <div className="w-4 h-4 rounded-full bg-yellow-500 animate-pulse" />,
          text: '正在核验关键点…',
          color: 'text-yellow-600',
        };
      case 'repairing':
        return {
          icon: <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />,
          text: '正在修复与优化…',
          color: 'text-orange-600',
        };
      case 'awaiting_consent':
        return {
          icon: <div className="w-4 h-4 rounded-full bg-red-500" />,
          text: '需要授权才能继续',
          color: 'text-red-600',
        };
      case 'awaiting_confirmation':
        return {
          icon: <div className="w-4 h-4 rounded-full bg-red-500" />,
          text: '需要确认才能继续',
          color: 'text-red-600',
        };
      case 'awaiting_user_input':
        return {
          icon: <div className="w-4 h-4 rounded-full bg-yellow-500" />,
          text: '需要更多信息（请回答问题）',
          color: 'text-yellow-600',
        };
      case 'done':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
          text: '完成',
          color: 'text-green-600',
        };
      case 'failed':
        return {
          icon: <XCircle className="w-4 h-4 text-red-600" />,
          text: '失败（可重试）',
          color: 'text-red-600',
        };
      default:
        return null;
    }
  })();

  if (!config) return null;

  return (
    <div className={cn('flex items-center gap-1.5 text-xs', config.color, className)}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}

