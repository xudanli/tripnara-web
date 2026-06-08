import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ChevronRight, Layers } from 'lucide-react';
import type { EvidenceBundleDto, VerificationStatus } from '@/api/agent';
import { extractAlternativeViolationTags } from '@/lib/route-run-optimization-explain';

function statusTone(status?: VerificationStatus): 'pass' | 'warn' | 'block' | 'neutral' {
  if (!status) return 'neutral';
  if (status === 'VERIFIED') return 'pass';
  if (status === 'PARTIALLY_VERIFIED') return 'warn';
  if (status === 'UNVERIFIED') return 'warn';
  if (status === 'FAILED') return 'block';
  return 'neutral';
}

function toneBadgeClass(tone: ReturnType<typeof statusTone>) {
  switch (tone) {
    case 'pass':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'warn':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'block':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-muted text-foreground/80 border-border';
  }
}

function pickCandidateTitle(c: any, idx: number) {
  return (
    c?.id ??
    c?.candidate_id ??
    c?.name ??
    c?.title ??
    (typeof c?.alternative_id === 'string' ? c.alternative_id : undefined) ??
    `候选 ${idx + 1}`
  );
}

function extractBundle(c: any): EvidenceBundleDto | undefined {
  const b = c?.evidence_bundle ?? c?.evidenceBundle ?? c?.verification?.evidence_bundle;
  return b && typeof b === 'object' ? (b as EvidenceBundleDto) : undefined;
}

export interface CandidatesPanelProps {
  candidates?: any[] | null;
  alternatives?: any[] | null;
  className?: string;
  defaultOpen?: boolean;
}

export default function CandidatesPanel({ candidates, alternatives, className, defaultOpen = false }: CandidatesPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const listCandidates = useMemo(() => (Array.isArray(candidates) ? candidates : []), [candidates]);
  const listAlternatives = useMemo(() => (Array.isArray(alternatives) ? alternatives : []), [alternatives]);

  const total = listCandidates.length + listAlternatives.length;
  if (total === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn('mt-2', className)}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between h-auto py-1.5 px-2 text-xs hover:bg-muted/50"
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <ChevronRight className={cn('w-3 h-3 transition-transform', open && 'rotate-90')} />
            <span className="truncate">候选/替代方案</span>
          </span>
          <span className="flex items-center gap-2 shrink-0">
            {listCandidates.length > 0 ? (
              <Badge variant="outline" className="text-[10px]">
                candidates {listCandidates.length}
              </Badge>
            ) : null}
            {listAlternatives.length > 0 ? (
              <Badge variant="outline" className="text-[10px]">
                alternatives {listAlternatives.length}
              </Badge>
            ) : null}
          </span>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-1">
        <div className="bg-muted/30 rounded-md p-2.5 space-y-2">
          <ScrollArea className="max-h-[320px] pr-2">
            <div className="space-y-2">
              {[
                ...listCandidates.map((c) => ({ kind: 'candidate' as const, value: c })),
                ...listAlternatives.map((a) => ({ kind: 'alternative' as const, value: a })),
              ]
                .slice(0, 12)
                .map((row, idx) => {
                  const title = pickCandidateTitle(row.value, idx);
                  const bundle = extractBundle(row.value);
                  const status = bundle?.verification_status;
                  const tone = statusTone(status);
                  const violationTags =
                    row.kind === 'alternative' ? extractAlternativeViolationTags(row.value) : null;
                  return (
                    <Card key={`${row.kind}-${row.value?.id ?? idx}`} className="border-border/60 shadow-none">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                              <div className="text-xs font-semibold truncate">
                                {row.kind === 'candidate' ? 'Candidate' : 'Alternative'} · {String(title)}
                              </div>
                            </div>
                            {row.value?.summary ? (
                              <div className="text-[11px] text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                                {String(row.value.summary)}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {status ? (
                              <Badge variant="outline" className={cn('text-[10px]', toneBadgeClass(tone))}>
                                {String(status)}
                              </Badge>
                            ) : row.kind === 'candidate' ? (
                              <Badge variant="outline" className="text-[10px]">
                                无候选证据包
                              </Badge>
                            ) : null}
                            {violationTags && violationTags.hard.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-end">
                                {violationTags.hard.map((tag) => (
                                  <Badge
                                    key={`h-${tag}`}
                                    variant="outline"
                                    className="text-[10px] border-red-300 text-red-800 bg-red-50"
                                  >
                                    {tag.startsWith('HARD') ? tag : `HARD·${tag}`}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                            {violationTags && violationTags.soft.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-end">
                                {violationTags.soft.map((tag) => (
                                  <Badge
                                    key={`s-${tag}`}
                                    variant="outline"
                                    className="text-[10px] border-amber-300 text-amber-900 bg-amber-50"
                                  >
                                    {tag.startsWith('SOFT') ? tag : `SOFT·${tag}`}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <details className="mt-2">
                          <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                            查看原始数据（调试）
                          </summary>
                          <pre className="mt-2 max-h-[min(50vh,320px)] overflow-y-auto overflow-x-auto text-[10px] leading-snug bg-background rounded border p-2 [scrollbar-gutter:stable]">
                            {JSON.stringify(row.value, null, 2)}
                          </pre>
                        </details>
                      </CardContent>
                    </Card>
                  );
                })}

              {total > 12 ? (
                <div className="text-[11px] text-muted-foreground px-1">已仅展示前 12 条候选/替代方案。</div>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

