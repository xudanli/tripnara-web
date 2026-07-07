import { CheckCircle2, Fingerprint, Scale, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FlywheelAuditReport } from '@/types/active-trip-decision-replay';

const SIGNAL_LABELS: Record<string, string> = {
  noisePredictionValidated: '行前噪声预测已验证',
  roleAnchorObserved: '角色锚定已观测',
};

function signalLabel(key: string): string {
  return SIGNAL_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
}

function shortFingerprint(value: string): string {
  if (!value) return '—';
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

type FlywheelAuditReportPanelProps = {
  report: FlywheelAuditReport;
  className?: string;
};

/** Decision Replay · 协同飞轮预测/观测对撞（只读） */
export function FlywheelAuditReportPanel({ report, className }: FlywheelAuditReportPanelProps) {
  const signalEntries = Object.entries(report.signals).filter(
    ([, value]) => typeof value === 'boolean'
  );

  return (
    <section
      className={cn(
        'mt-4 rounded-lg border border-border/60 bg-muted/20 px-3 py-3 text-xs',
        className
      )}
      aria-label="飞轮审计对撞"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Scale className="h-3.5 w-3.5 text-primary" aria-hidden />
        <span className="font-medium text-foreground">飞轮审计对撞</span>
        <Badge
          variant={report.match ? 'secondary' : 'outline'}
          className={cn(
            'text-[10px] font-normal',
            report.match
              ? 'border-gate-allow-border bg-gate-allow text-gate-allow-foreground'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          )}
        >
          {report.match ? '预测与观测对齐' : '预测与观测未对齐'}
        </Badge>
      </div>

      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Snapshot</dt>
          <dd className="mt-0.5 font-mono text-[11px] text-foreground" title={report.snapshotId}>
            {shortFingerprint(report.snapshotId)}
          </dd>
        </div>
        {report.applicationId && (
          <div>
            <dt className="text-muted-foreground">申请</dt>
            <dd className="mt-0.5 font-mono text-[11px] text-foreground" title={report.applicationId}>
              {shortFingerprint(report.applicationId)}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-start gap-2">
          <Fingerprint className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="text-muted-foreground">预测指纹</p>
            <p className="font-mono text-[11px] text-foreground" title={report.comparablePredictionFp}>
              {shortFingerprint(report.comparablePredictionFp || report.predictionFingerprint)}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Fingerprint className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="text-muted-foreground">观测指纹</p>
            <p className="font-mono text-[11px] text-foreground" title={report.comparableObservationFp}>
              {shortFingerprint(report.comparableObservationFp || report.observationFingerprint)}
            </p>
          </div>
        </div>
      </div>

      {signalEntries.length > 0 && (
        <ul className="mt-3 space-y-1">
          {signalEntries.map(([key, passed]) => (
            <li key={key} className="flex items-start gap-2 text-foreground">
              {passed ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gate-allow-foreground" aria-hidden />
              ) : (
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
              )}
              <span>{signalLabel(key)}</span>
            </li>
          ))}
        </ul>
      )}

      {report.assertions.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
          {report.assertions.map((assertion) => (
            <li key={assertion.id} className="flex items-start gap-2">
              {assertion.passed ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gate-allow-foreground" aria-hidden />
              ) : (
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
              )}
              <span className="text-foreground">{assertion.message}</span>
            </li>
          ))}
        </ul>
      )}

      {report.note && (
        <p className="mt-3 border-t border-border/60 pt-3 text-muted-foreground leading-relaxed">
          {report.note}
        </p>
      )}
    </section>
  );
}
