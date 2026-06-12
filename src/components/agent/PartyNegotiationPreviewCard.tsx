import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, AlertCircle } from 'lucide-react';
import type { PartyNegotiationPayload } from '@/types/robustness-dashboard';
import { formatRobustnessPercent, previewToDashboardPayload } from '@/lib/robustness-dashboard';
import { RobustnessDashboardPanel } from '@/components/agent/RobustnessDashboardPanel';

export interface PartyNegotiationPreviewCardProps {
  partyNegotiation: PartyNegotiationPayload;
  className?: string;
}

const PACE_LABELS: Record<string, string> = {
  intensive: '紧凑',
  relaxed: '休闲',
  moderate: '适中',
};

const RISK_LABELS: Record<string, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
};

export function PartyNegotiationPreviewCard({
  partyNegotiation,
  className,
}: PartyNegotiationPreviewCardProps) {
  const preview = partyNegotiation.organizational_robustness_preview;
  const partySize = partyNegotiation.party_size;
  const needsClarification = partyNegotiation.requires_hitl_clarification === true;

  return (
    <div className={className}>
      <Card className="shadow-none border-violet-500/25 bg-violet-50/30 dark:bg-violet-950/15">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            <Users className="h-4 w-4" />
            搭子组织力预演
            {partySize != null ? (
              <Badge variant="secondary" className="font-normal">
                {partySize} 人
              </Badge>
            ) : null}
            {needsClarification ? (
              <Badge variant="outline" className="border-amber-500/50 text-amber-800">
                <AlertCircle className="h-3 w-3 mr-1" />
                待澄清
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription className="text-xs">
            INTAKE 阶段基于草案快照的多人协调预演，非正式行程评分。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            {partyNegotiation.aggregated_pace ? (
              <Badge variant="outline">
                节奏 {PACE_LABELS[partyNegotiation.aggregated_pace] ?? partyNegotiation.aggregated_pace}
              </Badge>
            ) : null}
            {partyNegotiation.aggregated_risk_tolerance ? (
              <Badge variant="outline">
                风险{' '}
                {RISK_LABELS[partyNegotiation.aggregated_risk_tolerance] ??
                  partyNegotiation.aggregated_risk_tolerance}
              </Badge>
            ) : null}
            {partyNegotiation.regret_upper_bound != null ? (
              <Badge variant="outline">
                群体遗憾上界 {formatRobustnessPercent(partyNegotiation.regret_upper_bound)}
              </Badge>
            ) : null}
          </div>

          {partyNegotiation.nash_reorder_hint ? (
            <p className="text-sm text-muted-foreground border-l-2 border-violet-400/50 pl-2.5">
              {partyNegotiation.nash_reorder_hint}
            </p>
          ) : null}

          {Array.isArray(partyNegotiation.member_profiles) &&
          partyNegotiation.member_profiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {partyNegotiation.member_profiles.map((m, i) => {
                const risk = m.risk_tolerance ?? m.risk;
                const label =
                  typeof m.member_id === 'string' && m.member_id.trim()
                    ? m.member_id.slice(0, 12)
                    : `成员 ${i + 1}`;
                return (
                  <div
                    key={typeof m.member_id === 'string' ? m.member_id : i}
                    className="rounded-md border bg-background/60 px-2 py-1.5 text-xs"
                  >
                    <span className="font-medium font-mono">{label}</span>
                    {m.pace ? <span className="text-muted-foreground"> · 节奏 {m.pace}</span> : null}
                    {risk ? <span className="text-muted-foreground"> · 风险 {risk}</span> : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {preview ? (
            <RobustnessDashboardPanel
              rollout={previewToDashboardPayload(preview)}
              isPreview
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default PartyNegotiationPreviewCard;
