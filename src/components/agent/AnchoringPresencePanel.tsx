import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { EmotionalContextClient } from '@/types/emotional-context';
import { AlertTriangle, Clock, MapPin, Shield, Wind } from 'lucide-react';

export interface AnchoringPresencePanelProps {
  context: EmotionalContextClient;
  /** 一键应急（行中可接 emergency API） */
  onEmergency?: () => void;
  className?: string;
}

export function AnchoringPresencePanel({
  context,
  onEmergency,
  className,
}: AnchoringPresencePanelProps) {
  const windLock = context.ambienceSignals?.weatherWindLockActive === true;
  const isReassurance = context.voiceToneModifier === 'empathetic_reassurance';
  const summary =
    context.userFriendlySummary?.trim() ||
    (windLock
      ? '强风/风暴条件下，请待在安全室内，可变约项已自动标记延期。'
      : isReassurance
        ? '行程里有些住宿需要再核对一下，我已帮你标出要留意的几晚，按下面进度条处理即可。'
        : '上下文已锁定，按当前最安全方案执行。');

  return (
    <Card
      className={cn(
        'border-border/60 bg-gradient-to-br from-muted/15 to-slate-50/80 dark:from-muted/15/30 dark:to-slate-950/40',
        windLock && 'border-amber-400/70 from-amber-50/90 dark:from-amber-950/25',
        className
      )}
    >
      <CardHeader className="pb-2 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" aria-hidden />
          <CardTitle className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground">
            {isReassurance ? '别担心，我帮你看过了' : '别慌，有我在'}
          </CardTitle>
          {windLock ? (
            <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/50 text-amber-900">
              <Wind className="h-3 w-3" aria-hidden />
              强风锁定
            </Badge>
          ) : null}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{summary}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              待在原地
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">已锁定当前上下文，勿贸然改线</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden />
              一键应急
            </div>
            <Button
              type="button"
              size="sm"
              variant={windLock ? 'secondary' : 'default'}
              className="mt-2 h-7 w-full text-xs"
              onClick={onEmergency}
              disabled={!onEmergency}
            >
              打开应急入口
            </Button>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              可变约项
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">已标记延期，恢复后再安排</p>
          </div>
        </div>
        {windLock ? (
          <p className="text-[10px] text-amber-800/90 dark:text-amber-200/90">
            风暴/强风态：促销与改线类操作已抑制，优先安全与锚定方案。
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
