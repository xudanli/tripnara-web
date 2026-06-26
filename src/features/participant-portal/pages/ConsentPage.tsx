import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ConsentCatalogType } from '@/types/participant-portal';
import { CompletionProgressCard } from '../components/CompletionProgressCard';
import { ParticipantHelpFooter } from '../components/ParticipantHelpFooter';
import { ProjectHeaderCard } from '../components/ProjectHeaderCard';
import {
  buildConsentsPayload,
  canSubmitPreferencesFromConsents,
  resolveConsentCatalog,
} from '../lib/participant-consent';
import {
  useParticipantConsentTracking,
  useParticipantProject,
} from '../shell/ParticipantProjectProvider';
import { participantProjectPath, portalPathForPhase } from '../shell/participant-phase';
import { resolveParticipantPortalErrorGuide } from '../lib/participant-portal-errors';

export default function ConsentPage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { invite, phase } = useParticipantProject();
  const { acceptConsent, declineConsent, isPending } = useParticipantConsentTracking();
  const catalog = useMemo(() => (invite ? resolveConsentCatalog(invite) : null), [invite]);

  const [selected, setSelected] = useState<Partial<Record<ConsentCatalogType, boolean>>>({
    BASE_SERVICE: false,
    HUMAN_ASSISTED: false,
    RESEARCH: false,
    ANONYMIZED_CASE: false,
  });

  if (!invite || !catalog) return null;

  if (phase !== 'consenting') {
    navigate(portalPathForPhase(token, phase), { replace: true });
    return null;
  }

  const toggle = (type: ConsentCatalogType, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [type]: checked }));
  };

  const handleAccept = async () => {
    const consents = buildConsentsPayload(selected);
    if (!canSubmitPreferencesFromConsents(consents)) {
      toast.error('Gate 1 必须同时同意「基础服务」与「人工协助分析」才能继续');
      return;
    }
    try {
      const res = await acceptConsent(token, consents);
      if (!res.canSubmitPreferences) {
        toast.error('未完成必要同意，无法填写偏好');
        return;
      }
      navigate(participantProjectPath(token, 'preferences'));
    } catch (e) {
      const guide = resolveParticipantPortalErrorGuide(e);
      toast.error(guide.description);
    }
  };

  const handleDecline = async () => {
    try {
      await declineConsent(token, '用户拒绝参与');
      navigate(participantProjectPath(token, 'declined'));
    } catch (e) {
      const guide = resolveParticipantPortalErrorGuide(e);
      toast.error(guide.description);
    }
  };

  return (
    <div className="space-y-4">
      <ProjectHeaderCard invite={invite} />
      <CompletionProgressCard phase="consenting" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">知情同意</CardTitle>
          <CardDescription>版本 {catalog.version} · 请逐项阅读并勾选</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {catalog.items.map((item) => (
            <div key={item.type} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  id={`consent-${item.type}`}
                  checked={selected[item.type] ?? false}
                  onCheckedChange={(v) => toggle(item.type, v === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor={`consent-${item.type}`} className="text-sm font-medium leading-snug">
                    {item.label}
                    {item.required ? (
                      <span className="ml-1 text-xs text-destructive">*必需</span>
                    ) : (
                      <span className="ml-1 text-xs text-muted-foreground">可选</span>
                    )}
                  </Label>
                  {item.description ? (
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  ) : null}
                </div>
              </div>
              {item.text ? (
                <div className="max-h-32 overflow-y-auto rounded bg-muted/40 p-2 text-xs whitespace-pre-wrap">
                  {item.text}
                </div>
              ) : null}
            </div>
          ))}

          <Button className="w-full" disabled={isPending} onClick={() => void handleAccept()}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            确认同意并继续
          </Button>
          <Button variant="ghost" className="w-full" disabled={isPending} onClick={() => void handleDecline()}>
            拒绝参与
          </Button>
        </CardContent>
      </Card>

      <ParticipantHelpFooter />
    </div>
  );
}
