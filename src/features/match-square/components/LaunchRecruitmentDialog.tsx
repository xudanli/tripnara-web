import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { PlanningStyle } from '@/types/match-square';
import type { RouteTemplate } from '@/types/places-routes';
import { routeDirectionsApi } from '@/api/route-directions';
import {
  buildRecruitmentInitialFromRouteTemplate,
  resolveCatalogEntryFromTemplate,
} from '@/features/match-square/lib/route-template-plaza-bridge';

type LaunchRecruitmentDialogProps = {
  template: RouteTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function defaultDates(durationDays: number): { startDate: string; endDate: string } {
  const start = new Date();
  start.setDate(start.getDate() + 30);
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(1, durationDays - 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

/** 链路 A · launch-recruitment 表单 */
export function LaunchRecruitmentDialog({
  template,
  open,
  onOpenChange,
}: LaunchRecruitmentDialogProps) {
  const navigate = useNavigate();
  const catalogEntry = resolveCatalogEntryFromTemplate(template);
  const defaults = useMemo(() => {
    const initial = catalogEntry
      ? buildRecruitmentInitialFromRouteTemplate({
          catalogEntry,
          routeTemplateId: template.id,
          routeDirectionId: template.routeDirectionId,
          routeDirectionName: template.routeDirection?.nameCN,
          dayPlans: template.dayPlans,
        })
      : null;
    const dates = defaultDates(template.durationDays);
    return {
      startDate: initial?.startDate ?? dates.startDate,
      endDate: initial?.endDate ?? dates.endDate,
      slotsNeeded: initial?.slotsNeeded ?? 2,
      planningStyle: (initial?.planningStyle ?? 'co_planning') as PlanningStyle,
      departureLabel: template.routeDirection?.nameCN ?? '',
      budgetMinCents: initial?.budgetRange?.minCents ?? undefined,
      budgetMaxCents: initial?.budgetRange?.maxCents ?? undefined,
    };
  }, [catalogEntry, template]);

  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [slotsNeeded, setSlotsNeeded] = useState(String(defaults.slotsNeeded));
  const [planningStyle, setPlanningStyle] = useState<PlanningStyle>(defaults.planningStyle);
  const [departureLabel, setDepartureLabel] = useState(defaults.departureLabel);
  const [captainMessage, setCaptainMessage] = useState('');
  const [pending, setPending] = useState(false);

  const handleSubmit = async () => {
    const slots = Math.min(6, Math.max(1, Number(slotsNeeded) || 2));
    setPending(true);
    try {
      const result = await routeDirectionsApi.launchRecruitment(
        template.id,
        {
          startDate,
          endDate,
          slotsNeeded: slots,
          planningStyle,
          departureLabel: departureLabel.trim() || undefined,
          captainMessage: captainMessage.trim() || undefined,
          budgetMinCents: defaults.budgetMinCents,
          budgetMaxCents: defaults.budgetMaxCents,
        },
        template
      );
      toast.success('招募帖已创建');
      onOpenChange(false);
      navigate(result.matchSquarePath);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '发起招募失败');
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>以此模板发起招募</DialogTitle>
          <DialogDescription>
            {catalogEntry?.titleZh ?? template.nameCN ?? '路线模板'} · 将创建搭子广场招募帖
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="launch-start">出发日</Label>
              <Input
                id="launch-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="launch-end">结束日</Label>
              <Input
                id="launch-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="launch-slots">招募人数</Label>
              <Input
                id="launch-slots"
                type="number"
                min={1}
                max={6}
                value={slotsNeeded}
                onChange={(e) => setSlotsNeeded(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>组队风格</Label>
              <Select
                value={planningStyle}
                onValueChange={(v) => setPlanningStyle(v as PlanningStyle)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_managed">全托管</SelectItem>
                  <SelectItem value="co_planning">一起策划</SelectItem>
                  <SelectItem value="casual_play">一起随便玩</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="launch-departure">出发地标签</Label>
            <Input
              id="launch-departure"
              value={departureLabel}
              onChange={(e) => setDepartureLabel(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="launch-message">队长寄语（可选）</Label>
            <Textarea
              id="launch-message"
              rows={2}
              value={captainMessage}
              onChange={(e) => setCaptainMessage(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            取消
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={pending}>
            {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            发起招募
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
