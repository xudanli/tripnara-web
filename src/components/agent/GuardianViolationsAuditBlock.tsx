/**
 * gate_result.violations：llm_debate 下 VERIFY 后追加的审计层（与人格 verdict 分离展示）。
 */

import type { GuardianEvidenceAtom } from '@/api/agent';
import { Badge } from '@/components/ui/badge';
import { Tag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Shield, AlertCircle, Activity, Wrench } from 'lucide-react';
import type { GateVerifyViolationAuditEntry } from '@/lib/route-run-guardian-gate';

function iconForEvidenceTag(tag: string): LucideIcon {
  const t = tag.toLowerCase();
  if (t.includes('safety') || t.includes('risk')) return Shield;
  if (t.includes('reachability') || t.includes('reachable')) return AlertCircle;
  if (t.includes('fatigue') || t.includes('pacing') || t.includes('pace')) return Activity;
  if (t.includes('replace') || t.includes('segment') || t.includes('repair')) return Wrench;
  return Tag;
}

function AtomsList({ atoms }: { atoms: GuardianEvidenceAtom[] }) {
  if (!atoms.length) return null;
  return (
    <details className="text-[10px] text-muted-foreground mt-1">
      <summary className="cursor-pointer select-none text-foreground/80">审计原子 ({atoms.length})</summary>
      <ul className="mt-1 space-y-1 pl-1 border-l border-border/60">
        {atoms.map((atom, j) => {
          const tag = atom.tag?.trim();
          const TIcon = tag ? iconForEvidenceTag(tag) : Tag;
          const tip = [atom.tag, atom.violation_code, atom.text].filter(Boolean).join(' · ');
          return (
            <li key={j} title={tip || undefined} className="flex flex-wrap items-start gap-1.5">
              {tag ? (
                <span className="inline-flex items-center gap-0.5 rounded border border-border/60 bg-muted/40 px-1 py-0">
                  <TIcon className="w-3 h-3 shrink-0" />
                  <span>{tag}</span>
                </span>
              ) : null}
              {atom.violation_code ? (
                <code className="rounded bg-muted px-1 py-0 font-mono text-[10px]">{atom.violation_code}</code>
              ) : null}
              {atom.text ? <span className="min-w-0 leading-snug">{atom.text}</span> : null}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export function GuardianViolationsAuditBlock({
  entries,
  className,
}: {
  entries: GateVerifyViolationAuditEntry[];
  className?: string;
}) {
  if (!entries.length) return null;
  return (
    <div className={className}>
      <div className="font-medium text-foreground text-[11px]">VERIFY 审计层（gate_result.violations）</div>
      <p className="text-[10px] text-muted-foreground leading-snug mt-0.5 mb-1.5">
        人格 verdict / evidence 保留合议（LLM）结果；本区为 VERIFY 后挂载的校验与审计字段（含与 VERIFY 对齐的
        evidence_atoms）。
      </p>
      <ul className="space-y-2">
        {entries.map((v, i) => (
          <li
            key={i}
            className="rounded-md border border-border/70 bg-background/60 px-2 py-1.5 text-[11px] text-muted-foreground"
          >
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              {v.code ? (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
                  {v.code}
                </Badge>
              ) : null}
              {v.violation ? (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {v.violation}
                </Badge>
              ) : null}
            </div>
            {v.explanation?.trim() ? (
              <p className="text-[11px] leading-relaxed text-foreground/90">{v.explanation.trim()}</p>
            ) : null}
            <AtomsList atoms={v.evidence_atoms} />
          </li>
        ))}
      </ul>
    </div>
  );
}
