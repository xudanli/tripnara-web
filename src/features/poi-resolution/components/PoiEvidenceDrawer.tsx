import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { resolvePoi } from '@/features/poi-resolution/api/client';
import {
  formatConfidencePercent,
  formatEvidenceChain,
} from '@/features/poi-resolution/api/helpers';
import type { PoiEvidenceStep, ResolvedPoi } from '@/features/poi-resolution/types';

const DEFAULT_COUNTRY = 'IS';

interface PoiEvidenceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poi: ResolvedPoi | null;
  countryCode?: string;
}

export function PoiEvidenceDrawer({
  open,
  onOpenChange,
  poi,
  countryCode = DEFAULT_COUNTRY,
}: PoiEvidenceDrawerProps) {
  const [evidence, setEvidence] = useState<PoiEvidenceStep[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEvidence = useCallback(async () => {
    if (!poi) return;
    if (poi.evidence?.length) {
      setEvidence(poi.evidence);
      return;
    }
    setLoading(true);
    try {
      const result = await resolvePoi({ name: poi.name, countryCode });
      setEvidence(result.evidence ?? []);
    } catch (err) {
      console.warn('[PoiEvidenceDrawer] lazy resolve failed', err);
      setEvidence([]);
    } finally {
      setLoading(false);
    }
  }, [poi, countryCode]);

  useEffect(() => {
    if (open && poi) {
      void loadEvidence();
    } else {
      setEvidence([]);
    }
  }, [open, poi, loadEvidence]);

  const steps = formatEvidenceChain(evidence);
  const displayName = poi?.canonicalName ?? poi?.name ?? '';
  const confidenceLabel = formatConfidencePercent(poi?.confidence);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-base">{displayName}</SheetTitle>
          <SheetDescription className="sr-only">地点解析依据</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              加载解析依据…
            </p>
          ) : steps.length === 0 ? (
            <p className="text-xs text-muted-foreground">暂无解析依据</p>
          ) : (
            <dl className="space-y-3">
              {steps.map((step, index) => (
                <div key={`${step.title}-${index}`} className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-0.5">
                  <dt className="text-xs text-muted-foreground">{step.title}</dt>
                  <dd className="text-xs text-foreground leading-snug">{step.subtitle || '—'}</dd>
                </div>
              ))}
              {poi?.confidence != null ? (
                <div className="grid grid-cols-[5.5rem_1fr] gap-x-3 pt-2 border-t border-border">
                  <dt className="text-xs text-muted-foreground">可信度</dt>
                  <dd className="text-xs font-semibold">{confidenceLabel}</dd>
                </div>
              ) : null}
            </dl>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
