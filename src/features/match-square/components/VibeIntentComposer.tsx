import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Wand2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useVibeLlmParse } from '../hooks/useVibeLlmParse';
import { VibeChipStream } from './VibeChipStream';
import { VibePuzzlePreview } from './VibePuzzlePreview';
import { VibeHardGatesPreview } from './VibeHardGatesPreview';
import { TrekkingOrchestrationPanel } from './TrekkingOrchestrationPanel';
import { RouteTemplateMatchPanel } from './RouteTemplateMatchPanel';
import type { VibeLlmParseResponse } from '@/types/vibe-llm';
import type { TrekkingVibeOrchestrationPlan } from '@/types/trekking-vibe-orchestration';
import type { RouteTemplatePrimaryMatch } from '@/types/route-template-intent';
import { filterExperienceChips } from '../lib/filter-experience-chips';
import { PLANNING_STYLE_LABELS } from '../lib/constants';
import { VISION_COMPOSER_PLACEHOLDER } from '../lib/recruitment-copy-guide';
import { teamworkModelToPlanningStyle } from '@/types/vibe-llm';

interface VibeIntentComposerProps {
  value: string;
  onChange: (text: string) => void;
  onParseResult?: (result: VibeLlmParseResponse | null) => void;
  slotsNeeded?: number;
  captainContext?: { mbtiType?: string; personaTitle?: string };
  formBudget?: { min?: number; max?: number };
  /** 徒步入口预填编排 — 解析完成前即时预览 */
  initialOrchestration?: TrekkingVibeOrchestrationPlan | null;
  onConfirmRouteTemplate?: (match: RouteTemplatePrimaryMatch) => void;
  className?: string;
}

const PLACEHOLDER = VISION_COMPOSER_PLACEHOLDER;

/** Vibe LLM Engine · 发布页招募愿景输入 → recruitmentVision */
export function VibeIntentComposer({
  value,
  onChange,
  onParseResult,
  slotsNeeded = 1,
  captainContext,
  formBudget,
  initialOrchestration,
  onConfirmRouteTemplate,
  className,
}: VibeIntentComposerProps) {
  const {
    parse,
    parseResponse,
    isParsing,
    isStale,
    teamworkContractModelLabel,
    suggestedPlanningStyle,
    isLiveLlm,
    isRuleMock: _isRuleMock,
    isError,
    error,
  } = useVibeLlmParse(value, {
    slotsNeeded,
    captainContext,
    minLength: 10,
  });

  useEffect(() => {
    onParseResult?.(parseResponse);
  }, [parseResponse, onParseResult]);

  const planningStyle =
    suggestedPlanningStyle ??
    (parse ? teamworkModelToPlanningStyle(parse.teamwork_contract_model) : null);

  const chipLabels = filterExperienceChips(
    parse?.vibe_chips.map((label, i) => ({
      id: `chip_${i}`,
      label,
    })) ?? []
  ).map((chip) => chip.label);

  const orchestrationPlan =
    parseResponse?.trekkingOrchestration ?? initialOrchestration ?? null;

  const templateAugmentedSlots = [
    ...(parse?.slot_definitions ?? []),
    ...(parseResponse?.routeTemplateMatch?.primaryMatch?.slotAugmentations ?? []).map(
      (s, i) => ({
        slot_id: 900 + i,
        expected_tag: s.expectedTagSuffix,
        reason: s.reason,
      })
    ),
  ];

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="vibe-intent" className="flex items-center gap-1.5 text-base font-medium">
          <Wand2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          招募愿景 · 怎么玩、要什么人
        </Label>
        {(isParsing || isStale) && value.trim().length >= 10 && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            {isParsing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                AI 解析中…
              </>
            ) : (
              '待同步…'
            )}
          </span>
        )}
        {!isParsing && parse && (
          <span
            className={cn(
              'rounded-md px-1.5 py-0.5 text-[10px] font-medium',
              isLiveLlm
                ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {isLiveLlm ? 'Live LLM' : '规则预览'}
          </span>
        )}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-muted/20 to-background shadow-sm">
        <Textarea
          id="vibe-intent"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          maxLength={800}
          placeholder={PLACEHOLDER}
          className="min-h-[120px] resize-none border-0 bg-transparent px-4 py-3 text-[15px] leading-relaxed shadow-none focus-visible:ring-0"
        />
        <div className="border-t border-border/60 bg-muted/20 px-4 py-3">
          <VibeChipStream chips={chipLabels} tone="accent" />
          {!parse && value.trim().length < 10 && (
            <p className="text-xs text-muted-foreground">
              继续输入，标签将如呼吸般自然滑出
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {parse?.contract_hint && (
          <motion.p
            key={parse.contract_hint}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[11px] leading-relaxed text-muted-foreground"
          >
            {parse.contract_hint}
          </motion.p>
        )}
      </AnimatePresence>

      {isError && value.trim().length >= 10 && (
        <p className="text-[11px] text-destructive">
          {(error as { message?: string })?.message?.includes('认证') ||
          (error as { code?: string })?.code === 'UNAUTHORIZED'
            ? '请先登录后再使用 AI 解析；未登录时无法调用后端 LLM。'
            : 'AI 解析失败，请稍后重试。'}
        </p>
      )}

      {planningStyle && teamworkContractModelLabel && !isError && (
        <p className="text-xs text-muted-foreground">
          组队风格：
          <span className="ml-1 font-medium text-foreground">
            {PLANNING_STYLE_LABELS[planningStyle] ?? teamworkContractModelLabel}
          </span>
        </p>
      )}

      {parse?.hard_gates && (
        <VibeHardGatesPreview hardGates={parse.hard_gates} formBudget={formBudget} />
      )}

      {orchestrationPlan && (
        <TrekkingOrchestrationPanel
          plan={orchestrationPlan}
          visionText={value}
          variant="preview"
        />
      )}

      {parseResponse?.routeTemplateMatch?.primaryMatch && (
        <RouteTemplateMatchPanel
          plan={parseResponse.routeTemplateMatch}
          variant="preview"
          onConfirmTemplate={onConfirmRouteTemplate}
        />
      )}

      {parse &&
        (parse.slot_definitions.length > 0 ||
          (parseResponse?.routeTemplateMatch?.primaryMatch?.slotAugmentations?.length ?? 0) >
            0) && (
          <VibePuzzlePreview slots={templateAugmentedSlots} slotsNeeded={slotsNeeded} />
        )}

      <p className="text-[10px] text-muted-foreground/80">
        保存为 recruitmentVision；下方「行程概述」「队长寄语」将随愿景 AI 自动草稿（可改）
      </p>
    </div>
  );
}
