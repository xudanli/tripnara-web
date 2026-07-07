import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Shield } from 'lucide-react';
import { PersonaAvatar } from '@/components/common/PersonaAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tripsApi } from '@/api/trips';
import { pickGuardianDigestAlerts } from '@/lib/decision-strip-model';
import { dispatchPersonaAlertDeepLink } from '@/lib/persona-alert-display';
import { resolveTripPersonaAlerts } from '@/lib/resolve-trip-persona-alerts';
import { getPersonaName } from '@/lib/persona-icons';
import { cn } from '@/lib/utils';
import type { PersonaAlert } from '@/types/trip';

export interface ScheduleGuardianDigestCardProps {
  tripId: string;
  /** 与 Decision Strip 同源；未传入时回退 API */
  personaAlerts?: PersonaAlert[];
  className?: string;
}

/** 时间轴右侧 · 三人格行程提醒（轻量摘要，详情走 deepLink） */
export function ScheduleGuardianDigestCard({
  tripId,
  personaAlerts: personaAlertsProp,
  className,
}: ScheduleGuardianDigestCardProps) {
  const [apiAlerts, setApiAlerts] = useState<PersonaAlert[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await tripsApi.getPersonaAlerts(tripId, { phase: 'planning' });
        if (!cancelled) setApiAlerts(data);
      } catch {
        if (!cancelled) setApiAlerts([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    void load();

    const onRefresh = () => {
      void load();
    };
    window.addEventListener('plan-studio:schedule-refresh', onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener('plan-studio:schedule-refresh', onRefresh);
    };
  }, [tripId]);

  const alerts = useMemo(() => {
    const source = personaAlertsProp?.length ? personaAlertsProp : apiAlerts;
    return resolveTripPersonaAlerts(source);
  }, [apiAlerts, personaAlertsProp]);

  const items = useMemo(() => pickGuardianDigestAlerts(alerts), [alerts]);

  if (!loaded || items.length === 0) {
    return null;
  }

  return (
    <Card className={cn('border-dashed', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          守护者提醒
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full items-start gap-2 rounded-md text-left hover:bg-muted/50 transition-colors p-1.5 -mx-1.5"
                onClick={() => dispatchPersonaAlertDeepLink(item.deepLink)}
              >
                <PersonaAvatar persona={item.persona} size={24} className="shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-medium text-foreground leading-snug">
                      {getPersonaName(item.persona)}
                      <span className="text-muted-foreground font-normal">
                        {' · '}
                        {item.title}
                      </span>
                    </p>
                    {item.hardConstraintBlocked ? (
                      <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                        硬约束
                      </Badge>
                    ) : null}
                  </div>
                  {item.reasonSummary ? (
                    <p className="text-[10px] text-muted-foreground/90 mt-0.5">{item.reasonSummary}</p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mt-0.5">
                    {item.body}
                  </p>
                  {item.supportingPreview ? (
                    <p className="text-[10px] text-muted-foreground/80 line-clamp-1 mt-0.5">
                      {item.supportingPreview}
                    </p>
                  ) : null}
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-1" />
              </button>
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => dispatchPersonaAlertDeepLink(items[0]?.deepLink)}
        >
          打开可执行证明
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
