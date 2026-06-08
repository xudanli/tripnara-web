/**
 * DYL（Design Your Life）Canvas 电子版
 * 徒步 DYL 局 / 星空围炉复盘用互动画布
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Compass, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_PREFIX = 'tripnara:dyl-canvas:';

type DylCanvasDraft = {
  workview: string;
  lifeview: string;
  energyNotes: string;
  odysseyPlanA: string;
  odysseyPlanB: string;
  odysseyPlanC: string;
  groupReflection: string;
};

const EMPTY_DRAFT: DylCanvasDraft = {
  workview: '',
  lifeview: '',
  energyNotes: '',
  odysseyPlanA: '',
  odysseyPlanB: '',
  odysseyPlanC: '',
  groupReflection: '',
};

function loadDraft(storageKey: string): DylCanvasDraft {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { ...EMPTY_DRAFT };
    return { ...EMPTY_DRAFT, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY_DRAFT };
  }
}

export default function DylCanvasPage() {
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId')?.trim() || 'default';
  const storageKey = `${STORAGE_PREFIX}${tripId}`;

  const [draft, setDraft] = useState<DylCanvasDraft>(() => loadDraft(storageKey));
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setDraft(loadDraft(storageKey));
    setSavedAt(null);
  }, [storageKey]);

  const backHref = useMemo(
    () => (tripId !== 'default' ? `/dashboard/trips/${tripId}` : '/dashboard/trips'),
    [tripId]
  );

  const updateField = useCallback(
    (key: keyof DylCanvasDraft, value: string) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify(draft));
    setSavedAt(Date.now());
    toast.success('画布已保存到本机');
  };

  const handleClear = () => {
    setDraft({ ...EMPTY_DRAFT });
    localStorage.removeItem(storageKey);
    setSavedAt(null);
    toast.message('已清空本地草稿');
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4 pb-12 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2 h-8 px-2" asChild>
            <Link to={backHref}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              返回行程
            </Link>
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Compass className="h-6 w-6 text-primary" aria-hidden />
            DYL Canvas 电子版
          </h1>
          <p className="text-sm text-muted-foreground">
            基于 Stanford Design Your Life 框架 — 适合星空围炉、客栈复盘或行中人生设计局
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleClear}>
            清空
          </Button>
          <Button size="sm" onClick={handleSave}>
            保存草稿
          </Button>
        </div>
      </div>

      {savedAt != null && (
        <p className="text-xs text-muted-foreground">
          上次保存：{new Date(savedAt).toLocaleString()}
          {tripId !== 'default' ? ` · 关联行程 ${tripId}` : ''}
        </p>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. Workview · 工作观</CardTitle>
          <CardDescription>工作对你意味着什么？你想通过工作获得什么？</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={draft.workview}
            onChange={(e) => updateField('workview', e.target.value)}
            placeholder="例如：工作是我表达创造力、服务他人并换取财务自由的途径……"
            rows={4}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">2. Lifeview · 人生观</CardTitle>
          <CardDescription>人生意义是什么？什么对你最重要？</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={draft.lifeview}
            onChange={(e) => updateField('lifeview', e.target.value)}
            placeholder="例如：健康、亲密关系、持续学习、在自然中获得平静……"
            rows={4}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">3. 能量审计</CardTitle>
          <CardDescription>最近哪些活动让你充满能量 / 消耗能量？</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={draft.energyNotes}
            onChange={(e) => updateField('energyNotes', e.target.value)}
            placeholder="高能量：徒步、深度对话、创作……&#10;低能量：无效会议、内耗比较……"
            rows={4}
          />
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            4. Odyssey Plans · 三种人生版本
          </CardTitle>
          <CardDescription>若未来 5 年可以试三种不同人生，它们分别是什么？</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="odyssey-a">Plan A · 延续与优化</Label>
            <Textarea
              id="odyssey-a"
              value={draft.odysseyPlanA}
              onChange={(e) => updateField('odysseyPlanA', e.target.value)}
              placeholder="在现有轨道上放大优势……"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="odyssey-b">Plan B · 备选路径</Label>
            <Textarea
              id="odyssey-b"
              value={draft.odysseyPlanB}
              onChange={(e) => updateField('odysseyPlanB', e.target.value)}
              placeholder="若 A 不可行，我会尝试……"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="odyssey-c">Plan C · 狂野想法</Label>
            <Textarea
              id="odyssey-c"
              value={draft.odysseyPlanC}
              onChange={(e) => updateField('odysseyPlanC', e.target.value)}
              placeholder="不考虑钱和面子，我最想活成……"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">5. 围炉共识 · 组内复盘</CardTitle>
          <CardDescription>今晚围炉想向搭子请教的问题，或彼此给出的洞察</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={draft.groupReflection}
            onChange={(e) => updateField('groupReflection', e.target.value)}
            placeholder="我的卡点 / 我想听到的反馈 / 给彼此的一句话……"
            rows={5}
          />
        </CardContent>
      </Card>
    </div>
  );
}
