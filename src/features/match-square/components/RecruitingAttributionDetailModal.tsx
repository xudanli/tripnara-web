import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { RecruitingAttribution } from '@/types/match-square';
import {
  getRecruitingReasonLabel,
  orderedSignalScores,
  recruitingConfidenceBadgeVariant,
} from '../lib/recruiting-attribution.util';
import { RecruitingSignalScoreBar } from './RecruitingSignalScoreBar';

interface RecruitingAttributionDetailModalProps {
  attribution: RecruitingAttribution;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CAUSE_TYPE_LABELS: Record<string, string> = {
  USER_ACTION: '用户决策',
  CONSTRAINT: '约束条件',
  GOVERNANCE: '治理规则',
  SYSTEM: '系统默认',
};

export function RecruitingAttributionDetailModal({
  attribution,
  open,
  onOpenChange,
}: RecruitingAttributionDetailModalProps) {
  const signals = orderedSignalScores(attribution.signalScores);
  const metadata = attribution.metadata;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>决策归因详情</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {CAUSE_TYPE_LABELS[attribution.causeType] ?? attribution.causeType}
            </Badge>
            <Badge variant={recruitingConfidenceBadgeVariant(attribution.confidence)}>
              置信度 {attribution.confidence}
            </Badge>
          </div>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              主要原因
            </h3>
            <p className="font-medium text-foreground">
              {getRecruitingReasonLabel(attribution.primaryReason)}
            </p>
            {attribution.reasonCodes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {attribution.reasonCodes.map((code) => (
                  <Badge key={code} variant="outline" className="text-[10px] font-normal">
                    {getRecruitingReasonLabel(code) !== code
                      ? getRecruitingReasonLabel(code)
                      : code}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              信号评分
            </h3>
            <div className="space-y-2">
              {signals.map((signal) => (
                <RecruitingSignalScoreBar
                  key={signal.key}
                  label={signal.label}
                  score={signal.score}
                />
              ))}
            </div>
          </section>

          {metadata && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                详细信息
              </h3>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                {metadata.compatibilityScore != null && (
                  <>
                    <dt className="text-muted-foreground">兼容性评分</dt>
                    <dd className="tabular-nums text-foreground">
                      {(metadata.compatibilityScore * 100).toFixed(0)}%
                    </dd>
                  </>
                )}
                {metadata.skillMatchScore != null && (
                  <>
                    <dt className="text-muted-foreground">技能匹配</dt>
                    <dd className="tabular-nums text-foreground">
                      {(metadata.skillMatchScore * 100).toFixed(0)}%
                    </dd>
                  </>
                )}
                {metadata.scheduleMatchScore != null && (
                  <>
                    <dt className="text-muted-foreground">时间匹配</dt>
                    <dd className="tabular-nums text-foreground">
                      {(metadata.scheduleMatchScore * 100).toFixed(0)}%
                    </dd>
                  </>
                )}
                {metadata.budgetMatchScore != null && (
                  <>
                    <dt className="text-muted-foreground">预算匹配</dt>
                    <dd className="tabular-nums text-foreground">
                      {(metadata.budgetMatchScore * 100).toFixed(0)}%
                    </dd>
                  </>
                )}
              </dl>
              {metadata.alternativeReasons?.length ? (
                <div className="space-y-1 pt-1">
                  <p className="text-xs text-muted-foreground">其他可能原因</p>
                  <ul className="list-disc pl-4 text-xs text-foreground">
                    {metadata.alternativeReasons.map((alt) => (
                      <li key={alt}>{getRecruitingReasonLabel(alt) !== alt ? getRecruitingReasonLabel(alt) : alt}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
