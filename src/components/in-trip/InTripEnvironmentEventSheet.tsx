import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Spinner } from '@/components/ui/spinner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  environmentEventStatusLabel,
  environmentEventTypeLabel,
  formatCostDifference,
  formatExperienceEquivalence,
  vulnerabilitySeverityClasses,
} from '@/lib/in-trip-execution';
import { useInTripEnvironmentEvent } from '@/hooks/useInTripEnvironmentEvent';
import { ChevronDown } from 'lucide-react';

interface InTripEnvironmentEventSheetProps {
  tripId: string;
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved?: () => void;
}

export function InTripEnvironmentEventSheet({
  tripId,
  eventId,
  open,
  onOpenChange,
  onResolved,
}: InTripEnvironmentEventSheetProps) {
  const {
    detail,
    loading,
    error,
    voting,
    resolving,
    selectedPlanId,
    setSelectedPlanId,
    preferenceStrength,
    setPreferenceStrength,
    vote,
    resolve,
  } = useInTripEnvironmentEvent(open ? tripId : null, open ? eventId : null);

  const canVote =
    detail != null &&
    detail.status !== 'resolved' &&
    detail.status !== 'dismissed' &&
    detail.alternativePlans.length > 0;

  const handleResolve = async () => {
    await resolve(selectedPlanId ?? undefined);
    onResolved?.();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>环境事件详情</SheetTitle>
          <SheetDescription>
            查看替代方案、连锁影响并参与投票
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="flex justify-center py-12">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive py-4">{error}</p>
        )}

        {detail && !loading && (
          <div className="mt-4 space-y-4 pb-6">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={cn('text-xs', vulnerabilitySeverityClasses(detail.severity))}
                >
                  {detail.severity === 'red' ? '高风险' : '需关注'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {environmentEventTypeLabel(detail.type)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {environmentEventStatusLabel(detail.status)}
                </Badge>
              </div>
              <p className="text-sm">{detail.description}</p>
            </div>

            {detail.affectedItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">受影响行程</p>
                <ul className="space-y-1">
                  {detail.affectedItems.map((item) => (
                    <li
                      key={item.itemId}
                      className="text-sm rounded-md border px-3 py-2 flex justify-between gap-2"
                    >
                      <span>{item.itemName}</span>
                      {!item.refundable && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          不可退
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detail.alternativePlans.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">替代方案</p>
                <RadioGroup
                  value={selectedPlanId ?? ''}
                  onValueChange={setSelectedPlanId}
                  className="space-y-2"
                  disabled={detail.status === 'resolved'}
                >
                  {detail.alternativePlans.map((plan) => (
                    <label
                      key={plan.planId}
                      htmlFor={`env-plan-${plan.planId}`}
                      className={cn(
                        'block cursor-pointer rounded-lg border p-3 transition-colors',
                        selectedPlanId === plan.planId
                          ? 'border-primary/40 bg-primary/[0.04]'
                          : 'hover:bg-muted/40',
                        detail.status === 'resolved' && 'cursor-default opacity-80',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <RadioGroupItem
                          id={`env-plan-${plan.planId}`}
                          value={plan.planId}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm font-medium">{plan.name}</p>
                          <p className="text-xs text-muted-foreground">{plan.description}</p>
                          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                            <span>{plan.timeAdjustment}</span>
                            <span>{formatCostDifference(plan.costDifference)}</span>
                            <span>心价比 {formatExperienceEquivalence(plan.experienceEquivalence)}</span>
                            {plan.bookingRequired && <span>需预订</span>}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {detail.cascadeImpact.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted/50">
                  选这个方案，后面会怎么变
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  {detail.cascadeImpact.map((impact, index) => (
                    <div key={`${impact.affectedDay}-${index}`} className="rounded-md border px-3 py-2 text-xs">
                      <p className="font-medium">
                        第 {impact.affectedDay} 天 · {impact.affectedItem}
                      </p>
                      <p className="text-muted-foreground mt-0.5">{impact.impactDescription}</p>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {canVote && (
              <div className="space-y-3 rounded-lg border p-3">
                <Label className="text-xs text-muted-foreground">偏好强度（1–5）</Label>
                <Slider
                  value={[preferenceStrength]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={([v]) => setPreferenceStrength(v)}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={!selectedPlanId || voting}
                    onClick={() => vote()}
                  >
                    {voting ? '提交中…' : '提交投票'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={resolving}
                    onClick={handleResolve}
                  >
                    {resolving ? '锁定中…' : '锁定方案'}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  锁定方案需组织者权限；投票可重复提交，以最后一次为准。
                </p>
              </div>
            )}

            {detail.resolution && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <p className="font-medium">已锁定方案</p>
                {detail.resolvedAt && (
                  <p className="text-xs mt-1 text-emerald-700">
                    {new Date(detail.resolvedAt).toLocaleString('zh-CN')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
