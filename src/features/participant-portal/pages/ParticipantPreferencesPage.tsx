import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useParticipantPreferences } from '@/hooks/useParticipantPortal';
import type { PrivateConstraintAuthorizationLevel } from '@/types/participant-portal';
import { CompletionProgressCard } from '../components/CompletionProgressCard';
import { ParticipantHelpFooter } from '../components/ParticipantHelpFooter';
import { ProjectHeaderCard } from '../components/ProjectHeaderCard';
import { VisibilityBadge } from '../components/VisibilityBadge';
import { PrivateConstraintsMetaPanel } from '../components/PrivateConstraintsMetaPanel';
import { useParticipantProject } from '../shell/ParticipantProjectProvider';
import { participantProjectPath, portalPathForPhase } from '../shell/participant-phase';

export default function ParticipantPreferencesPage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const {
    invite,
    phase,
    preferencesMutation,
    markPreferenceFormStarted,
    trackPreferenceSubmitted,
  } = useParticipantProject();
  const { data: savedPrefs, isLoading: prefsLoading } = useParticipantPreferences(token);

  const [pace, setPace] = useState('medium');
  const [mustSee, setMustSee] = useState('');
  const [diet, setDiet] = useState('');
  const [privateBudget, setPrivateBudget] = useState('');
  const [authLevel, setAuthLevel] =
    useState<PrivateConstraintAuthorizationLevel>('SANITIZED_TO_ADVISOR');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!savedPrefs || hydrated) return;
    const prefs = savedPrefs.publicPrefs;
    if (typeof prefs.pace === 'string') setPace(prefs.pace);
    if (Array.isArray(prefs.mustSee)) setMustSee(prefs.mustSee.join('\n'));
    if (typeof prefs.diet === 'string') setDiet(prefs.diet);
    setHydrated(true);
  }, [savedPrefs, hydrated]);

  useEffect(() => {
    if (phase === 'profiling') markPreferenceFormStarted();
  }, [phase, markPreferenceFormStarted]);

  if (!invite) return null;

  if (phase === 'joining' || phase === 'consenting') {
    navigate(portalPathForPhase(token, phase), { replace: true });
    return null;
  }

  if (phase === 'active') {
    navigate(participantProjectPath(token, 'dashboard'), { replace: true });
    return null;
  }

  if (phase === 'withdrawn') {
    navigate(participantProjectPath(token, 'withdrawn'), { replace: true });
    return null;
  }

  if (phase === 'declined') {
    navigate(participantProjectPath(token, 'declined'), { replace: true });
    return null;
  }

  const buildPayload = (submit: boolean) => ({
    publicPrefs: {
      pace,
      mustSee: mustSee
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      ...(diet.trim() ? { diet: diet.trim() } : {}),
    },
    privateConstraints: privateBudget.trim()
      ? [
          {
            fieldKey: 'budget',
            value: privateBudget.trim(),
            authorizationLevel: authLevel,
          },
        ]
      : undefined,
    submit,
  });

  const handleSaveDraft = async () => {
    try {
      await preferencesMutation.mutateAsync(buildPayload(false));
      toast.success('草稿已保存');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  const handleSubmit = async () => {
    try {
      await preferencesMutation.mutateAsync(buildPayload(true));
      trackPreferenceSubmitted({ privateUsed: Boolean(privateBudget.trim()) });
      toast.success('偏好已提交');
      navigate(participantProjectPath(token, 'dashboard'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '提交失败');
    }
  };

  return (
    <div className="space-y-4">
      <ProjectHeaderCard invite={invite} />
      <CompletionProgressCard
        phase={phase}
        completionRate={savedPrefs ? undefined : undefined}
      />

      {prefsLoading && !hydrated ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">我的偏好</CardTitle>
            <CardDescription>
              公开偏好用于团队方案；私密约束默认不向其他成员暴露原文。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>旅行节奏</Label>
                <VisibilityBadge visibility="PUBLIC_TO_PROJECT" />
              </div>
              <Select value={pace} onValueChange={setPace}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow">慢节奏</SelectItem>
                  <SelectItem value="medium">适中</SelectItem>
                  <SelectItem value="fast">紧凑</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="must-see">必去 / 想去</Label>
                <VisibilityBadge visibility="PUBLIC_TO_PROJECT" />
              </div>
              <Textarea
                id="must-see"
                rows={3}
                value={mustSee}
                onChange={(e) => setMustSee(e.target.value)}
                placeholder="每行一条"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="diet">饮食偏好</Label>
                <VisibilityBadge visibility="PUBLIC_TO_PROJECT" />
              </div>
              <Input
                id="diet"
                value={diet}
                onChange={(e) => setDiet(e.target.value)}
                placeholder="例如：素食"
              />
            </div>

            <div className="space-y-3 rounded-lg border border-dashed p-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="private-budget">预算说明（可选）</Label>
                <VisibilityBadge visibility="PRIVACY_ANALYST_ONLY" />
              </div>
              <Input
                id="private-budget"
                value={privateBudget}
                onChange={(e) => setPrivateBudget(e.target.value)}
                placeholder="不愿向亲友公开的上限或顾虑"
              />
              <div className="space-y-2">
                <Label className="text-xs">私密授权级别</Label>
                <Select
                  value={authLevel}
                  onValueChange={(v) =>
                    setAuthLevel(v as PrivateConstraintAuthorizationLevel)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANALYST_ONLY">仅隐私分析员可见原文</SelectItem>
                    <SelectItem value="SANITIZED_TO_ADVISOR">可脱敏后给顾问参考</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={preferencesMutation.isPending}
                onClick={() => void handleSaveDraft()}
              >
                保存草稿
              </Button>
              <Button disabled={preferencesMutation.isPending} onClick={() => void handleSubmit()}>
                提交偏好
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ParticipantHelpFooter />
      <PrivateConstraintsMetaPanel token={token} />
    </div>
  );
}
