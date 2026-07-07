import { exploreUi } from '../explore-ui';
import { cn } from '@/lib/utils';
import { semanticGoodText, semanticBadText } from '@/lib/semantic-ui-classes';

interface RevalidationBannerProps {
  resolved?: boolean;
  revalidationStatus?: string;
  newIssueCount?: number;
}

export function RevalidationBanner({
  resolved,
  revalidationStatus,
  newIssueCount = 0,
}: RevalidationBannerProps) {
  return (
    <div className={cn(exploreUi.tipBox, 'space-y-2')}>
      <p className="text-sm font-medium text-foreground">应用结果</p>
      <ul className="text-xs text-muted-foreground space-y-1">
        <li>
          原问题：
          <span className={cn('ml-1 font-medium', resolved ? semanticGoodText : semanticBadText)}>
            {resolved ? '已解决' : '待确认'}
          </span>
        </li>
        <li>重新验证：{revalidationStatus ?? '—'}</li>
        <li>
          剩余阻断：
          {newIssueCount > 0 ? (
            <span className={cn('ml-1 font-medium', semanticBadText)}>{newIssueCount} 个</span>
          ) : (
            <span className="ml-1">无</span>
          )}
        </li>
      </ul>
    </div>
  );
}
