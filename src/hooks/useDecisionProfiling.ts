import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { decisionProfilingApi } from '@/api/trip-decision-profiling';
import type {
  DecisionProfilingStep,
  FrictionRadarData,
  MoneyDnaCard,
  OnboardingStatus,
  QuizPayload,
  QuizPrefillData,
  SplitConsensusData,
  SubmitTravelStyleRequest,
  TravelStyleCard,
  TeamMoneyDnaItem,
  TeamTravelStyleItem,
} from '@/types/trip-decision-profiling';

export function useDecisionProfilingOnboarding(tripId: string | null | undefined) {
  const [data, setData] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(!!tripId);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tripId) return null;
    try {
      setLoading(true);
      setError(null);
      const result = await decisionProfilingApi.getOnboarding(tripId);
      setData(result);
      return result;
    } catch (e) {
      const message = (e as Error).message ?? '加载调查状态失败';
      setError(message);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}

export function useProfileReuse(tripId: string | null | undefined) {
  const [reusing, setReusing] = useState(false);

  const reuse = useCallback(
    async (userNote?: string) => {
      if (!tripId) return null;
      try {
        setReusing(true);
        const result = await decisionProfilingApi.reuseProfile(tripId, {
          sections: ['travel_style', 'money_dna'],
          ...(userNote?.trim() ? { userNote: userNote.trim() } : {}),
        });
        toast.success('已沿用上次调查');
        return result;
      } catch (e) {
        toast.error((e as Error).message ?? '沿用上次调查失败');
        return null;
      } finally {
        setReusing(false);
      }
    },
    [tripId],
  );

  return { reuse, reusing };
}

export function useQuizPrefill(tripId: string | null | undefined) {
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!tripId) return null;
    try {
      setLoading(true);
      return await decisionProfilingApi.getQuizPrefill(tripId);
    } catch (e) {
      toast.error((e as Error).message ?? '加载预填答案失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  return { load, loading };
}

function applyQuizPrefillToState(
  prefill: QuizPrefillData,
  step: DecisionProfilingStep,
): { answers: Record<string, string>; userNote: string } {
  const list =
    step === 'travel_style' ? prefill.travelStyleAnswers : prefill.moneyDnaAnswers;
  const answers: Record<string, string> = {};
  for (const a of list) answers[a.questionId] = a.optionId;
  return { answers, userNote: step === 'travel_style' ? prefill.userNote ?? '' : '' };
}

export function useDecisionProfilingQuiz(tripId: string | null | undefined) {
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!tripId) return null;
    try {
      setLoading(true);
      const result = await decisionProfilingApi.getQuiz(tripId);
      setQuiz(result);
      return result;
    } catch (e) {
      toast.error((e as Error).message ?? '加载题库失败');
      setQuiz(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  return { quiz, loading, load };
}

export function useMyTravelStyle(tripId: string | null | undefined) {
  const [card, setCard] = useState<TravelStyleCard | null>(null);
  const [loading, setLoading] = useState(!!tripId);

  const reload = useCallback(async () => {
    if (!tripId) return null;
    try {
      setLoading(true);
      const result = await decisionProfilingApi.getMyTravelStyle(tripId);
      setCard(result);
      return result;
    } catch (e) {
      toast.error((e as Error).message ?? '加载旅行风格失败');
      setCard(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const submit = useCallback(
    async (body: SubmitTravelStyleRequest) => {
      if (!tripId) return null;
      const result = await decisionProfilingApi.submitTravelStyle(tripId, body);
      setCard(result);
      return result;
    },
    [tripId],
  );

  const patchNote = useCallback(
    async (userNote: string) => {
      if (!tripId) return null;
      const result = await decisionProfilingApi.patchTravelStyleNote(tripId, userNote);
      setCard(result);
      return result;
    },
    [tripId],
  );

  return { card, loading, reload, submit, patchNote };
}

export function useMyMoneyDna(tripId: string | null | undefined) {
  const [card, setCard] = useState<MoneyDnaCard | null>(null);
  const [loading, setLoading] = useState(!!tripId);

  const reload = useCallback(async () => {
    if (!tripId) return null;
    try {
      setLoading(true);
      const result = await decisionProfilingApi.getMyMoneyDna(tripId);
      setCard(result);
      return result;
    } catch (e) {
      toast.error((e as Error).message ?? '加载 Money DNA 失败');
      setCard(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const submit = useCallback(
    async (body: SubmitTravelStyleRequest) => {
      if (!tripId) return null;
      const result = await decisionProfilingApi.submitMoneyDna(tripId, body);
      setCard(result);
      return result;
    },
    [tripId],
  );

  return { card, loading, reload, submit };
}

export function useTeamDecisionProfiling(tripId: string | null | undefined) {
  const [travelStyles, setTravelStyles] = useState<TeamTravelStyleItem[]>([]);
  const [moneyDna, setMoneyDna] = useState<TeamMoneyDnaItem[]>([]);
  const [loading, setLoading] = useState(!!tripId);

  const reload = useCallback(async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const [styles, dna] = await Promise.all([
        decisionProfilingApi.getTeamTravelStyle(tripId),
        decisionProfilingApi.getTeamMoneyDna(tripId),
      ]);
      setTravelStyles(styles);
      setMoneyDna(dna);
    } catch (e) {
      toast.error((e as Error).message ?? '加载团队画像失败');
      setTravelStyles([]);
      setMoneyDna([]);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { travelStyles, moneyDna, loading, reload };
}

export function useFrictionRadar(tripId: string | null | undefined, enabled = true) {
  const [data, setData] = useState<FrictionRadarData | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return null;
    try {
      setLoading(true);
      const result = await decisionProfilingApi.getFrictionRadar(tripId);
      setData(result);
      return result;
    } catch (e) {
      toast.error((e as Error).message ?? '加载摩擦预警失败');
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, reload };
}

export function useSplitConsensus(
  tripId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const [data, setData] = useState<SplitConsensusData | null>(null);
  const [loading, setLoading] = useState(Boolean(tripId) && enabled);
  const [submitting, setSubmitting] = useState(false);
  const simulateTimer = useRef<number | null>(null);

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return null;
    try {
      setLoading(true);
      const result = await decisionProfilingApi.getSplitConsensus(tripId);
      setData(result);
      return result;
    } catch (e) {
      toast.error((e as Error).message ?? '加载分摊共识失败');
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId, enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void reload();
  }, [reload, enabled]);

  const simulate = useCallback(
    (totalEstimate: number, currency = 'CNY') => {
      if (!tripId) return;
      if (simulateTimer.current) window.clearTimeout(simulateTimer.current);
      simulateTimer.current = window.setTimeout(async () => {
        try {
          setSubmitting(true);
          const result = await decisionProfilingApi.simulateSplit(tripId, { totalEstimate, currency });
          setData(result);
        } catch (e) {
          toast.error((e as Error).message ?? '分摊模拟失败');
        } finally {
          setSubmitting(false);
        }
      }, 400);
    },
    [tripId],
  );

  const selectMode = useCallback(
    async (mode: SplitConsensusData['selectedMode']) => {
      if (!tripId || !mode) return null;
      try {
        setSubmitting(true);
        const result = await decisionProfilingApi.selectSplitMode(tripId, mode);
        setData(result);
        toast.success('已选择分摊方案');
        return result;
      } catch (e) {
        toast.error((e as Error).message ?? '选择分摊方案失败');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [tripId],
  );

  const confirm = useCallback(async () => {
    if (!tripId) return null;
    try {
      setSubmitting(true);
      const result = await decisionProfilingApi.confirmSplitMode(tripId);
      setData(result);
      if (result.allConfirmed) toast.success('全员已确认，分摊规则已锁定');
      else toast.success('已确认分摊方案');
      return result;
    } catch (e) {
      toast.error((e as Error).message ?? '确认分摊方案失败');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [tripId]);

  return { data, loading, submitting, reload, simulate, selectMode, confirm };
}

export type QuizFlowStep = DecisionProfilingStep | 'done';

export function useQuizFlow(
  tripId: string | null | undefined,
  initialStep: DecisionProfilingStep = 'travel_style',
  options?: { prefillOnOpen?: boolean },
) {
  const prefillOnOpen = options?.prefillOnOpen ?? false;
  const { quiz, loading: quizLoading, load: loadQuiz } = useDecisionProfilingQuiz(tripId);
  const { load: loadPrefill, loading: prefillLoading } = useQuizPrefill(tripId);
  const { submit: submitTravelStyle } = useMyTravelStyle(tripId);
  const { submit: submitMoneyDna } = useMyMoneyDna(tripId);
  const [step, setStep] = useState<QuizFlowStep>(initialStep);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [userNote, setUserNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [prefillApplied, setPrefillApplied] = useState(false);

  useEffect(() => {
    if (tripId) void loadQuiz();
  }, [tripId, loadQuiz]);

  useEffect(() => {
    if (!tripId || !prefillOnOpen || prefillApplied || quizLoading) return;
    void (async () => {
      const result = await loadPrefill();
      if (!result?.prefill) return;
      const travel = applyQuizPrefillToState(result.prefill, 'travel_style');
      setAnswers(travel.answers);
      setUserNote(travel.userNote);
      setPrefillApplied(true);
    })();
  }, [tripId, prefillOnOpen, prefillApplied, quizLoading, loadPrefill]);

  const applyPrefillForStep = useCallback(
    async (targetStep: DecisionProfilingStep) => {
      const result = await loadPrefill();
      if (!result?.prefill) return false;
      const applied = applyQuizPrefillToState(result.prefill, targetStep);
      setAnswers(applied.answers);
      if (targetStep === 'travel_style') setUserNote(applied.userNote);
      return true;
    },
    [loadPrefill],
  );

  const currentQuestions =
    step === 'travel_style'
      ? quiz?.travelStyleQuestions ?? []
      : step === 'money_dna'
        ? quiz?.moneyDnaQuestions ?? []
        : [];

  const selectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const allAnswered = currentQuestions.length > 0 && currentQuestions.every((q) => answers[q.id]);

  const submitSection = async (): Promise<{ ok: boolean; done?: boolean }> => {
    if (!tripId || !allAnswered) return { ok: false };
    const payload: SubmitTravelStyleRequest = {
      answers: currentQuestions.map((q) => ({ questionId: q.id, optionId: answers[q.id]! })),
      ...(step === 'travel_style' && userNote.trim() ? { userNote: userNote.trim() } : {}),
    };

    setSubmitting(true);
    try {
      if (step === 'travel_style') {
        await submitTravelStyle(payload);
        setStep('money_dna');
        const moneyPrefill = await loadPrefill();
        if (moneyPrefill?.prefill) {
          setAnswers(applyQuizPrefillToState(moneyPrefill.prefill, 'money_dna').answers);
        } else {
          setAnswers({});
        }
        setUserNote('');
        toast.success('旅行风格已保存，继续 Money DNA');
        return { ok: true, done: false };
      }
      if (step === 'money_dna') {
        await submitMoneyDna(payload);
        setStep('done');
        toast.success('调查完成');
        return { ok: true, done: true };
      }
      return { ok: false };
    } catch (e) {
      toast.error((e as Error).message ?? '提交失败');
      return { ok: false };
    } finally {
      setSubmitting(false);
    }
  };

  return {
    quiz,
    quizLoading: quizLoading || (prefillOnOpen && prefillLoading && !prefillApplied),
    step,
    setStep,
    currentQuestions,
    answers,
    selectOption,
    allAnswered,
    userNote,
    setUserNote,
    submitting,
    submitSection,
    applyPrefillForStep,
    resetPrefill: () => setPrefillApplied(false),
  };
}
