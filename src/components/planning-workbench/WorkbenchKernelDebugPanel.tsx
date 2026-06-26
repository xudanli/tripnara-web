import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlanStateKernelDebug } from '@/lib/planning-workbench-kernel-debug';
import { cn } from '@/lib/utils';
import { GitCompare, Layers } from 'lucide-react';

function JsonBlock({ value, className }: { value: unknown; className?: string }) {
  return (
    <pre
      className={cn(
        'max-h-48 overflow-auto rounded-md bg-muted p-2 text-[10px] leading-relaxed',
        className,
      )}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export interface WorkbenchKernelDebugPanelProps {
  debug: PlanStateKernelDebug;
  className?: string;
}

/** Kernel Bridge / 门控不一致 — 运营与调试面板（C 端默认不展示） */
export function WorkbenchKernelDebugPanel({ debug, className }: WorkbenchKernelDebugPanelProps) {
  const { kernelBridge, kernelCompareGateMismatch } = debug;
  if (!kernelBridge && !kernelCompareGateMismatch) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {kernelCompareGateMismatch && (
        <Card className="border-amber-200/80 bg-amber-50/30">
          <CardHeader className="py-3">
            <CardTitle className="text-xs font-medium flex items-center gap-1.5">
              <GitCompare className="h-3.5 w-3.5 text-amber-700" />
              kernelCompareGateMismatch
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 text-xs">
            <div className="flex flex-wrap gap-2">
              {kernelCompareGateMismatch.llmRecommended != null && (
                <Badge variant="outline" className="font-mono font-normal text-[10px]">
                  LLM: {kernelCompareGateMismatch.llmRecommended}
                </Badge>
              )}
              {kernelCompareGateMismatch.gateRecommended != null && (
                <Badge variant="secondary" className="font-mono font-normal text-[10px]">
                  Gate: {kernelCompareGateMismatch.gateRecommended}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {kernelBridge && (
        <Card className="border-dashed">
          <CardHeader className="py-3">
            <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              kernelBridge
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {kernelBridge.shadowDiff != null && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-1">shadowDiff</p>
                <JsonBlock value={kernelBridge.shadowDiff} />
              </div>
            )}
            {kernelBridge.decisionOsAudit != null && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-1">decisionOsAudit</p>
                <JsonBlock value={kernelBridge.decisionOsAudit} />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
