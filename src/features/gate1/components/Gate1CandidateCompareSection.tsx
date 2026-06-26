import { useState } from 'react';
import { GitCompare, Plus } from 'lucide-react';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGate1CompareCandidates } from '@/hooks/useGate1';
import type { Gate1CandidateStrategy } from '@/types/gate1';
import { Gate1AdvisorStrategyDialog } from './Gate1AdvisorStrategyDialog';
import { Gate1HumanAssistedBadge } from './Gate1HumanAssistedBadge';

interface Gate1CandidateCompareSectionProps {
  projectId: string;
  candidates: Gate1CandidateStrategy[];
}

function formatCompareValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function Gate1CandidateCompareSection({
  projectId,
  candidates,
}: Gate1CandidateCompareSectionProps) {
  const [candidateAId, setCandidateAId] = useState<string>('');
  const [candidateBId, setCandidateBId] = useState<string>('');
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [basedOnId, setBasedOnId] = useState<string | undefined>();

  const { data: compare, isLoading, isError, error } = useGate1CompareCandidates(
    projectId,
    compareEnabled ? candidateAId : undefined,
    compareEnabled ? candidateBId : undefined,
  );

  const canCompare =
    candidateAId && candidateBId && candidateAId !== candidateBId && candidates.length >= 2;

  const runCompare = () => {
    if (!canCompare) return;
    setCompareEnabled(true);
  };

  const openStrategyFrom = (candidateId: string) => {
    setBasedOnId(candidateId);
    setStrategyOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">方案对比</CardTitle>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setStrategyOpen(true)}>
            <Plus className="h-4 w-4" />
            创建顾问修订版
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {candidates.length < 2 ? (
            <p className="text-sm text-muted-foreground">至少需要 2 个已发布方案才能对比</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">方案 A</p>
                  <Select value={candidateAId} onValueChange={(v) => { setCandidateAId(v); setCompareEnabled(false); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择方案 A" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label} (v{c.version})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">方案 B</p>
                  <Select value={candidateBId} onValueChange={(v) => { setCandidateBId(v); setCompareEnabled(false); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择方案 B" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label} (v{c.version})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                size="sm"
                className="gap-1"
                disabled={!canCompare}
                onClick={runCompare}
              >
                <GitCompare className="h-4 w-4" />
                对比差异
              </Button>
            </>
          )}

          {compareEnabled && isLoading && (
            <div className="flex justify-center py-6">
              <LogoLoading size={28} />
            </div>
          )}

          {compareEnabled && isError && (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : '对比失败'}
            </p>
          )}

          {compare && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline">{compare.candidateA.label}</Badge>
                <span className="text-muted-foreground">vs</span>
                <Badge variant="outline">{compare.candidateB.label}</Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>维度</TableHead>
                    <TableHead>{compare.candidateA.label}</TableHead>
                    <TableHead>{compare.candidateB.label}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compare.dimensions.map((dim) => (
                    <TableRow key={dim.key} className={dim.changed ? 'bg-muted/40' : undefined}>
                      <TableCell className="font-medium">
                        {dim.key}
                        {dim.changed && (
                          <Badge variant="secondary" className="ml-2 font-normal">
                            有差异
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCompareValue(dim.a)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCompareValue(dim.b)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">候选方案列表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {candidates.map((c) => (
            <div key={c.id} className="space-y-2 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.label}</span>
                  <Gate1HumanAssistedBadge
                    sourceType={c.sourceType}
                    humanAssistedLabel={c.humanAssistedLabel}
                    version={c.version}
                  />
                </div>
                <Button size="sm" variant="ghost" onClick={() => openStrategyFrom(c.id)}>
                  基于此修订
                </Button>
              </div>
              <p className="text-sm">{c.strategySummary}</p>
              {c.budgetSummary && (
                <p className="text-sm text-muted-foreground">预算：{c.budgetSummary}</p>
              )}
              {c.risks && c.risks.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  风险：{c.risks.map((r) => `${r.type}(${r.level})`).join(' · ')}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Gate1AdvisorStrategyDialog
        projectId={projectId}
        candidates={candidates}
        basedOnCandidateId={basedOnId}
        open={strategyOpen}
        onOpenChange={(open) => {
          setStrategyOpen(open);
          if (!open) setBasedOnId(undefined);
        }}
      />
    </div>
  );
}
