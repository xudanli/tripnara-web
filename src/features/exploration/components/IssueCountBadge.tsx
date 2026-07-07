import { semanticBadText, semanticWarnText } from '../explore-ui';
import { cn } from '@/lib/utils';

interface IssueCountBadgeProps {
  displayedCount: number;
  totalCount: number;
  /** 展示中的首条问题严重级别，用于文案 */
  preferredSeverity?: 'BLOCK' | 'CONFLICT' | 'VERIFY' | 'OPTIMIZE';
}

export function IssueCountBadge({
  displayedCount,
  totalCount,
  preferredSeverity,
}: IssueCountBadgeProps) {
  const hidden = totalCount - displayedCount;
  if (totalCount <= 0) return null;

  const isMustFix = preferredSeverity === 'BLOCK' || preferredSeverity === 'CONFLICT';
  const toneClass = isMustFix ? semanticBadText : semanticWarnText;
  const noun = isMustFix ? '必须处理的问题' : '待关注问题';

  if (hidden <= 0) {
    return (
      <p className={cn('text-sm font-medium', toneClass)}>
        发现 {totalCount} 个{noun}
      </p>
    );
  }
  return (
    <p className={cn('text-sm font-medium', toneClass)}>
      展示 {displayedCount} 个{noun}
      <span className="font-normal opacity-80 ml-2">
        （共 {totalCount} 个问题，还有 {hidden} 个未展示）
      </span>
    </p>
  );
}
