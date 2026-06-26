import { useState } from 'react';
import { format } from 'date-fns';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { quickPlanApi } from '@/api/quick-plan';
import { tripsApi } from '@/api/trips';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
  applyQuickPlanAction,
  ASSUMPTION_LABELS,
  buildTripDraftFromQuickPlan,
  cacheQuickPlanSession,
  clearQuickPlanSession,
  formatAssumptionValue,
} from '@/lib/quick-plan-draft.util';
import { resolveQuickPlanErrorMessage } from '@/lib/quick-plan-error.util';
import { cn } from '@/lib/utils';
import {
  ExperienceExplanationCardView,
  ItineraryPresentationPanel,
  TravelUnderstandingCard,
} from '@/components/experience-fulfillment';
import type {
  ConfirmPlanResponse,
  QuickPlanExistingRequest,
  QuickPlanResponse,
} from '@/types/quick-plan';
import type { DraftDay, TimeSlot, TripDraftResponse } from '@/types/trip';

const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: '上午',
  lunch: '午餐',
  afternoon: '下午',
  dinner: '晚餐',
  evening: '晚间',
};

const LOW_CONFIDENCE_THRESHOLD = 0.8;

const EXAMPLE_PROMPTS = [
  '我想去冰岛玩几天，想看瀑布和黑沙滩，节奏不要太赶',
  '东京 5 天，美食+城市漫步，公共交通为主',
  '新西兰南岛 7 天自驾，自然风光和户外活动',
];

type FlowStep = 'input' | 'preview' | 'final';

interface QuickPlanFlowProps {
  onTripCreated?: (tripId: string) => void;
  className?: string;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const isLow = confidence < LOW_CONFIDENCE_THRESHOLD;
  return (
    <Badge
      variant={isLow ? 'destructive' : 'secondary'}
      className={cn('text-xs', isLow && 'bg-amber-100 text-amber-900 hover:bg-amber-100')}
    >
      置信度 {pct}%
      {isLow ? ' · 建议确认' : ''}
    </Badge>
  );
}

function DraftDaysPreview({ days }: { days: DraftDay[] }) {
  if (!days.length) {
    return (
      <p className="text-sm text-muted-foreground">暂无详细行程预览，确认后将生成完整行程。</p>
    );
  }

  return (
    <div className="space-y-3">
      {days.map((day) => (
        <div key={`${day.day}-${day.date}`} className="rounded-lg border bg-muted/20 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            第 {day.day} 天
            {day.date ? ` · ${format(new Date(day.date), 'yyyy-MM-dd')}` : ''}
          </div>
          <div className="space-y-2">
            {(Object.keys(day.slots ?? {}) as TimeSlot[]).map((slot) => {
              const item = day.slots?.[slot];
              if (!item) return null;
              const placeLabel =
                (item as { placeName?: string }).placeName || `地点 #${item.placeId}`;
              return (
                <div key={slot} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {TIME_SLOT_LABELS[slot]}
                  </Badge>
                  <div className="min-w-0">
                    <div className="font-medium">{placeLabel}</div>
                    {item.reason && (
                      <div className="text-xs text-muted-foreground">{item.reason}</div>
                    )}
                    {item.startTime && item.endTime && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(item.startTime), 'HH:mm')} –{' '}
                        {format(new Date(item.endTime), 'HH:mm')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function QuickPlanFlow({ onTripCreated, className }: QuickPlanFlowProps) {
  const [step, setStep] = useState<FlowStep>('input');
  const [userInput, setUserInput] = useState('');
  const [existingRequest, setExistingRequest] = useState<QuickPlanExistingRequest | undefined>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickPlanResult, setQuickPlanResult] = useState<QuickPlanResponse | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmPlanResponse | null>(null);
  const [finalDraft, setFinalDraft] = useState<TripDraftResponse | null>(null);

  const resetFlow = () => {
    setStep('input');
    setQuickPlanResult(null);
    setConfirmResult(null);
    setFinalDraft(null);
    setError(null);
    clearQuickPlanSession();
  };

  const runQuickPlan = async (input: string, requestOverrides?: QuickPlanExistingRequest) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const result = await quickPlanApi.quickPlan({
        userInput: trimmed,
        existingRequest: requestOverrides,
      });
      setQuickPlanResult(result);
      setExistingRequest(requestOverrides);
      cacheQuickPlanSession(result.metadata.quickPlanId, trimmed, requestOverrides);
      setStep('preview');
    } catch (err) {
      setError(resolveQuickPlanErrorMessage(err));
      console.error('[QuickPlanFlow] quickPlan failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPlan = () => runQuickPlan(userInput, existingRequest);

  const handleQuickAction = async (action: string, param: string, label: string) => {
    if (!quickPlanResult || !userInput.trim()) return;

    const quickAction = quickPlanResult.modificationOptions.quickActions.find(
      (item) => item.action === action && item.param === param
    ) ?? { label, action, param };

    const nextRequest = applyQuickPlanAction(existingRequest, quickAction);
    setExistingRequest(nextRequest);
    await runQuickPlan(userInput, nextRequest);
  };

  const handleConfirm = async () => {
    if (!quickPlanResult) return;

    setLoading(true);
    setError(null);

    try {
      const dateRange = quickPlanResult.assumptions.date_range?.value;
      const result = await quickPlanApi.confirmPlan({
        quickPlanId: quickPlanResult.metadata.quickPlanId,
        confirmations: {
          date_range:
            dateRange?.start_date && dateRange?.end_date
              ? { start_date: dateRange.start_date, end_date: dateRange.end_date }
              : undefined,
        },
      });
      const draft = buildTripDraftFromQuickPlan(quickPlanResult, result);
      setConfirmResult(result);
      setFinalDraft(draft);
      setStep('final');
      clearQuickPlanSession();
    } catch (err) {
      const message = resolveQuickPlanErrorMessage(err);
      setError(message);
      if (message.includes('过期')) {
        resetFlow();
      }
      console.error('[QuickPlanFlow] confirmPlan failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTrip = async () => {
    if (!finalDraft) return;

    setSaving(true);
    setError(null);

    try {
      const created = await tripsApi.saveDraft({ draft: finalDraft });
      toast.success('行程创建成功', {
        description: created.message ?? '您的行程已成功创建',
      });
      onTripCreated?.(created.id);
    } catch (err) {
      setError(resolveQuickPlanErrorMessage(err));
      console.error('[QuickPlanFlow] saveDraft failed:', err);
    } finally {
      setSaving(false);
    }
  };

  if (step === 'input') {
    return (
      <div className={cn('space-y-5', className)}>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b bg-white">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-slate-900 p-2 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>快速规划</CardTitle>
                <CardDescription>
                  用一句话描述旅行意向，系统会理解你的需求、展示假设并生成行程预览
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 py-6">
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="你想去哪里玩？例如：我想去冰岛玩几天，想看瀑布和黑沙滩"
              rows={4}
              disabled={loading}
            />
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto whitespace-normal text-left text-xs"
                  disabled={loading}
                  onClick={() => setUserInput(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
            <Button
              onClick={handleQuickPlan}
              disabled={loading || !userInput.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  生成行程预览
                </>
              )}
            </Button>
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <p>{error}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 px-2 text-red-700"
                    onClick={handleQuickPlan}
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    重试
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'preview' && quickPlanResult) {
    const assumptionEntries = Object.entries(quickPlanResult.assumptions) as Array<
      [string, { value: unknown; confidence: number; source: string }]
    >;

    return (
      <div className={cn('space-y-5', className)}>
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">我理解你想去</CardTitle>
            <CardDescription>基于你的描述，系统提炼出以下旅行意向</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickPlanResult.experienceUnderstanding ? (
              <TravelUnderstandingCard data={quickPlanResult.experienceUnderstanding} />
            ) : (
              <>
                <div className="flex items-center gap-2 text-xl font-semibold">
                  <MapPin className="h-5 w-5 text-slate-600" />
                  {quickPlanResult.understanding.destination}
                </div>
                <p className="text-muted-foreground">{quickPlanResult.understanding.tripType}</p>
                <div className="flex flex-wrap gap-2">
                  {quickPlanResult.understanding.keyInterests.map((interest) => (
                    <Badge key={interest} variant="secondary">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </>
            )}
            <Badge variant="outline" className="text-xs">
              整体置信度 {Math.round(quickPlanResult.metadata.overallConfidence * 100)}%
            </Badge>
          </CardContent>
        </Card>

        {quickPlanResult.experienceExplanation && (
          <ExperienceExplanationCardView data={quickPlanResult.experienceExplanation} />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">我的假设</CardTitle>
            <CardDescription>低于 80% 置信度的假设会特别标注，建议你确认或调整</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assumptionEntries.map(([key, assumption]) => (
              <div
                key={key}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3',
                  assumption.confidence < LOW_CONFIDENCE_THRESHOLD && 'border-amber-200 bg-amber-50/50'
                )}
              >
                <div className="text-sm">
                  <span className="text-muted-foreground">{ASSUMPTION_LABELS[key] ?? key}：</span>
                  <span className="font-medium">{formatAssumptionValue(key, assumption.value)}</span>
                </div>
                <ConfidenceBadge confidence={assumption.confidence} />
              </div>
            ))}
          </CardContent>
        </Card>

        {quickPlanResult.risks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">注意事项</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickPlanResult.risks.map((risk, index) => (
                <div
                  key={`${risk.type}-${index}`}
                  className={cn(
                    'rounded-lg border p-3 text-sm',
                    risk.type === 'warning'
                      ? 'border-red-200 bg-red-50 text-red-900'
                      : 'border-blue-200 bg-blue-50 text-blue-900'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {risk.type === 'warning' ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <div>
                      <p>{risk.message}</p>
                      {risk.suggestedAction && (
                        <p className="mt-1 text-xs opacity-80">建议：{risk.suggestedAction}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">行程预览</CardTitle>
            <CardDescription>{quickPlanResult.preview.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {quickPlanResult.preview.totalDistance != null && (
                <span>总距离：{(quickPlanResult.preview.totalDistance / 1000).toFixed(1)} km</span>
              )}
              {quickPlanResult.preview.estimatedCost != null && (
                <span>预估费用：¥{quickPlanResult.preview.estimatedCost}</span>
              )}
            </div>
            {quickPlanResult.preview.itineraryPresentation ? (
              <ItineraryPresentationPanel presentation={quickPlanResult.preview.itineraryPresentation} />
            ) : (
              <DraftDaysPreview days={quickPlanResult.preview.days} />
            )}
          </CardContent>
        </Card>

        {quickPlanResult.modificationOptions.quickActions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">快速调整</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {quickPlanResult.modificationOptions.quickActions.map((action, index) => (
                  <Button
                    key={`${action.action}-${action.param}-${index}`}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleQuickAction(action.action, action.param, action.label)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={resetFlow} disabled={loading}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            重新输入
          </Button>
          <Button onClick={handleConfirm} disabled={loading} className="min-w-[160px]">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                确认并生成行程
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'final' && finalDraft) {
    return (
      <div className={cn('space-y-5', className)}>
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>最终行程</CardTitle>
                <CardDescription>
                  {finalDraft.destination} · {finalDraft.days} 天 · {finalDraft.candidatesCount}{' '}
                  个活动
                </CardDescription>
              </div>
              <Button onClick={handleSaveTrip} disabled={saving}>
                {saving ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    保存中...
                  </>
                ) : (
                  '保存行程'
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {confirmResult?.draft.warnings && confirmResult.draft.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-medium">生成提示</p>
                <ul className="mt-1 list-inside list-disc">
                  {confirmResult.draft.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            <DraftDaysPreview days={finalDraft.draftDays} />
          </CardContent>
        </Card>

        <Button variant="outline" onClick={resetFlow} disabled={saving}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          重新规划
        </Button>
      </div>
    );
  }

  return null;
}
