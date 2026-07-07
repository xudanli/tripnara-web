import { useEffect, useState } from 'react';
import type { AttractionExploreCandidate } from '@/types/attraction-explore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ArrangeItineraryAddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayNumber: number;
  candidates: AttractionExploreCandidate[];
  submitting?: boolean;
  onSubmit: (payload: {
    candidateId?: string;
    placeId?: number;
    startTime?: string;
    endTime?: string;
    note?: string;
  }) => void;
}

export function ArrangeItineraryAddItemDialog({
  open,
  onOpenChange,
  dayNumber,
  candidates,
  submitting = false,
  onSubmit,
}: ArrangeItineraryAddItemDialogProps) {
  const [candidateId, setCandidateId] = useState('');
  const [startTime, setStartTime] = useState('10:30');
  const [endTime, setEndTime] = useState('12:00');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setCandidateId(candidates[0]?.id ?? '');
    setStartTime('10:30');
    setEndTime('12:00');
    setNote('');
  }, [open, dayNumber, candidates]);

  const selectedCandidate = candidates.find((item) => item.id === candidateId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加活动 · 第 {dayNumber} 天</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {candidates.length > 0 ? (
            <div className="space-y-1.5">
              <Label>候选景点</Label>
              <Select value={candidateId} onValueChange={setCandidateId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择候选" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">暂无候选景点，请先在探索景点中添加。</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="item-start">开始</Label>
              <Input
                id="item-start"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-end">结束</Label>
              <Input
                id="item-end"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item-note">备注</Label>
            <Input
              id="item-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="可选"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            disabled={submitting || !selectedCandidate}
            onClick={() =>
              onSubmit({
                candidateId: selectedCandidate?.id,
                placeId:
                  selectedCandidate?.placeId != null
                    ? Number(selectedCandidate.placeId)
                    : undefined,
                startTime,
                endTime,
                note: note.trim() || undefined,
              })
            }
          >
            {submitting ? '添加中…' : '添加活动'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
