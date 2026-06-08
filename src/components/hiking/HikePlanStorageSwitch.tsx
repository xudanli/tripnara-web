import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useHikePlanStorage } from '@/hooks/useHikePlanStorage';
import { Cloud, HardDrive } from 'lucide-react';

type HikePlanStorageSwitchProps = {
  className?: string;
  compact?: boolean;
};

/** 切换 HikePlan/GPS：云端 API（需登录） vs 本地 IndexedDB */
export function HikePlanStorageSwitch({ className, compact }: HikePlanStorageSwitchProps) {
  const { mode, isApiMode, isAuthenticated, setMode } = useHikePlanStorage();

  const handleToggle = (checked: boolean) => {
    if (checked && !isAuthenticated) return;
    setMode(checked ? 'api' : 'local');
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className ?? ''}`}>
        {isApiMode ? <Cloud className="h-3.5 w-3.5" /> : <HardDrive className="h-3.5 w-3.5" />}
        <span>{isApiMode ? '云端计划' : '本地计划'}</span>
        <Switch
          checked={isApiMode}
          onCheckedChange={handleToggle}
          disabled={!isAuthenticated && !isApiMode}
          aria-label="切换徒步计划存储"
        />
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${className ?? ''}`}>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          {isApiMode ? <Cloud className="h-4 w-4" /> : <HardDrive className="h-4 w-4" />}
          徒步计划存储
          <Badge variant="secondary">{isApiMode ? '云端 API' : '本地'}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {isApiMode
            ? '数据保存在 /api/hiking/hike-plans（需登录）'
            : '数据保存在浏览器 IndexedDB，未登录可用'}
        </p>
        {!isAuthenticated && (
          <p className="text-xs text-amber-700">登录后可切换到云端同步</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="hike-plan-storage" className="text-xs text-muted-foreground">
          云端
        </Label>
        <Switch
          id="hike-plan-storage"
          checked={isApiMode}
          onCheckedChange={handleToggle}
          disabled={!isAuthenticated && !isApiMode}
        />
      </div>
    </div>
  );
}
