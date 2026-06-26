import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CreatePostRequest, PlanningStyle, TrekActivityProfile } from '@/types/match-square';
import type { VibeLlmParseResponse } from '@/types/vibe-llm';
import {
  ITINERARY_SUMMARY_MAX,
  PLANNING_STYLE_CAPSULES,
  PLANNING_STYLE_LABELS,
  SPOTS_NEEDED_MAX,
  SPOTS_NEEDED_MIN,
  TRIP_MOOD_LABELS,
} from '../lib/constants';
import {
  CAPTAIN_MESSAGE_PLACEHOLDER,
  ITINERARY_SUMMARY_PLACEHOLDER,
} from '../lib/recruitment-copy-guide';
import { generateRecruitmentCopyFromVision } from '../lib/generate-recruitment-copy';
import {
  pickVibeSuggestionsToApply,
  type VibeFormUserEdited,
} from '../lib/vibe-llm/suggest-fields';
import {
  inferDestinationIdsFromScope,
  resolveDestinationRegions,
  resolveDestinationScopeFromIds,
} from '../lib/destination-options';
import { useMatchSquareFilterOptions } from '../hooks/useMatchSquare';
import { DestinationPicker, type DestinationSelection } from './DestinationPicker';
import { VibeIntentComposer } from './VibeIntentComposer';
import { trekBridgeHeadline } from '../lib/trek-plaza-bridge';
import { buildTrekkingOrchestrationPlan } from '../lib/trekking-orchestration';
import {
  buildRecruitmentInitialFromRouteTemplate,
  getCatalogEntryById,
  type RecruitmentCreateInitial,
} from '../lib/route-template-plaza-bridge';
import type { RouteTemplatePrimaryMatch } from '@/types/route-template-intent';
import { toast } from 'sonner';

const schema = z
  .object({
    departureLabel: z.string().optional(),
    startDate: z.string().min(1, '请选择出发日期'),
    endDate: z.string().min(1, '请选择结束日期'),
    itinerarySummary: z.string().max(ITINERARY_SUMMARY_MAX),
    budgetMin: z.number().optional(),
    budgetMax: z.number().optional(),
    slotsNeeded: z.number().min(SPOTS_NEEDED_MIN).max(SPOTS_NEEDED_MAX),
    planningStyle: z.enum(['full_managed', 'co_planning', 'casual_play'], {
      required_error: '请选择组队风格',
    }),
    preferences: z.string().optional(),
    tripMoodTag: z.enum(['relax', 'adventure', 'healing', 'social']).optional(),
    travelMode: z.enum(['self_drive', 'public_transit', 'mixed', 'other']).optional(),
    vehicleInfo: z.string().optional(),
    captainMessage: z.string().min(5, '队长寄语至少 5 字').max(200),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: '结束时间不能早于出发时间',
    path: ['endDate'],
  })
  .refine(
    (d) => (d.travelMode === 'self_drive' ? Boolean(d.vehicleInfo?.trim()) : true),
    { message: '自驾出行需填写车辆信息', path: ['vehicleInfo'] }
  );

type FormValues = z.infer<typeof schema>;

type AiFilledHints = Partial<Record<keyof VibeFormUserEdited, boolean>>;

interface RecruitmentFormProps {
  initial?: RecruitmentCreateInitial;
  autoFill?: { personaTitle?: string; reputationScore?: number; mbtiType?: string };
  onSubmit: (payload: CreatePostRequest) => Promise<void>;
  isSubmitting?: boolean;
}

export function RecruitmentForm({ initial, autoFill, onSubmit, isSubmitting }: RecruitmentFormProps) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: filterOptions } = useMatchSquareFilterOptions();
  const destinationRegions = resolveDestinationRegions(filterOptions?.destinationRegions);

  const initialDestination = initial?.destination?.trim() ?? '';
  const initialDestIds = initialDestination
    ? inferDestinationIdsFromScope(destinationRegions, initialDestination)
    : {};

  const [destination, setDestination] = useState<DestinationSelection>(() => ({
    destination: initialDestination,
    destinationScope: initial?.destination,
    destinationRegionId: initialDestIds.destinationRegionId,
    destinationSubScopeId: initialDestIds.destinationSubScopeId,
  }));
  const [destError, setDestError] = useState<string>();
  const [vibeText, setVibeText] = useState(
    initial?.vibeRawText ?? initial?.recruitmentVision ?? ''
  );
  const [userEdited, setUserEdited] = useState<VibeFormUserEdited>({
    itinerary: Boolean(initial?.itinerarySummary?.trim()),
    captain: Boolean(initial?.captainMessage?.trim()),
    planningStyle: Boolean(initial?.planningStyle),
    destination: Boolean(initialDestination),
    destinationRegion: false,
    destinationSubScope: false,
    budget: Boolean(initial?.budgetRange?.minCents != null || initial?.budgetRange?.maxCents != null),
    travelMode: Boolean(initial?.travelMode),
    tripMoodTag: Boolean(initial?.tripMoodTag),
    preferences: Boolean(initial?.preferences?.trim()),
  });
  const [aiFilled, setAiFilled] = useState<AiFilledHints>({});
  const parseRef = useRef<VibeLlmParseResponse | null>(null);
  const [debouncedVibe, setDebouncedVibe] = useState(vibeText.trim());
  const [itineraryError, setItineraryError] = useState<string>();
  const [trekLink, setTrekLink] = useState<{
    routeDirectionId?: number;
    routeDirectionName?: string | null;
    activityProfile?: TrekActivityProfile | null;
  }>(() => ({
    routeDirectionId: initial?.routeDirectionId ?? undefined,
    routeDirectionName: initial?.routeDirectionName,
    activityProfile: initial?.activityProfile ?? undefined,
  }));
  const [boundRouteTemplateCatalogId, setBoundRouteTemplateCatalogId] = useState<
    string | undefined
  >(initial?.routeTemplateCatalogId);
  const [boundOrchestration, setBoundOrchestration] = useState(
    initial?.trekkingOrchestration ?? null
  );

  const budgetMinRmb =
    initial?.budgetRange?.minCents != null
      ? Math.round(initial.budgetRange.minCents / 100)
      : undefined;
  const budgetMaxRmb =
    initial?.budgetRange?.maxCents != null
      ? Math.round(initial.budgetRange.maxCents / 100)
      : undefined;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      departureLabel: initial?.departureLabel ?? '',
      startDate: initial?.startDate ?? '',
      endDate: initial?.endDate ?? '',
      itinerarySummary: initial?.itinerarySummary ?? '',
      budgetMin: budgetMinRmb,
      budgetMax: budgetMaxRmb,
      slotsNeeded: initial?.teamStatus?.slotsNeeded ?? 1,
      planningStyle: initial?.planningStyle ?? 'co_planning',
      preferences: initial?.preferences ?? '',
      tripMoodTag: initial?.tripMoodTag ?? undefined,
      travelMode: initial?.travelMode ?? undefined,
      vehicleInfo: initial?.vehicleInfo ?? '',
      captainMessage: initial?.captainMessage ?? '',
    },
  });

  const travelMode = watch('travelMode');
  const itinerarySummary = watch('itinerarySummary') ?? '';
  const captainMessage = watch('captainMessage') ?? '';
  const slotsNeeded = watch('slotsNeeded') ?? 1;
  const budgetMin = watch('budgetMin');
  const budgetMax = watch('budgetMax');
  const planningStyle = watch('planningStyle');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedVibe(vibeText.trim()), 450);
    return () => clearTimeout(timer);
  }, [vibeText]);

  const markEdited = useCallback((field: keyof VibeFormUserEdited) => {
    setUserEdited((u) => ({ ...u, [field]: true }));
    setAiFilled((h) => ({ ...h, [field]: false }));
  }, []);

  const applyParseToForm = useCallback(
    (response: VibeLlmParseResponse | null, vision: string) => {
      if (!response) return;

      const copyFallback = generateRecruitmentCopyFromVision(vision, {
        parse: response.parse,
        personaTitle: autoFill?.personaTitle,
        mbtiType: autoFill?.mbtiType,
        destination: destination.destination,
      });

      const picked = pickVibeSuggestionsToApply({
        response: {
          suggestedItinerarySummary: response.suggestedItinerarySummary,
          suggestedCaptainMessage: response.suggestedCaptainMessage,
          suggestedPlanningStyle: response.suggestedPlanningStyle,
          suggestedFields: response.suggestedFields,
        },
        userEdited,
        destinationRegions,
        visionText: vision,
        fallbackItinerary: copyFallback?.itinerarySummary,
        fallbackCaptain: copyFallback?.captainMessage,
      });

      if (picked.itinerarySummary) setValue('itinerarySummary', picked.itinerarySummary);
      if (picked.captainMessage) setValue('captainMessage', picked.captainMessage);
      if (picked.planningStyle) setValue('planningStyle', picked.planningStyle);
      if (picked.budgetMinRmb != null) setValue('budgetMin', picked.budgetMinRmb);
      if (picked.budgetMaxRmb != null) setValue('budgetMax', picked.budgetMaxRmb);
      if (picked.travelMode) setValue('travelMode', picked.travelMode);
      if (picked.tripMoodTag) setValue('tripMoodTag', picked.tripMoodTag);
      if (picked.preferences) setValue('preferences', picked.preferences);

      if (
        picked.destinationRegionId ||
        picked.destinationSubScopeId ||
        picked.destination
      ) {
        setDestination((prev) => {
          const nextRegionId = picked.destinationRegionId ?? prev.destinationRegionId;
          const nextSubId = picked.destinationSubScopeId ?? prev.destinationSubScopeId;
          const customLabel = picked.destination ?? prev.destination;
          const scopeFromIds = resolveDestinationScopeFromIds(
            destinationRegions,
            nextRegionId,
            nextSubId,
            nextRegionId === 'custom' ? customLabel : undefined
          );
          const destLabel =
            !userEdited.destination && picked.destination
              ? picked.destination
              : !userEdited.destination && scopeFromIds
                ? scopeFromIds
                : nextRegionId === 'custom' && !userEdited.destination
                  ? customLabel
                  : prev.destination;
          return {
            ...prev,
            destinationRegionId: nextRegionId,
            destinationSubScopeId: nextSubId,
            destination: destLabel,
            destinationScope: destLabel,
            coordinates:
              picked.destinationRegionId || picked.destinationSubScopeId
                ? undefined
                : prev.coordinates,
          };
        });
      }

      setAiFilled((prev) => ({ ...prev, ...picked.filled }));
    },
    [
      autoFill?.mbtiType,
      autoFill?.personaTitle,
      destination.destination,
      destinationRegions,
      setValue,
      userEdited,
    ]
  );

  useEffect(() => {
    if (debouncedVibe.length < 10) return;
    applyParseToForm(parseRef.current, debouncedVibe);
  }, [debouncedVibe, applyParseToForm]);

  const handleVibeParse = useCallback(
    (response: VibeLlmParseResponse | null) => {
      parseRef.current = response;
      if (!response?.parse || debouncedVibe.length < 10) return;
      applyParseToForm(response, debouncedVibe);
    },
    [applyParseToForm, debouncedVibe]
  );

  const applyRouteTemplate = useCallback(
    (catalogId: string, opts?: { toast?: boolean }) => {
      const entry = getCatalogEntryById(catalogId);
      if (!entry) return;

      const patch = buildRecruitmentInitialFromRouteTemplate({
        catalogEntry: entry,
        routeDirectionId: trekLink.routeDirectionId,
        routeDirectionName: trekLink.routeDirectionName ?? undefined,
        routeTemplateId: initial?.routeTemplateId,
        vibeSeed: vibeText.trim() || undefined,
      });

      setBoundRouteTemplateCatalogId(catalogId);
      if (patch.vibeRawText) setVibeText(patch.vibeRawText);
      if (patch.destination) {
        setDestination((prev) => ({
          ...prev,
          destination: patch.destination ?? prev.destination,
          destinationScope: patch.destination ?? prev.destinationScope,
        }));
        setDestError(undefined);
      }
      if (patch.startDate) setValue('startDate', patch.startDate);
      if (patch.endDate) setValue('endDate', patch.endDate);
      if (patch.itinerarySummary) {
        setValue('itinerarySummary', patch.itinerarySummary);
        setItineraryError(undefined);
      }
      if (patch.budgetMinRmb != null) setValue('budgetMin', patch.budgetMinRmb);
      if (patch.budgetMaxRmb != null) setValue('budgetMax', patch.budgetMaxRmb);
      if (patch.slotsNeeded != null) setValue('slotsNeeded', patch.slotsNeeded);
      if (patch.planningStyle) setValue('planningStyle', patch.planningStyle);
      if (patch.trekkingOrchestration) setBoundOrchestration(patch.trekkingOrchestration);
      if (patch.routeDirectionId != null || patch.activityProfile) {
        setTrekLink((prev) => ({
          ...prev,
          routeDirectionId: patch.routeDirectionId ?? prev.routeDirectionId,
          routeDirectionName: patch.routeDirectionName ?? prev.routeDirectionName,
          activityProfile: patch.activityProfile ?? prev.activityProfile,
        }));
      }
      if (opts?.toast !== false) {
        toast.success(`已绑定路线模板《${entry.titleZh}》`);
      }
    },
    [initial?.routeTemplateId, setValue, trekLink.activityProfile, trekLink.routeDirectionId, trekLink.routeDirectionName, vibeText]
  );

  const handleConfirmRouteTemplate = useCallback(
    (match: RouteTemplatePrimaryMatch) => {
      applyRouteTemplate(match.catalogId);
    },
    [applyRouteTemplate]
  );

  useEffect(() => {
    if (initial?.autoConfirmRouteTemplate && initial.routeTemplateCatalogId) {
      applyRouteTemplate(initial.routeTemplateCatalogId, { toast: false });
      toast.success('路线模板已自动回填');
    }
    // 仅 URL 首屏预填一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autoFill?.personaTitle && !initial?.captainMessage && !vibeText && !userEdited.captain) {
      setValue('captainMessage', `我是${autoFill.personaTitle}，期待找到契合的旅伴一起出发。`);
    }
  }, [autoFill, initial, setValue, userEdited.captain, vibeText]);

  const AiBadge = ({ field }: { field: keyof VibeFormUserEdited }) =>
    aiFilled[field] && !userEdited[field] ? (
      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
        AI 根据愿景生成
      </span>
    ) : null;

  const itineraryReg = register('itinerarySummary');
  const captainReg = register('captainMessage');
  const preferencesReg = register('preferences');

  const submit = handleSubmit(async (values) => {
    const hasVibe = vibeText.trim().length >= 10;
    const dest = destination.destination.trim();

    if (!dest && !hasVibe) {
      setDestError('请选择目的地');
      return;
    }
    setDestError(undefined);

    const itinerary = values.itinerarySummary.trim();
    if (!hasVibe && itinerary.length < 10) {
      setItineraryError('行程概述至少 10 字，或填写招募愿景由 AI 生成');
      return;
    }
    setItineraryError(undefined);

    const message =
      values.captainMessage.trim().length >= 5
        ? values.captainMessage
        : vibeText.trim().slice(0, 200) || values.captainMessage;

    const trekkingOrchestration =
      parseRef.current?.trekkingOrchestration ??
      boundOrchestration ??
      buildTrekkingOrchestrationPlan({
        visionText: vibeText.trim(),
        vibeChips: parseRef.current?.parse.vibe_chips,
        activityProfile: trekLink.activityProfile ?? undefined,
        routeDirectionId: trekLink.routeDirectionId ?? null,
        routeDirectionName: trekLink.routeDirectionName ?? null,
      }) ??
      undefined;

    await onSubmit({
      destination: dest || parseRef.current?.suggestedFields?.destination?.trim() || '待定',
      departureLabel: values.departureLabel,
      startDate: values.startDate,
      endDate: values.endDate,
      itinerarySummary: itinerary || undefined,
      budgetMinCents: values.budgetMin != null ? values.budgetMin * 100 : undefined,
      budgetMaxCents: values.budgetMax != null ? values.budgetMax * 100 : undefined,
      slotsNeeded: values.slotsNeeded,
      planningStyle: values.planningStyle,
      preferences: values.preferences,
      tripMoodTag: values.tripMoodTag,
      travelMode: values.travelMode,
      vehicleInfo: values.vehicleInfo,
      captainMessage: message,
      coordinates: destination.coordinates,
      vibeFreeText: vibeText.trim() || undefined,
      vibeParse: parseRef.current?.parse,
      parseSource: parseRef.current?.parseSource,
      teamworkContractModelLabel: parseRef.current?.teamworkContractModelLabel,
      userEdited,
      routeDirectionId: trekLink.routeDirectionId,
      routeDirectionName: trekLink.routeDirectionName ?? undefined,
      activityProfile: trekLink.activityProfile ?? undefined,
      trekkingOrchestration: trekkingOrchestration ?? null,
      routeTemplateCatalogId: boundRouteTemplateCatalogId,
      routeTemplateId: initial?.routeTemplateId,
    });
  });

  const trekHeadline =
    trekLink.routeDirectionId != null
      ? trekBridgeHeadline({
          activityProfile: trekLink.activityProfile ?? null,
          routeDirectionName: trekLink.routeDirectionName ?? null,
        })
      : null;

  const boundTemplateEntry = boundRouteTemplateCatalogId
    ? getCatalogEntryById(boundRouteTemplateCatalogId)
    : undefined;

  return (
    <form onSubmit={submit} className="space-y-5">
      {boundTemplateEntry && (
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">🗺️ {boundTemplateEntry.titleZh}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            已绑定路线模板 · {boundTemplateEntry.durationDays} 日 · 里程碑与拼图槽位已按模板约束预填
          </p>
        </div>
      )}
      {trekHeadline && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">{trekHeadline}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            已从徒步路线带入愿景模板与 Hard Gates 剧本；发布后将绑定 RouteDirection #
            {trekLink.routeDirectionId}
            {trekLink.routeDirectionName ? `（${trekLink.routeDirectionName}）` : ''}
          </p>
        </div>
      )}
      {autoFill && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <span>已从 Profile 自动带入</span>
          {autoFill.personaTitle && (
            <span className="inline-flex items-center gap-1 text-foreground">
              <UserRound className="h-3.5 w-3.5" aria-hidden />
              {autoFill.personaTitle}
            </span>
          )}
          {autoFill.reputationScore != null && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Star className="h-3.5 w-3.5" aria-hidden />
              {autoFill.reputationScore.toFixed(1)}
            </span>
          )}
        </div>
      )}

      <VibeIntentComposer
        value={vibeText}
        onChange={setVibeText}
        onParseResult={handleVibeParse}
        slotsNeeded={slotsNeeded}
        captainContext={{
          mbtiType: autoFill?.mbtiType,
          personaTitle: autoFill?.personaTitle,
        }}
        formBudget={{
          min: budgetMin,
          max: budgetMax,
        }}
        initialOrchestration={boundOrchestration ?? initial?.trekkingOrchestration}
        onConfirmRouteTemplate={handleConfirmRouteTemplate}
      />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Label>目的地</Label>
          {(aiFilled.destination && !userEdited.destination) ||
          (aiFilled.destinationRegion && !userEdited.destinationRegion) ||
          (aiFilled.destinationSubScope && !userEdited.destinationSubScope) ? (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              AI 根据愿景生成
            </span>
          ) : null}
        </div>
        <DestinationPicker
          value={destination}
          destinationRegions={destinationRegions}
          onChange={(next) => {
            setDestination(next);
            setDestError(undefined);
          }}
          onRegionEdited={() => markEdited('destinationRegion')}
          onSubScopeEdited={() => markEdited('destinationSubScope')}
          onDestinationEdited={() => markEdited('destination')}
          error={destError}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="departureLabel">出发城市</Label>
        <Input id="departureLabel" {...register('departureLabel')} placeholder="如 杭州出发" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">出发时间 *</Label>
          <Input id="startDate" type="date" min={today} {...register('startDate')} />
          {errors.startDate && (
            <p className="text-xs text-destructive">{errors.startDate.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">结束时间 *</Label>
          <Input id="endDate" type="date" {...register('endDate')} />
          {errors.endDate && (
            <p className="text-xs text-destructive">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="itinerarySummary">
            行程概述{vibeText.trim().length >= 10 ? '' : ' *'}
          </Label>
          <AiBadge field="itinerary" />
        </div>
        <Textarea
          id="itinerarySummary"
          {...itineraryReg}
          onChange={(e) => {
            itineraryReg.onChange(e);
            markEdited('itinerary');
            setItineraryError(undefined);
          }}
          rows={6}
          maxLength={ITINERARY_SUMMARY_MAX}
          placeholder={ITINERARY_SUMMARY_PLACEHOLDER}
        />
        <p className="text-xs text-muted-foreground tabular-nums">
          {itinerarySummary.length}/{ITINERARY_SUMMARY_MAX}
          {vibeText.trim().length >= 10 && (
            <span className="ml-2">有招募愿景时可留空，服务端将补全</span>
          )}
        </p>
        {(errors.itinerarySummary || itineraryError) && (
          <p className="text-xs text-destructive">
            {itineraryError ?? errors.itinerarySummary?.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="budgetMin">预算下限 (RMB)</Label>
            <AiBadge field="budget" />
          </div>
          <Input
            id="budgetMin"
            type="number"
            {...register('budgetMin', {
              valueAsNumber: true,
              onChange: () => markEdited('budget'),
            })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="budgetMax">预算上限 (RMB)</Label>
          <Input
            id="budgetMax"
            type="number"
            {...register('budgetMax', {
              valueAsNumber: true,
              onChange: () => markEdited('budget'),
            })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slotsNeeded">缺人数量 *</Label>
          <Input
            id="slotsNeeded"
            type="number"
            min={SPOTS_NEEDED_MIN}
            max={SPOTS_NEEDED_MAX}
            {...register('slotsNeeded', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Label>组队风格 *</Label>
          <AiBadge field="planningStyle" />
        </div>
        <Select
          value={planningStyle}
          onValueChange={(v) => {
            markEdited('planningStyle');
            setValue('planningStyle', v as PlanningStyle);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择组队风格" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(PLANNING_STYLE_LABELS) as [PlanningStyle, string][]).map(
              ([k, label]) => (
                <SelectItem key={k} value={k}>
                  {PLANNING_STYLE_CAPSULES[k].replace('🛡️ 组队风格：', '')} · {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        {errors.planningStyle && (
          <p className="text-xs text-destructive">{errors.planningStyle.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Vibe AI 可自动推断；手动选择后将不再被覆盖
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="preferences">偏好要求</Label>
          <AiBadge field="preferences" />
        </div>
        <Textarea
          id="preferences"
          {...preferencesReg}
          onChange={(e) => {
            preferencesReg.onChange(e);
            markEdited('preferences');
          }}
          rows={2}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Label>本次状态</Label>
            <AiBadge field="tripMoodTag" />
          </div>
          <Select
            value={watch('tripMoodTag') ?? ''}
            onValueChange={(v) => {
              markEdited('tripMoodTag');
              setValue('tripMoodTag', v as FormValues['tripMoodTag']);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择标签" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TRIP_MOOD_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Label>出行方式</Label>
            <AiBadge field="travelMode" />
          </div>
          <Select
            value={travelMode ?? ''}
            onValueChange={(v) => {
              markEdited('travelMode');
              setValue('travelMode', v as FormValues['travelMode']);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择出行方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="self_drive">自驾</SelectItem>
              <SelectItem value="public_transit">公共交通</SelectItem>
              <SelectItem value="mixed">混合</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {travelMode === 'self_drive' && (
        <div className="space-y-2">
          <Label htmlFor="vehicleInfo">车辆信息 *</Label>
          <Input id="vehicleInfo" {...register('vehicleInfo')} placeholder="车型、可用剩余座位数" />
          {errors.vehicleInfo && (
            <p className="text-xs text-destructive">{errors.vehicleInfo.message}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="captainMessage">队长寄语 *</Label>
          <AiBadge field="captain" />
        </div>
        <p className="text-xs text-muted-foreground">
          情感化短信，放详情页底部 — 与上方「招募愿景」不要写重复内容
        </p>
        <Textarea
          id="captainMessage"
          {...captainReg}
          onChange={(e) => {
            captainReg.onChange(e);
            markEdited('captain');
          }}
          rows={3}
          maxLength={200}
          placeholder={CAPTAIN_MESSAGE_PLACEHOLDER}
        />
        <p className="text-xs text-muted-foreground tabular-nums">{captainMessage.length}/200</p>
        {errors.captainMessage && (
          <p className="text-xs text-destructive">{errors.captainMessage.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? '发布中…' : '发布招募'}
      </Button>
    </form>
  );
}
