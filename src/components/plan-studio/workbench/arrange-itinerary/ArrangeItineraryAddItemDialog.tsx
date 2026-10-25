import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Star } from 'lucide-react';
import type { AttractionExploreCandidate } from '@/types/attraction-explore';
import type { TravelProductSession } from '@/types/travel-products';
import { travelProductsApi } from '@/api/travel-products';
import {
  buildTravelProductActivityNote,
  buildTravelProductActivityWindow,
  formatTravelProductOfferingSubtitle,
  isBookableTravelProductSession,
  resolvePlaceExperienceRow,
  travelProductDayHmToUtcIso,
} from '@/lib/travel-product-catalog.util';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { cn } from '@/lib/utils';

export type ArrangeAddItemSource = 'candidate' | 'experience';

export interface ArrangeItineraryAddItemSubmitPayload {
  source: ArrangeAddItemSource;
  candidateId?: string;
  placeId?: number;
  startTime?: string;
  endTime?: string;
  note?: string;
  /** 体验项目（不强制 Offering） */
  experienceDefinitionId?: string;
  experienceName?: string;
  startTimeIso?: string;
  endTimeIso?: string;
  /** 可选升格：有货再绑 Offering / Session */
  productOfferingId?: string;
  productSessionId?: string;
  travelFromPreviousDuration?: number;
  upgradeSession?: boolean;
}

export interface ArrangeItineraryAddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayNumber: number;
  /** YYYY-MM-DD */
  dayDate?: string | null;
  /** 目的地时区，无班次时拼 ISO */
  timezone?: string | null;
  countryCode?: string | null;
  candidates: AttractionExploreCandidate[];
  submitting?: boolean;
  initialStartTime?: string;
  initialEndTime?: string;
  initialNote?: string;
  parallelHint?: string;
  onSubmit: (payload: ArrangeItineraryAddItemSubmitPayload) => void;
}

type SourceTab = 'candidate' | 'experience';

function sessionPriceLabel(session: TravelProductSession): string | null {
  const plan = session.ratePlans?.[0];
  if (!plan || plan.amount == null) return null;
  const amount =
    typeof plan.amount === 'number' ? plan.amount.toLocaleString() : String(plan.amount);
  return `${plan.currency ?? ''} ${amount}`.trim();
}

export function ArrangeItineraryAddItemDialog({
  open,
  onOpenChange,
  dayNumber,
  dayDate,
  timezone,
  countryCode,
  candidates,
  submitting = false,
  initialStartTime,
  initialEndTime,
  initialNote,
  parallelHint,
  onSubmit,
}: ArrangeItineraryAddItemDialogProps) {
  const [sourceTab, setSourceTab] = useState<SourceTab>('candidate');
  const [candidateId, setCandidateId] = useState('');
  const [startTime, setStartTime] = useState('10:30');
  const [endTime, setEndTime] = useState('12:00');
  const [note, setNote] = useState('');

  const [placeIdForExperience, setPlaceIdForExperience] = useState<string>('');
  const [selectedExperienceId, setSelectedExperienceId] = useState<string | null>(null);
  const [wantUpgrade, setWantUpgrade] = useState(false);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [arriveLocal, setArriveLocal] = useState('');
  const [hasFallbackPlan, setHasFallbackPlan] = useState(false);
  const [travelMinutes, setTravelMinutes] = useState('45');

  const resolvedCountry = (countryCode ?? 'IS').trim().toUpperCase() || 'IS';
  const sessionDate = dayDate?.slice(0, 10) || undefined;
  const placeCandidates = useMemo(
    () =>
      candidates.filter(
        (c) => c.placeId != null && String(c.placeId).trim() !== '' && !Number.isNaN(Number(c.placeId)),
      ),
    [candidates],
  );

  useEffect(() => {
    if (!open) return;
    const defaultPlace = placeCandidates[0];
    setSourceTab(placeCandidates.length > 0 ? 'experience' : candidates.length ? 'candidate' : 'experience');
    setCandidateId(candidates[0]?.id ?? '');
    setStartTime(initialStartTime ?? '10:30');
    setEndTime(initialEndTime ?? '12:00');
    setNote(initialNote ?? '');
    setPlaceIdForExperience(defaultPlace?.placeId != null ? String(defaultPlace.placeId) : '');
    setSelectedExperienceId(null);
    setWantUpgrade(false);
    setSelectedOfferingId(null);
    setSelectedSessionId(null);
    setArriveLocal('');
    setHasFallbackPlan(false);
    setTravelMinutes('45');
  }, [
    open,
    dayNumber,
    candidates,
    placeCandidates,
    initialStartTime,
    initialEndTime,
    initialNote,
  ]);

  const placeExperiencesQuery = useQuery({
    queryKey: ['travel-products', 'place-experiences', placeIdForExperience],
    queryFn: () => travelProductsApi.listPlaceExperiences(placeIdForExperience),
    enabled: open && sourceTab === 'experience' && Boolean(placeIdForExperience),
  });

  const placeExperienceRows = useMemo(() => {
    const items = placeExperiencesQuery.data?.items ?? [];
    return items
      .map((item) => resolvePlaceExperienceRow(item))
      .filter((row): row is NonNullable<typeof row> => row != null)
      .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
  }, [placeExperiencesQuery.data?.items]);

  /** 地点未挂体验时：退回国家 Catalog，仍用当前 placeId 创建 */
  const countryExperiencesQuery = useQuery({
    queryKey: ['travel-products', 'experiences', resolvedCountry, 'fallback'],
    queryFn: () =>
      travelProductsApi.listExperiences({
        countryCode: resolvedCountry,
        productType: 'ACTIVITY_EXPERIENCE',
        limit: 40,
      }),
    enabled:
      open &&
      sourceTab === 'experience' &&
      Boolean(placeIdForExperience) &&
      placeExperiencesQuery.isSuccess &&
      placeExperienceRows.length === 0,
  });

  const fallbackRows = useMemo(() => {
    return (countryExperiencesQuery.data ?? [])
      .map((exp) =>
        resolvePlaceExperienceRow({
          experienceDefinitionId: exp.id,
          displayNameZh: exp.displayNameZh,
          displayNameEn: exp.displayNameEn,
          isFeatured: false,
          experience: exp,
        }),
      )
      .filter((row): row is NonNullable<typeof row> => row != null);
  }, [countryExperiencesQuery.data]);

  const experienceRows =
    placeExperienceRows.length > 0 ? placeExperienceRows : fallbackRows;
  const usingCountryFallback =
    placeExperienceRows.length === 0 && fallbackRows.length > 0;

  const selectedExperience =
    experienceRows.find((row) => row.experienceDefinitionId === selectedExperienceId) ?? null;

  const offeringsQuery = useQuery({
    queryKey: ['travel-products', 'offerings-by-exp', selectedExperienceId],
    queryFn: () =>
      travelProductsApi.listOfferings({
        experienceDefinitionId: selectedExperienceId!,
        countryCode: resolvedCountry,
        limit: 20,
      }),
    enabled: open && sourceTab === 'experience' && Boolean(selectedExperienceId) && wantUpgrade,
  });

  const offerings = offeringsQuery.data ?? [];
  const selectedOffering = offerings.find((o) => o.id === selectedOfferingId) ?? null;

  const sessionsQuery = useQuery({
    queryKey: ['travel-products', 'sessions', selectedOfferingId, sessionDate],
    queryFn: () =>
      travelProductsApi.listSessions(selectedOfferingId!, { date: sessionDate }),
    enabled:
      open &&
      sourceTab === 'experience' &&
      wantUpgrade &&
      Boolean(selectedOfferingId) &&
      Boolean(sessionDate),
  });

  const sessions = (sessionsQuery.data ?? []).filter(isBookableTravelProductSession);
  const selectedSession = sessions.find((s) => s.id === selectedSessionId) ?? null;

  useEffect(() => {
    if (!selectedSession?.meetTimeLocal) return;
    setArriveLocal(selectedSession.meetTimeLocal);
  }, [selectedSessionId, selectedSession?.meetTimeLocal]);

  useEffect(() => {
    if (!selectedExperience?.typicalDurationMin || selectedSession) return;
    // 无班次时按典型时长粗估结束时间
    const [h, m] = startTime.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return;
    const endTotal = h * 60 + m + selectedExperience.typicalDurationMin;
    const eh = Math.floor(endTotal / 60) % 24;
    const em = endTotal % 60;
    setEndTime(`${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`);
  }, [selectedExperienceId, selectedExperience?.typicalDurationMin]);

  const selectedCandidate = candidates.find((item) => item.id === candidateId);
  const canSubmitCandidate = Boolean(selectedCandidate) && Boolean(startTime) && Boolean(endTime);

  const canSubmitExperience = (() => {
    if (!placeIdForExperience || !selectedExperienceId || !sessionDate) return false;
    if (wantUpgrade && selectedSession) {
      const window = buildTravelProductActivityWindow(selectedSession);
      return Boolean(window.startTimeIso && window.endTimeIso && selectedOfferingId);
    }
    return Boolean(
      travelProductDayHmToUtcIso({
        dayDate: sessionDate,
        hm: startTime,
        timezone,
      }) &&
        travelProductDayHmToUtcIso({
          dayDate: sessionDate,
          hm: endTime,
          timezone,
        }),
    );
  })();

  const handleSubmit = () => {
    if (sourceTab === 'candidate') {
      if (!selectedCandidate) return;
      onSubmit({
        source: 'candidate',
        candidateId: selectedCandidate.id,
        placeId:
          selectedCandidate.placeId != null ? Number(selectedCandidate.placeId) : undefined,
        startTime,
        endTime,
        note: note.trim() || undefined,
      });
      return;
    }

    if (!selectedExperience || !placeIdForExperience || !sessionDate) return;
    const placeId = Number(placeIdForExperience);
    if (!Number.isFinite(placeId)) return;

    if (wantUpgrade && selectedSession && selectedOfferingId) {
      const window = buildTravelProductActivityWindow(selectedSession);
      if (!window.startTimeIso || !window.endTimeIso) return;
      const travel = Number(travelMinutes);
      onSubmit({
        source: 'experience',
        placeId,
        experienceDefinitionId: selectedExperience.experienceDefinitionId,
        experienceName: selectedExperience.displayNameZh,
        productOfferingId: selectedOfferingId,
        productSessionId: selectedSession.id,
        startTimeIso: window.startTimeIso,
        endTimeIso: window.endTimeIso,
        travelFromPreviousDuration:
          Number.isFinite(travel) && travel > 0 ? travel : undefined,
        note: buildTravelProductActivityNote({
          arriveLocal: arriveLocal || selectedSession.meetTimeLocal,
          hasFallbackPlan,
        }),
        upgradeSession: true,
      });
      return;
    }

    const startTimeIso = travelProductDayHmToUtcIso({
      dayDate: sessionDate,
      hm: startTime,
      timezone,
    });
    const endTimeIso = travelProductDayHmToUtcIso({
      dayDate: sessionDate,
      hm: endTime,
      timezone,
    });
    if (!startTimeIso || !endTimeIso) return;

    onSubmit({
      source: 'experience',
      placeId,
      experienceDefinitionId: selectedExperience.experienceDefinitionId,
      experienceName: selectedExperience.displayNameZh,
      startTimeIso,
      endTimeIso,
      note: note.trim() || undefined,
      upgradeSession: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-border/50 px-1 pb-3">
          <DialogTitle>
            {parallelHint ? '添加并行活动' : '添加活动'} · 第 {dayNumber} 天
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-3">
          {parallelHint ? (
            <p className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
              {parallelHint}
            </p>
          ) : null}

          <div className="flex gap-1 rounded-lg border border-border/60 bg-muted/20 p-1">
            <button
              type="button"
              className={cn(
                'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                sourceTab === 'candidate'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setSourceTab('candidate')}
            >
              候选景点
            </button>
            <button
              type="button"
              className={cn(
                'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                sourceTab === 'experience'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setSourceTab('experience')}
            >
              体验项目
            </button>
          </div>

          {sourceTab === 'candidate' ? (
            <>
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
                <p className="text-xs text-muted-foreground">
                  暂无候选景点。可切到「体验项目」，或先去探索景点。
                </p>
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
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>关联地点</Label>
                {placeCandidates.length > 0 ? (
                  <Select
                    value={placeIdForExperience}
                    onValueChange={(value) => {
                      setPlaceIdForExperience(value);
                      setSelectedExperienceId(null);
                      setWantUpgrade(false);
                      setSelectedOfferingId(null);
                      setSelectedSessionId(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择地点" />
                    </SelectTrigger>
                    <SelectContent>
                      {placeCandidates.map((candidate) => (
                        <SelectItem
                          key={candidate.id}
                          value={String(candidate.placeId)}
                        >
                          {candidate.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-1.5">
                    <Input
                      inputMode="numeric"
                      placeholder="输入 placeId（如 381081）"
                      value={placeIdForExperience}
                      onChange={(event) => {
                        setPlaceIdForExperience(event.target.value.trim());
                        setSelectedExperienceId(null);
                      }}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      暂无候选地点时，可手动填 Place ID（集合点 / 活动锚点）
                    </p>
                  </div>
                )}
              </div>

              {!placeIdForExperience ? (
                <p className="text-xs text-muted-foreground">请先选择地点</p>
              ) : placeExperiencesQuery.isLoading ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  加载地点体验…
                </p>
              ) : placeExperiencesQuery.isError ? (
                <p className="text-xs text-destructive">
                  {placeExperiencesQuery.error instanceof Error
                    ? placeExperiencesQuery.error.message
                    : '加载体验失败'}
                </p>
              ) : (
                <div className="space-y-1.5">
                  <Label>
                    体验项目
                    {usingCountryFallback ? (
                      <span className="ml-1 font-normal text-muted-foreground">
                        · 本地点暂无挂载，已显示国家 Catalog
                      </span>
                    ) : null}
                  </Label>
                  {experienceRows.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {countryExperiencesQuery.isLoading
                        ? '加载 Catalog…'
                        : '暂无可用体验项目'}
                    </p>
                  ) : (
                    <ul className="max-h-44 space-y-1.5 overflow-y-auto rounded-md border border-border/60 p-1.5">
                      {experienceRows.map((row) => {
                        const selected = selectedExperienceId === row.experienceDefinitionId;
                        return (
                          <li key={row.experienceDefinitionId}>
                            <button
                              type="button"
                              className={cn(
                                'w-full rounded-md border px-2.5 py-2 text-left transition-colors',
                                selected
                                  ? 'border-primary/50 bg-primary/5'
                                  : 'border-transparent hover:bg-muted/40',
                              )}
                              onClick={() => {
                                setSelectedExperienceId(row.experienceDefinitionId);
                                setWantUpgrade(false);
                                setSelectedOfferingId(null);
                                setSelectedSessionId(null);
                              }}
                            >
                              <p className="flex items-center gap-1 text-xs font-medium text-foreground">
                                {row.isFeatured ? (
                                  <Star className="h-3 w-3 shrink-0 text-amber-500" />
                                ) : null}
                                {row.displayNameZh}
                              </p>
                              {row.typicalDurationMin != null ? (
                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                  约 {row.typicalDurationMin} 分钟
                                </p>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {selectedExperience ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="exp-start">开始</Label>
                      <Input
                        id="exp-start"
                        type="time"
                        value={startTime}
                        disabled={wantUpgrade && Boolean(selectedSession)}
                        onChange={(event) => setStartTime(event.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="exp-end">结束</Label>
                      <Input
                        id="exp-end"
                        type="time"
                        value={endTime}
                        disabled={wantUpgrade && Boolean(selectedSession)}
                        onChange={(event) => setEndTime(event.target.value)}
                      />
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border/60 bg-muted/10 px-2.5 py-2 text-xs">
                    <Checkbox
                      checked={wantUpgrade}
                      onCheckedChange={(checked) => {
                        const on = checked === true;
                        setWantUpgrade(on);
                        if (!on) {
                          setSelectedOfferingId(null);
                          setSelectedSessionId(null);
                        }
                      }}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-foreground">可选：绑定供应商班次</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        有货时 offerings → sessions，写入后再 PATCH 升格；不选则只绑体验定义
                      </span>
                    </span>
                  </label>

                  {wantUpgrade ? (
                    <div className="space-y-2 rounded-md border border-border/60 p-2.5">
                      {offeringsQuery.isLoading ? (
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          查询可售产品…
                        </p>
                      ) : offerings.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          暂无对应 Offering，将仅创建体验绑定
                        </p>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <Label>供应商产品</Label>
                            <ul className="max-h-28 space-y-1 overflow-y-auto">
                              {offerings.map((offering) => (
                                <li key={offering.id}>
                                  <button
                                    type="button"
                                    className={cn(
                                      'w-full rounded-md border px-2 py-1.5 text-left text-xs',
                                      selectedOfferingId === offering.id
                                        ? 'border-primary/50 bg-primary/5'
                                        : 'border-transparent hover:bg-muted/40',
                                    )}
                                    onClick={() => {
                                      setSelectedOfferingId(offering.id);
                                      setSelectedSessionId(null);
                                    }}
                                  >
                                    <p className="font-medium">
                                      {offering.nameCN || offering.nameEN}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {formatTravelProductOfferingSubtitle(offering)}
                                    </p>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                          {selectedOfferingId && sessionDate ? (
                            <div className="space-y-1.5">
                              <Label>班次 · {sessionDate}</Label>
                              {sessionsQuery.isLoading ? (
                                <p className="text-xs text-muted-foreground">加载班次…</p>
                              ) : sessions.length === 0 ? (
                                <p className="text-xs text-muted-foreground">当天无可用班次</p>
                              ) : (
                                <ul className="max-h-28 space-y-1 overflow-y-auto">
                                  {sessions.map((session) => {
                                    const price = sessionPriceLabel(session);
                                    return (
                                      <li key={session.id}>
                                        <button
                                          type="button"
                                          className={cn(
                                            'w-full rounded-md border px-2 py-1.5 text-left text-xs',
                                            selectedSessionId === session.id
                                              ? 'border-primary/50 bg-primary/5'
                                              : 'border-transparent hover:bg-muted/40',
                                          )}
                                          onClick={() => setSelectedSessionId(session.id)}
                                        >
                                          集合 {session.meetTimeLocal ?? '—'} · 活动{' '}
                                          {session.startTimeLocal ?? '—'}–
                                          {session.endTimeLocal ?? '—'}
                                          {price ? ` · ${price}` : ''}
                                        </button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                              {selectedSession ? (
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                  <div className="space-y-1">
                                    <Label className="text-[10px]">预计抵达</Label>
                                    <Input
                                      type="time"
                                      value={arriveLocal}
                                      onChange={(e) => setArriveLocal(e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px]">车程（分）</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={travelMinutes}
                                      onChange={(e) => setTravelMinutes(e.target.value)}
                                    />
                                  </div>
                                  <label className="col-span-2 flex items-center gap-2 text-[11px]">
                                    <Checkbox
                                      checked={hasFallbackPlan}
                                      onCheckedChange={(c) => setHasFallbackPlan(c === true)}
                                    />
                                    已备天气 Plan B
                                  </label>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="exp-note">备注</Label>
                      <Input
                        id="exp-note"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="可选"
                      />
                    </div>
                  )}
                </>
              ) : null}
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border/50 pt-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            disabled={
              submitting ||
              (sourceTab === 'candidate' ? !canSubmitCandidate : !canSubmitExperience)
            }
            onClick={handleSubmit}
          >
            {submitting
              ? '添加中…'
              : parallelHint
                ? '添加并行活动'
                : sourceTab === 'experience'
                  ? wantUpgrade && selectedSession
                    ? '创建并绑定班次'
                    : '添加体验'
                  : '添加活动'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
