import { Plus, Vote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdvisorVotesEmptyStateProps {
  onCreate: () => void;
  onGoInvites?: () => void;
  className?: string;
}

/**
 * 顾问制「团队投票」空状态 · 单构图
 * 主 CTA：创建投票 · 次 CTA：去角色邀请
 */
export function AdvisorVotesEmptyState({
  onCreate,
  onGoInvites,
  className,
}: AdvisorVotesEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center px-3 py-8 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className="mb-3 flex size-10 items-center justify-center rounded-lg border border-border/60 bg-muted/20"
        aria-hidden
      >
        <Vote className="size-5 text-muted-foreground" strokeWidth={1.75} />
      </div>

      <h4 className="text-sm font-semibold tracking-tight text-foreground">
        还没有需要成员选择的事项
      </h4>
      <p className="mt-1 max-w-[22rem] text-xs leading-relaxed text-muted-foreground">
        当你有 2 个以上备选方案时，发起匿名投票；成员表态后，你可据此定案。
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1 px-3 text-xs"
          onClick={onCreate}
        >
          <Plus className="size-3.5" aria-hidden />
          创建投票
        </Button>
        {onGoInvites ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 border-border px-3 text-xs"
            onClick={onGoInvites}
          >
            去角色邀请
          </Button>
        ) : null}
      </div>

      <p className="mt-4 max-w-[24rem] text-[10px] leading-relaxed text-muted-foreground/90">
        行前问卷收需求、角色邀请拉成员；本页只做选项投票。也可在方案对比页对备选方案发起投票。
      </p>
    </div>
  );
}
