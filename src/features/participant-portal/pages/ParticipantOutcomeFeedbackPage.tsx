import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSubmitParticipantOutcomeFeedback } from '@/hooks/useParticipantPortal';
import { ProjectHeaderCard } from '../components/ProjectHeaderCard';
import { useParticipantProject } from '../shell/ParticipantProjectProvider';
import { participantProjectPath, portalPathForPhase } from '../shell/participant-phase';

export default function ParticipantOutcomeFeedbackPage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { invite, phase } = useParticipantProject();
  const submitFeedback = useSubmitParticipantOutcomeFeedback(token);

  const [rating, setRating] = useState('4');
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [comment, setComment] = useState('');

  if (!invite) return null;

  if (phase !== 'active') {
    navigate(portalPathForPhase(token, phase), { replace: true });
    return null;
  }

  const handleSubmit = async () => {
    try {
      await submitFeedback.mutateAsync({
        rating: Number(rating),
        wouldRecommend,
        comment: comment.trim() || undefined,
      });
      toast.success('感谢反馈');
      navigate(participantProjectPath(token, 'dashboard'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '提交失败');
    }
  };

  return (
    <div className="space-y-4">
      <ProjectHeaderCard invite={invite} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">行后反馈</CardTitle>
          <CardDescription>帮助我们了解需求是否被满足，以及是否愿意再次参与。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>总体满意度</Label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 4, 3, 2, 1].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} 分
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <Label htmlFor="recommend" className="font-normal">
              愿意推荐给朋友
            </Label>
            <Switch
              id="recommend"
              checked={wouldRecommend}
              onCheckedChange={setWouldRecommend}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">补充说明（可选）</Label>
            <Textarea
              id="comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="哪些需求被满足/被忽略？"
            />
          </div>

          <Button disabled={submitFeedback.isPending} onClick={() => void handleSubmit()}>
            提交反馈
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
