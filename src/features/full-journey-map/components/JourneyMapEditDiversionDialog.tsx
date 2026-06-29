import { useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { patchSplitPlan, type PatchSplitPlanRequest } from '@/api/split-plans';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { JourneyInspectorDiversionDetail } from '../types-inspector-view';
import type { JourneyDiversion } from '../types';
import { journeyMapFocusRing } from '../journey-map-ui';

export interface JourneyMapEditDiversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  diversion: JourneyDiversion;
  detail: JourneyInspectorDiversionDetail;
  constraintsVersion?: number;
  onSaved?: () => void;
}

export function JourneyMapEditDiversionDialog({
  open,
  onOpenChange,
  tripId,
  diversion,
  detail,
  constraintsVersion,
  onSaved,
}: JourneyMapEditDiversionDialogProps) {
  const [meetingPoint, setMeetingPoint] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [transport, setTransport] = useState('');
  const [emergencyNote, setEmergencyNote] = useState('');
  const [groupALabel, setGroupALabel] = useState('');
  const [groupBLabel, setGroupBLabel] = useState('');
  const [rejoinPlace, setRejoinPlace] = useState('');
  const [rejoinTime, setRejoinTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMeetingPoint(detail.meetingPoint ?? '');
    setMeetingTime(detail.meetingTime ?? '');
    setEmergencyContact(detail.emergencyContact ?? '');
    setEmergencyNote(detail.emergencyNote ?? '');
    setTransport(detail.groupA.transport ?? detail.groupB.transport ?? '');
    setGroupALabel(detail.groupA.label);
    setGroupBLabel(detail.groupB.label);
    setRejoinPlace(diversion.merge?.label ?? '');
    setRejoinTime(diversion.merge?.time ?? detail.meetingTime ?? '');
  }, [open, detail, diversion.merge]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const body: PatchSplitPlanRequest = {
        constraintsVersion,
        logistics: {
          meetupPoint: meetingPoint.trim() || undefined,
          meetupTime: meetingTime.trim() || undefined,
          emergencyContact: emergencyContact.trim() || undefined,
          transport: transport.trim() || undefined,
        },
        groups: [
          { id: 'grp_a', label: groupALabel.trim() || diversion.groupA.label },
          { id: 'grp_b', label: groupBLabel.trim() || diversion.groupB.label },
        ],
        daySplit: {
          title: diversion.title,
          stats: { meetupTime: meetingTime.trim() || undefined },
          rejoin: {
            placeName: rejoinPlace.trim() || undefined,
            startTime: rejoinTime.trim() || undefined,
          },
        },
        emergencyNote: emergencyNote.trim() || undefined,
      };

      await patchSplitPlan(tripId, diversion.id, body);
      toast.success('分流方案已保存');
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存分流方案失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑分流</DialogTitle>
          <DialogDescription>{diversion.title}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          <Field label="集合点" id="meetup-point">
            <Input
              id="meetup-point"
              value={meetingPoint}
              onChange={(e) => setMeetingPoint(e.target.value)}
              placeholder="瓦特纳冰川停车场"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="集合时间" id="meetup-time">
              <Input
                id="meetup-time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                placeholder="13:30"
              />
            </Field>
            <Field label="交通方式" id="transport">
              <Input
                id="transport"
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
                placeholder="超级吉普"
              />
            </Field>
          </div>
          <Field label="应急联系" id="emergency-contact">
            <Input
              id="emergency-contact"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="+354 777 1234"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="A 组标签" id="group-a">
              <Input id="group-a" value={groupALabel} onChange={(e) => setGroupALabel(e.target.value)} />
            </Field>
            <Field label="B 组标签" id="group-b">
              <Input id="group-b" value={groupBLabel} onChange={(e) => setGroupBLabel(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="汇合地点" id="rejoin-place">
              <Input
                id="rejoin-place"
                value={rejoinPlace}
                onChange={(e) => setRejoinPlace(e.target.value)}
              />
            </Field>
            <Field label="汇合时间" id="rejoin-time">
              <Input
                id="rejoin-time"
                value={rejoinTime}
                onChange={(e) => setRejoinTime(e.target.value)}
              />
            </Field>
          </div>
          <Field label="应急说明" id="emergency-note">
            <Textarea
              id="emergency-note"
              value={emergencyNote}
              onChange={(e) => setEmergencyNote(e.target.value)}
              rows={3}
              placeholder="天气变化时优先联系向导"
            />
          </Field>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            type="button"
            className={journeyMapFocusRing}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {children}
    </div>
  );
}
