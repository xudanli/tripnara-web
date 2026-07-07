import type { PlanCandidate } from '@/types/guide-import';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const PERSONA_LABELS = {
  neptune: 'Neptune',
  abu: 'Abu',
  dre: 'Dr.Dre',
} as const;

interface GuideDraftPreviewProps {
  candidate: PlanCandidate;
  className?: string;
}

export function GuideDraftPreview({ candidate, className }: GuideDraftPreviewProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>{candidate.disclaimer}</AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">原攻略与 TripNARA 调整</CardTitle>
            <Badge variant="outline">草案 · {candidate.status}</Badge>
          </div>
          <CardDescription>
            这是以攻略为灵感、结合你的条件重新计算后的版本，不是博主原文复刻。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {candidate.adjustments.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无显著调整项，进入规划工作台后可继续审议。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">内容</th>
                    <th className="pb-2 pr-3 font-medium">原攻略</th>
                    <th className="pb-2 pr-3 font-medium">TripNARA 调整</th>
                    <th className="pb-2 font-medium">审议</th>
                  </tr>
                </thead>
                <tbody>
                  {candidate.adjustments.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 last:border-0">
                      <td className="py-3 pr-3 align-top font-medium">{row.category}</td>
                      <td className="py-3 pr-3 align-top text-muted-foreground">{row.originalGuide}</td>
                      <td className="py-3 pr-3 align-top">{row.adjustedPlan}</td>
                      <td className="py-3 align-top">
                        {row.persona && (
                          <Badge variant="secondary" className="font-normal text-xs">
                            {PERSONA_LABELS[row.persona]}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {candidate.retainedItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">优先保留的体验</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {candidate.retainedItems.map((item) => (
                <Badge key={item} variant="secondary">
                  {item}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
