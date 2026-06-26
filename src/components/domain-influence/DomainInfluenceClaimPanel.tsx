import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Handshake,
  RefreshCw,
  Scale,
  ThumbsUp,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useTripDomainInfluence } from '@/hooks/useTripDomainInfluence';
import { useAuth } from '@/hooks/useAuth';
import type { DomainInfluenceItem, DomainRecommendation, TripDomain } from '@/types/trip-domain-influence';
import {
  crossLevelBadgeClass,
  CROSS_LEVEL_LABEL,
  DomainIcon,
  domainIconWell,
  domainPanelHeader,
  domainPanelShell,
} from './domain-influence-ui';

interface DomainClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: DomainInfluenceItem | null;
  recommendation?: DomainRecommendation | null;
  submitting?: boolean;
  onSubmit: (payload: { domain: TripDomain; selfScore: number; note?: string; claimSource?: 'explicit' | 'recommended' }) => Promise<void>;
}

export function DomainClaimDialog({
  open,
  onOpenChange,
  domain,
  recommendation,
  submitting,
  onSubmit,
}: DomainClaimDialogProps) {
  const [selfScore, setSelfScore] = useState(50);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open || !domain) return;
    const mine = domain.claims.find((c) => c.claimSource === 'explicit');
    setSelfScore(mine?.selfScore ?? recommendation?.score ?? 50);
    setNote(mine?.note ?? '');
  }, [open, domain, recommendation]);

  if (!domain) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>认领 · {domain.domainLabel}</DialogTitle>
          <DialogDescription>
            {domain.decisionRule.ruleLabelZh}
            {recommendation ? ` · 系统推荐：${recommendation.reason}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Label>自评专业度</Label>
              <span className="text-muted-foreground">{selfScore}</span>
            </div>
            <Slider
              value={[selfScore]}
              min={0}
              max={100}
              step={5}
              onValueChange={([v]) => setSelfScore(v)}
            />
          </div>
          <div className="space-y-2">
            <Label>认领说明（可选）</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：我对冰岛住宿很有经验，这块我来研究"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={submitting}
            onClick={() =>
              void onSubmit({
                domain: domain.domain,
                selfScore,
                note: note.trim() || undefined,
                claimSource: recommendation ? 'recommended' : 'explicit',
              })
            }
          >
            {submitting ? <Spinner className="h-4 w-4" /> : '确认认领'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DomainWeightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: DomainInfluenceItem | null;
  submitting?: boolean;
  onSubmit: (weights: Array<{ userId: string; weight: number }>) => Promise<void>;
}

export function DomainWeightDialog({
  open,
  onOpenChange,
  domain,
  submitting,
  onSubmit,
}: DomainWeightDialogProps) {
  const [draft, setDraft] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open || !domain) return;
    const init: Record<string, number> = {};
    domain.weights.forEach((w) => {
      init[w.userId] = w.weightPercent;
    });
    setDraft(init);
  }, [open, domain]);

  if (!domain || domain.weights.length < 2) return null;

  const total = Object.values(draft).reduce((s, v) => s + v, 0) || 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>协商权重 · {domain.domainLabel}</DialogTitle>
          <DialogDescription>调整后服务端会自动归一化为百分比</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {domain.weights.map((w) => (
            <div key={w.userId} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{w.displayName}</span>
                <span className="text-muted-foreground">
                  {((draft[w.userId] ?? 0) / total * 100).toFixed(1)}%
                </span>
              </div>
              <Slider
                value={[draft[w.userId] ?? w.weightPercent]}
                min={0}
                max={100}
                step={5}
                onValueChange={([v]) => setDraft((prev) => ({ ...prev, [w.userId]: v }))}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={submitting}
            onClick={() =>
              void onSubmit(
                domain.weights.map((w) => ({
                  userId: w.userId,
                  weight: (draft[w.userId] ?? w.weightPercent) / 100,
                })),
              )
            }
          >
            {submitting ? <Spinner className="h-4 w-4" /> : '保存权重'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DomainCard({
  item,
  currentUserId,
  recommendation,
  onClaim,
  onWithdraw,
  onEndorse,
  onAdjustWeights,
}: {
  item: DomainInfluenceItem;
  currentUserId?: string;
  recommendation?: DomainRecommendation;
  onClaim: () => void;
  onWithdraw: (claimId: string) => void;
  onEndorse: (claimUserId: string) => void;
  onAdjustWeights: () => void;
}) {
  const myClaim = item.claims.find((c) => c.userId === currentUserId);
  const leader = item.weights.find((w) => w.isLeader) ?? item.weights[0];

  return (
    <article
      className={cn(
        'rounded-lg border p-4 transition-colors',
        item.unclaimed
          ? 'border-dashed border-border/80 bg-muted/15'
          : 'border-border bg-card shadow-sm',
      )}
    >
      <div className="flex items-start gap-3">
        <div className={domainIconWell}>
          <DomainIcon domain={item.domain} />
        </div>
        <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold tracking-tight">{item.domainLabel}</h4>
            <Badge variant="outline" className={crossLevelBadgeClass(item.decisionRule.crossLevel)}>
              {CROSS_LEVEL_LABEL[item.decisionRule.crossLevel]}
            </Badge>
            {item.weightSource === 'negotiation' ? (
              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground border-border">
                <Handshake className="mr-0.5 h-3 w-3" />
                已协商
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.decisionRule.ruleLabelZh}</p>
        </div>
        {leader && !item.unclaimed ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <UserCheck className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground/80">{leader.displayName}</span>
          </div>
        ) : null}
      </div>

      {item.impactHints && item.impactHints.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
          影响：{item.impactHints.join('、')}
        </p>
      ) : null}

      {!item.unclaimed && item.weights.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {item.weights.map((w) => (
            <div key={w.userId} className="flex items-center gap-2 text-xs">
              <span className="w-16 truncate">{w.displayName}</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-foreground/25 rounded-full transition-all"
                  style={{ width: `${Math.min(100, w.weightPercent)}%` }}
                />
              </div>
              <span className="w-10 text-right tabular-nums">{w.weightPercent.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      ) : null}

      {item.claims.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {item.claims.map((claim) => (
            <li
              key={claim.id}
              className="flex items-start justify-between gap-2 rounded-md border bg-muted/30 px-2.5 py-2 text-xs"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{claim.displayName}</span>
                  <span className="text-muted-foreground">自评 {claim.selfScore}</span>
                  <span className="text-muted-foreground">
                    · {claim.endorsementCount}/{claim.endorsementTotal} 认可
                  </span>
                </div>
                {claim.note ? <p className="mt-0.5 text-muted-foreground line-clamp-2">{claim.note}</p> : null}
              </div>
              <div className="flex shrink-0 gap-1">
                {claim.userId !== currentUserId && !claim.endorsedByCurrentUser ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => onEndorse(claim.userId)}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                ) : null}
                {claim.userId === currentUserId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground"
                    onClick={() => onWithdraw(claim.id)}
                  >
                    <UserMinus className="h-3 w-3" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={myClaim ? 'outline' : 'default'} className="h-8 text-xs" onClick={onClaim}>
          {myClaim ? '更新认领' : recommendation ? '采纳推荐' : '我来认领'}
        </Button>
        {item.weights.length > 1 ? (
          <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={onAdjustWeights}>
            协商权重
          </Button>
        ) : null}
      </div>
        </div>
      </div>
    </article>
  );
}

interface DomainInfluenceClaimPanelProps {
  tripId: string;
  className?: string;
  /** 弹窗内嵌时省略区块标题，避免与 Dialog 标题重复 */
  hideSectionHeader?: boolean;
}

export function DomainInfluenceClaimPanel({
  tripId,
  className,
  hideSectionHeader = false,
}: DomainInfluenceClaimPanelProps) {
  const { user } = useAuth();
  const {
    snapshot,
    recommendations,
    loading,
    loadError,
    submitting,
    reload,
    claimDomain,
    withdrawClaim,
    endorseClaim,
    updateWeights,
    confirmRules,
  } = useTripDomainInfluence(tripId);

  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [activeDomain, setActiveDomain] = useState<DomainInfluenceItem | null>(null);

  const recByDomain = useMemo(() => {
    const map = new Map<TripDomain, DomainRecommendation>();
    recommendations.forEach((r) => map.set(r.domain, r));
    return map;
  }, [recommendations]);

  const openClaim = (domain: DomainInfluenceItem) => {
    setActiveDomain(domain);
    setClaimDialogOpen(true);
  };

  const openWeights = (domain: DomainInfluenceItem) => {
    setActiveDomain(domain);
    setWeightDialogOpen(true);
  };

  const handleClaimSubmit = async (payload: Parameters<typeof claimDomain>[0]) => {
    await claimDomain(payload);
    setClaimDialogOpen(false);
  };

  const completionPercent = Math.round((snapshot?.completionRate ?? 0) * 100);

  return (
    <>
      <section className={cn(domainPanelShell, className)}>
        {!hideSectionHeader ? (
        <div className={cn(domainPanelHeader, 'flex items-center justify-between gap-2')}>
          <div className="flex items-center gap-3">
            <div className={domainIconWell}>
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">领域专家认领</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">8 大领域 · 决策权与影响力</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => void reload()}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            刷新
          </Button>
        </div>
        ) : (
          <div className="flex justify-end px-5 pt-3">
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => void reload()}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              刷新
            </Button>
          </div>
        )}

        <div className={cn('space-y-4', hideSectionHeader ? 'p-5 pt-2' : 'p-5')}>
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-5 w-5" />
            </div>
          ) : loadError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-6 text-center space-y-3">
              <p className="text-sm text-destructive">{loadError}</p>
              <p className="text-xs text-muted-foreground">
                接口已连通（HTTP 200），但后端返回 INTERNAL_ERROR，需在 Nest 服务日志中排查。
              </p>
              <Button type="button" size="sm" variant="outline" onClick={() => void reload()}>
                重试
              </Button>
            </div>
          ) : snapshot ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>认领完成度 {completionPercent}%</span>
                  <span>{snapshot.memberCount} 人团队</span>
                </div>
                <Progress value={completionPercent} className="h-1.5" />
              </div>

              {snapshot.balanceWarnings.length > 0 ? (
                <div className="rounded-md border border-gate-confirm-border bg-gate-confirm/20 px-3 py-2 text-xs text-gate-confirm-foreground">
                  {snapshot.balanceWarnings.map((w) => (
                    <p key={w.userId}>{w.displayName}：{w.message}</p>
                  ))}
                </div>
              ) : null}

              {!snapshot.rulesConfirmed ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">规划开始前请全员确认交叉领域决策规则</p>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={submitting}
                    onClick={() => void confirmRules()}
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    确认规则
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gate-allow-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  决策规则已确认
                </div>
              )}

              {recommendations.length > 0 ? (
                <div className="rounded-md border border-border/80 bg-muted/25 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/90">
                    系统推荐
                  </div>
                  <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {recommendations.slice(0, 3).map((r) => (
                      <li key={r.domain}>
                        {r.domainLabel}（{r.score}）— {r.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                {snapshot.domains.map((domain) => (
                  <DomainCard
                    key={domain.domain}
                    item={domain}
                    currentUserId={user?.id}
                    recommendation={recByDomain.get(domain.domain)}
                    onClaim={() => openClaim(domain)}
                    onWithdraw={(id) => void withdrawClaim(id)}
                    onEndorse={(uid) => void endorseClaim({ domain: domain.domain, claimUserId: uid })}
                    onAdjustWeights={() => openWeights(domain)}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">暂无领域数据</p>
          )}
        </div>
      </section>

      <DomainClaimDialog
        open={claimDialogOpen}
        onOpenChange={setClaimDialogOpen}
        domain={activeDomain}
        recommendation={activeDomain ? recByDomain.get(activeDomain.domain) : null}
        submitting={submitting}
        onSubmit={handleClaimSubmit}
      />

      <DomainWeightDialog
        open={weightDialogOpen}
        onOpenChange={setWeightDialogOpen}
        domain={activeDomain}
        submitting={submitting}
        onSubmit={async (weights) => {
          if (!activeDomain) return;
          await updateWeights({ domain: activeDomain.domain, weights });
          setWeightDialogOpen(false);
        }}
      />
    </>
  );
}
