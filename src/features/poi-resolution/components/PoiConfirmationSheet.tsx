import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { confirmPoiResolution, resolvePoi } from '@/features/poi-resolution/api/client';
import { formatConfidencePercent } from '@/features/poi-resolution/api/helpers';
import type { ConfirmPoiResponse, PoiResolveCandidate, ResolvedPoi } from '@/features/poi-resolution/types';

const DEFAULT_COUNTRY = 'IS';
const DEFAULT_LOCALE = 'zh';

interface PoiConfirmationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poi: ResolvedPoi | null;
  accessToken?: string | null;
  countryCode?: string;
  locale?: string;
  onConfirmed: (result: ConfirmPoiResponse, originalPoi: ResolvedPoi) => void;
}

export function PoiConfirmationSheet({
  open,
  onOpenChange,
  poi,
  accessToken,
  countryCode = DEFAULT_COUNTRY,
  locale = DEFAULT_LOCALE,
  onConfirmed,
}: PoiConfirmationSheetProps) {
  const [candidates, setCandidates] = useState<PoiResolveCandidate[]>([]);
  const [selectedPoiId, setSelectedPoiId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadCandidates = useCallback(async () => {
    if (!poi) return;
    if (poi.candidates?.length) {
      setCandidates(poi.candidates);
      setSelectedPoiId(poi.candidates[0]?.poiId ?? '');
      return;
    }
    setLoading(true);
    try {
      const result = await resolvePoi({ name: poi.name, countryCode, locale });
      const list = result.candidates ?? [];
      setCandidates(list);
      setSelectedPoiId(list[0]?.poiId ?? '');
    } catch (err) {
      console.warn('[PoiConfirmationSheet] resolve failed', err);
      setCandidates([]);
      setSelectedPoiId('');
    } finally {
      setLoading(false);
    }
  }, [poi, countryCode, locale]);

  useEffect(() => {
    if (open && poi) {
      void loadCandidates();
    } else {
      setCandidates([]);
      setSelectedPoiId('');
    }
  }, [open, poi, loadCandidates]);

  const handleConfirm = async () => {
    if (!poi || !selectedPoiId) return;
    if (!accessToken) {
      toast.error('请先登录后再确认地点');
      return;
    }
    setSubmitting(true);
    try {
      const result = await confirmPoiResolution(accessToken, {
        queryName: poi.name,
        selectedPoiId,
        countryCode,
        locale,
      });
      onConfirmed(result, poi);
      onOpenChange(false);
      toast.success('已验证，下次将直接命中');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '确认失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] flex flex-col rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-base">
            「{poi?.name ?? ''}」请选择正确地点
          </SheetTitle>
          <SheetDescription className="text-xs">
            确认后将写入你的偏好，下次相同名称将直接命中官方 POI。
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <p className="text-xs text-muted-foreground inline-flex items-center gap-2 py-6 justify-center w-full">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              正在加载候选地点…
            </p>
          ) : candidates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">暂未收录，反馈给我们</p>
              <p className="text-[11px] text-muted-foreground/80 mt-1">
                不影响路线对比，你可继续浏览并选择路线。
              </p>
            </div>
          ) : (
            <RadioGroup value={selectedPoiId} onValueChange={setSelectedPoiId} className="space-y-2">
              {candidates.map((candidate) => (
                <label
                  key={candidate.poiId}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors',
                    selectedPoiId === candidate.poiId
                      ? 'border-foreground/30 bg-muted/30'
                      : 'border-border hover:border-foreground/15',
                  )}
                >
                  <RadioGroupItem value={candidate.poiId} id={candidate.poiId} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <Label htmlFor={candidate.poiId} className="text-sm font-medium cursor-pointer">
                      {candidate.canonicalName ?? candidate.poiId}
                    </Label>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {candidate.slug ?? candidate.poiId}
                      {candidate.confidence != null ? (
                        <span className="ml-2 font-sans">
                          {formatConfidencePercent(candidate.confidence)}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          )}
        </div>

        <SheetFooter className="pt-2">
          <Button
            type="button"
            className="w-full"
            disabled={!selectedPoiId || submitting || candidates.length === 0}
            onClick={() => void handleConfirm()}
          >
            {submitting ? '确认中…' : '确认'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
