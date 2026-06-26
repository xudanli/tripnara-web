import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoLoading } from '@/components/common/LogoLoading';
import {
  useFitConfig,
  useFitQuestionnaire,
  useUpdateFitConfig,
} from '@/hooks/useProjectFit';
import type { FitConfig } from '@/types/project-fit';

const SOFT_DIMENSION_OPTIONS = [
  { key: 'pace', label: '节奏' },
  { key: 'risk', label: '风险承受' },
  { key: 'accommodation', label: '住宿偏好' },
  { key: 'budget', label: '预算匹配' },
  { key: 'team_style', label: '团队风格' },
] as const;

interface FitConfigEditorPanelProps {
  listingId: string;
}

function syncFromConfig(config: FitConfig | undefined) {
  return {
    softDimensions: config?.softDimensions ?? [],
    previewQuestionKeys: config?.previewQuestionKeys ?? [],
    reassessmentTtlHours:
      config?.reassessmentTtlHours != null ? String(config.reassessmentTtlHours) : '168',
  };
}

export function FitConfigEditorPanel({ listingId }: FitConfigEditorPanelProps) {
  const { data: fitConfig, isLoading: configLoading } = useFitConfig(listingId);
  const { data: questionnaire, isLoading: questionnaireLoading } = useFitQuestionnaire(
    listingId,
    'full'
  );
  const updateConfig = useUpdateFitConfig(listingId);

  const questionOptions = useMemo(
    () => questionnaire?.questions ?? [],
    [questionnaire?.questions]
  );

  const [softDimensions, setSoftDimensions] = useState<string[]>([]);
  const [previewQuestionKeys, setPreviewQuestionKeys] = useState<string[]>([]);
  const [reassessmentTtlHours, setReassessmentTtlHours] = useState('168');

  useEffect(() => {
    const synced = syncFromConfig(fitConfig);
    setSoftDimensions(synced.softDimensions);
    setPreviewQuestionKeys(synced.previewQuestionKeys);
    setReassessmentTtlHours(synced.reassessmentTtlHours);
  }, [fitConfig]);

  const toggleSoftDimension = (key: string, checked: boolean) => {
    setSoftDimensions((prev) =>
      checked ? [...new Set([...prev, key])] : prev.filter((k) => k !== key)
    );
  };

  const togglePreviewKey = (key: string, checked: boolean) => {
    setPreviewQuestionKeys((prev) =>
      checked ? [...new Set([...prev, key])] : prev.filter((k) => k !== key)
    );
  };

  const handleSave = async () => {
    const ttl = Number.parseInt(reassessmentTtlHours, 10);
    if (!Number.isFinite(ttl) || ttl < 1) {
      toast.error('评估有效期需为正整数（小时）');
      return;
    }

    try {
      await updateConfig.mutateAsync({
        softDimensions,
        previewQuestionKeys,
        reassessmentTtlHours: ttl,
      });
      toast.success('适合度配置已保存');
    } catch {
      toast.error('保存失败');
    }
  };

  if (configLoading) {
    return <LogoLoading size={24} />;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        配置软维度与公开页 preview 题目。保存后可能影响规则版本与既有评估有效期。
      </p>

      <div className="space-y-2">
        <Label className="text-sm">软维度（团队影响分析）</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {SOFT_DIMENSION_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <Checkbox
                checked={softDimensions.includes(opt.key)}
                onCheckedChange={(v) => toggleSoftDimension(opt.key, v === true)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">公开 preview 题目</Label>
        {questionnaireLoading && <LogoLoading size={20} />}
        {!questionnaireLoading && questionOptions.length === 0 && (
          <p className="text-xs text-muted-foreground">暂无可用题目，请先初始化准入规则。</p>
        )}
        <div className="space-y-2">
          {questionOptions.map((q) => (
            <label
              key={q.questionKey}
              className="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <Checkbox
                className="mt-0.5"
                checked={previewQuestionKeys.includes(q.questionKey)}
                onCheckedChange={(v) => togglePreviewKey(q.questionKey, v === true)}
              />
              <span>
                {q.label}
                {q.required && (
                  <span className="ml-1 text-xs text-muted-foreground">（必填）</span>
                )}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fit-ttl" className="text-sm">
          评估有效期（小时）
        </Label>
        <Input
          id="fit-ttl"
          type="number"
          min={1}
          value={reassessmentTtlHours}
          onChange={(e) => setReassessmentTtlHours(e.target.value)}
          className="max-w-[12rem]"
        />
      </div>

      <Button onClick={() => void handleSave()} disabled={updateConfig.isPending}>
        {updateConfig.isPending ? '保存中…' : '保存适合度配置'}
      </Button>
    </div>
  );
}
