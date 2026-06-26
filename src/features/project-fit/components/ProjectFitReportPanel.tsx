import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  eligibilitySeverityLabel,
  fitDimensionStatusLabel,
} from '@/lib/project-fit-display';
import { ProjectFitResultBadge } from './ProjectFitResultBadge';
import type { FitAssessmentReport } from '@/types/project-fit';

interface ProjectFitReportPanelProps {
  report: FitAssessmentReport;
  /** leader 角色为脱敏报告 */
  role?: 'applicant' | 'leader' | 'operator';
}

export function ProjectFitReportPanel({ report, role = 'applicant' }: ProjectFitReportPanelProps) {
  const { report: detail } = report;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">适合度结论</CardTitle>
          <CardDescription>
            {role === 'leader' ? '领队脱敏视图 · 无综合信用分' : '基于问卷与准入规则 · 无 0–100 分'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectFitResultBadge
            result={report.overallResult}
            label={report.overallResultLabel}
            showDescription
          />
        </CardContent>
      </Card>

      {detail.hardResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">硬性条件</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {detail.hardResults.map((item) => (
              <div
                key={item.conditionKey}
                className="flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <div className="flex items-start gap-2">
                  {item.passed ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                  )}
                  <span>{item.conditionKey}</span>
                </div>
                <Badge variant={item.passed ? 'outline' : 'destructive'}>
                  {item.passed ? '通过' : '未通过'} · {eligibilitySeverityLabel(item.severity)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {detail.dimensionResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">维度匹配</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.dimensionResults.map((dim) => (
              <div key={dim.dimension} className="rounded-lg border px-3 py-2.5">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium capitalize">{dim.dimension}</span>
                  <Badge variant="secondary">{fitDimensionStatusLabel(dim.status)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{dim.summary}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">团队影响</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="outline" className="mb-2">
            {detail.teamImpact.level}
          </Badge>
          <p className="text-sm text-muted-foreground">{detail.teamImpact.summary}</p>
        </CardContent>
      </Card>

      {detail.requiredConfirmations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="h-4 w-4" />
              待确认项
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {detail.requiredConfirmations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {detail.explanations.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="py-4">
            <ul className="space-y-1 text-xs text-muted-foreground">
              {detail.explanations.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
