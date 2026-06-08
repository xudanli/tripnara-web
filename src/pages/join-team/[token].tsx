/**
 * 通过邀请链接加入团队（公开页）
 *
 * 路由：/join-team/:token
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teamApi } from '@/api/optimization-v2';
import type { TeamInviteInfo, JoinTeamInviteRequest } from '@/types/optimization-v2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { Users, MapPin, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const FITNESS_OPTIONS = [
  { value: 'BEGINNER', label: '初级' },
  { value: 'INTERMEDIATE', label: '中级' },
  { value: 'ADVANCED', label: '高级' },
  { value: 'EXPERT', label: '专家' },
] as const;

const EXPERIENCE_OPTIONS = [
  { value: 'NOVICE', label: '新手' },
  { value: 'SOME_EXPERIENCE', label: '有经验' },
  { value: 'EXPERIENCED', label: '经验丰富' },
  { value: 'EXPERT', label: '专家' },
] as const;

export default function JoinTeamPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [info, setInfo] = useState<TeamInviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<JoinTeamInviteRequest>({
    displayName: user?.displayName ?? user?.email ?? '',
    role: 'MEMBER',
    fitnessLevel: 'INTERMEDIATE',
    experienceLevel: 'SOME_EXPERIENCE',
    userId: user?.id,
  });

  useEffect(() => {
    if (user?.displayName || user?.email) {
      setForm((f) => ({ ...f, displayName: user?.displayName ?? user?.email ?? f.displayName, userId: user?.id }));
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      loadInfo();
    }
  }, [token]);

  const loadInfo = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const data = await teamApi.getInviteInfo(token);
      setInfo(data);
      if (!data.valid) setError('邀请链接已失效或已过期');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '加载失败');
      setInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!token || !form.displayName?.trim() || joining) return;
    try {
      setJoining(true);
      const res = await teamApi.joinByInvite(token, {
        ...form,
        displayName: form.displayName.trim(),
      });
      toast.success(`已加入团队 ${res.team?.name ?? ''}`);
      const tripId = info?.tripId;
      if (tripId) {
        navigate(`/dashboard/trips/${tripId}?tab=team`);
      } else {
        navigate('/dashboard/trips');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message;
      if (err?.response?.status === 409) {
        toast.error('您已是该团队成员');
        navigate('/dashboard/trips');
      } else {
        toast.error(msg || '加入失败');
      }
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !info?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-destructive">{error || '邀请链接已失效或已过期'}</p>
              <Button variant="outline" onClick={() => navigate('/')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回首页
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <CardTitle>加入团队</CardTitle>
          </div>
          <CardDescription>
            {info.inviterDisplayName} 邀请您加入团队「{info.teamName}」
            {info.tripTitle && (
              <>
                ，共同规划行程「{info.tripTitle}」
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{info.teamName}</span>
            </div>
            {info.tripTitle && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{info.tripTitle}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">已有 {info.memberCount} 位成员</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="join-displayName">您的姓名或昵称</Label>
            <Input
              id="join-displayName"
              placeholder="请输入"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>体能等级</Label>
              <Select
                value={form.fitnessLevel}
                onValueChange={(v) => setForm((f) => ({ ...f, fitnessLevel: v as JoinTeamInviteRequest['fitnessLevel'] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FITNESS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>户外经验</Label>
              <Select
                value={form.experienceLevel}
                onValueChange={(v) => setForm((f) => ({ ...f, experienceLevel: v as JoinTeamInviteRequest['experienceLevel'] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            className="w-full gap-2"
            onClick={handleJoin}
            disabled={!form.displayName?.trim() || joining}
          >
            {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            {joining ? '加入中...' : '加入团队'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
