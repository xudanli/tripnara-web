import { useState } from 'react';
import { ChevronDown, Compass } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  extractExperienceExplanation,
  extractExperienceUnderstanding,
  hasExperienceIntentMetadata,
} from '@/lib/trip-experience-metadata.util';
import type {
  ExperienceExplanationCard,
  TravelUnderstandingCard as TravelUnderstandingCardData,
} from '@/types/experience-fulfillment';
import { ExperienceExplanationCardView } from './ExperienceExplanationCard';
import { TravelUnderstandingCard } from './TravelUnderstandingCard';

interface TripExperienceIntentPanelProps {
  /** 直接传入理解卡 / 解释卡（优先于 metadata） */
  experienceUnderstanding?: TravelUnderstandingCardData;
  experienceExplanation?: ExperienceExplanationCard;
  /** trip.metadata 或等价对象 */
  metadata?: Record<string, unknown> | null;
  className?: string;
  /** 默认展开（规划工作台推荐 true） */
  defaultOpen?: boolean;
}

export function TripExperienceIntentPanel({
  experienceUnderstanding: understandingProp,
  experienceExplanation: explanationProp,
  metadata,
  className,
  defaultOpen = true,
}: TripExperienceIntentPanelProps) {
  const understanding =
    understandingProp ?? extractExperienceUnderstanding(metadata ?? undefined);
  const explanation =
    explanationProp ?? extractExperienceExplanation(metadata ?? undefined);

  const [open, setOpen] = useState(defaultOpen);

  if (!understanding && !explanation) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <Card className="border-slate-200 shadow-sm">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left rounded-t-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Compass className="h-4 w-4 text-slate-600" aria-hidden />
                    当初为什么这样规划
                  </CardTitle>
                  <CardDescription className="mt-1">
                    创建行程时的体验目标与推荐理由
                  </CardDescription>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform',
                    open && 'rotate-180',
                  )}
                  aria-hidden
                />
              </div>
            </CardHeader>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {understanding && <TravelUnderstandingCard data={understanding} />}
            {explanation && (
              <ExperienceExplanationCardView data={explanation} compact />
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/** 判断 trip 是否应展示体验意图面板 */
export function shouldShowTripExperienceIntentPanel(
  metadata?: Record<string, unknown> | null,
): boolean {
  return hasExperienceIntentMetadata(metadata);
}
