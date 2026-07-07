import { RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface AutomationCatalogEmptyStateProps {
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export default function AutomationCatalogEmptyState({
  isRefreshing,
  onRefresh,
}: AutomationCatalogEmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/50 bg-muted/15">
        <Shield className="h-5 w-5 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">权限目录尚未加载</p>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
        六组任务权限来自 BFF 聚合接口{' '}
        <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[10px]">
          travelStatus.automation.catalog
        </code>
        。后端就绪后会展示各任务的自动 / 需确认 / 禁止状态；在此之前你仍可调整 L0–L4 档位与执行边界。
      </p>
      {onRefresh ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 h-8 text-xs"
          disabled={isRefreshing}
          onClick={onRefresh}
        >
          {isRefreshing ? (
            <Spinner className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          重新加载权限目录
        </Button>
      ) : null}
    </div>
  );
}
